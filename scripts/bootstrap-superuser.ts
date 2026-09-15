/**
 * Bootstrap a super_user account against the local (or remote) Supabase
 * project. Use this when `supabase db reset` has wiped the auth.users +
 * crm.staff tables and you can no longer log in to add staff via the UI.
 *
 * Usage (loads vars from .env.local):
 *   npm run bootstrap -- you@example.com First Last
 *   npm run bootstrap -- you@example.com First Last MyOwnPassword!
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

function generateTempPassword(): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let body = "";
  for (const b of bytes) body += charset[b % charset.length];
  // Guarantee one digit + symbol + uppercase to clear common policies.
  return `${body}!1A`;
}

async function main() {
  const [, , email, firstName, lastName, providedPassword] = process.argv;

  if (!email || !firstName || !lastName) {
    console.error(
      "Usage: npm run bootstrap -- <email> <first_name> <last_name> [password]",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const password = providedPassword ?? generateTempPassword();
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creating auth user for ${email}...`);
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    console.error(`Auth user creation failed: ${authErr?.message ?? "unknown"}`);
    process.exit(1);
  }

  // Every staff member belongs to exactly one firm. TENANT_SLUG picks it;
  // when the deployment has only one firm the choice is unambiguous, so
  // don't make the caller state it.
  const wantedSlug = process.env.TENANT_SLUG?.trim();
  const { data: tenants, error: tenantErr } = await supabase
    .schema("crm")
    .from("tenants")
    .select("id, name, slug");

  if (tenantErr) {
    console.error(`Could not read tenants: ${tenantErr.message}`);
    await supabase.auth.admin.deleteUser(created.user.id);
    process.exit(1);
  }

  const tenant = wantedSlug
    ? tenants?.find((t) => t.slug.toLowerCase() === wantedSlug.toLowerCase())
    : tenants?.length === 1
      ? tenants[0]
      : undefined;

  if (!tenant) {
    console.error(
      wantedSlug
        ? `No firm with slug "${wantedSlug}".`
        : `This deployment has ${tenants?.length ?? 0} firms, so the firm is ambiguous. Re-run with TENANT_SLUG=<slug>.`,
    );
    console.error(
      `Available: ${(tenants ?? []).map((t) => t.slug).join(", ") || "none"}`,
    );
    await supabase.auth.admin.deleteUser(created.user.id);
    process.exit(1);
  }

  console.log(`Inserting crm.staff row (role=super_user, firm=${tenant.name})...`);
  const { error: staffErr } = await supabase
    .schema("crm")
    .from("staff")
    .insert({
      tenant_id: tenant.id,
      auth_user_id: created.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      role: "super_user",
      is_active: true,
    });
  if (staffErr) {
    console.error(`Staff row insert failed: ${staffErr.message}`);
    // Rollback the auth user so a re-run can succeed cleanly.
    await supabase.auth.admin.deleteUser(created.user.id);
    process.exit(1);
  }

  console.log("");
  console.log("Bootstrapped super_user:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("");
  console.log("You can sign in at /login.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
