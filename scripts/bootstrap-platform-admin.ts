/**
 * Creates a platform (super admin) account.
 *
 * A platform admin is deliberately NOT a member of any firm: no crm.staff
 * row, so crm.current_tenant_id() is NULL for them and every tenant
 * isolation policy denies. They can manage firms and answer support
 * tickets; they cannot read a single client, case or document.
 *
 * Usage (loads vars from .env.local):
 *   npm run bootstrap:admin -- <email> <full name> [password]
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

function generatePassword(): string {
  const charset =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = randomBytes(20);
  let body = "";
  for (const b of bytes) body += charset[b % charset.length];
  return body;
}

async function main() {
  const [, , email, ...rest] = process.argv;
  const maybePassword = rest.length > 1 ? rest[rest.length - 1] : undefined;
  const looksLikePassword =
    maybePassword !== undefined && /[^a-zA-Z]/.test(maybePassword);
  const fullName = (looksLikePassword ? rest.slice(0, -1) : rest).join(" ");
  const providedPassword = looksLikePassword ? maybePassword : undefined;

  if (!email || !fullName) {
    console.error(
      'Usage: npm run bootstrap:admin -- <email> "<full name>" [password]',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = providedPassword ?? generatePassword();

  console.log(`Creating auth user for ${email}...`);
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let authUserId = created?.user?.id;

  if (createErr) {
    // Already exists: reuse it rather than failing, so this is re-runnable.
    if (!/already/i.test(createErr.message)) {
      console.error("Could not create auth user:", createErr.message);
      process.exit(1);
    }
    const { data: list } = await db.auth.admin.listUsers();
    authUserId = list?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )?.id;
    if (!authUserId) {
      console.error("User exists but could not be found.");
      process.exit(1);
    }
    console.log("Auth user already existed; reusing it.");
  }

  console.log("Inserting platform.admins row...");
  const { error: insertErr } = await db
    .schema("platform")
    .from("admins")
    .upsert(
      { auth_user_id: authUserId!, email, full_name: fullName, is_active: true },
      { onConflict: "auth_user_id" },
    );

  if (insertErr) {
    console.error("Could not create admin row:", insertErr.message);
    process.exit(1);
  }

  // Safety net: a platform admin must not also be firm staff, or they would
  // inherit that firm's data access.
  const { data: staffRow } = await db
    .schema("crm")
    .from("staff")
    .select("id, tenant_id")
    .eq("auth_user_id", authUserId!)
    .maybeSingle();

  console.log("\nPlatform admin ready:");
  console.log(`  Email:    ${email}`);
  if (!providedPassword) console.log(`  Password: ${password}`);
  console.log("  Portal:   /admin");

  if (staffRow) {
    console.warn(
      "\n  WARNING: this account is ALSO staff at a firm, so it can see " +
        "that firm's data. Use a separate address for platform admin.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
