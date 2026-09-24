import "server-only";

import { headers } from "next/headers";

import { adminClient } from "@/lib/supabase/admin";

// The platform APP host — where staff sign in, the operator portal lives,
// and every token link resolves (pay, upload, intake, sign, manage). Those
// links belong on one host regardless of which firm sent them: the token
// names the firm, and OAuth redirect URIs are registered against this host
// exactly once. For a firm's own public pages use firmPublicUrl() instead.
//
// Server actions don't have direct access to the request URL, so we fall
// back to forwarded headers. Trailing slashes are stripped so callers can
// append paths directly.
export async function getBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    // headers() outside a request context — fall through.
  }

  // Last-resort fallback. Must point at the actual prod app — earlier
  // this was crm.genzdatalabs.com, which doesn't resolve. If
  // NEXT_PUBLIC_APP_URL is somehow missing AND we're outside a
  // request context, this is what every link in every email points at.
  return "https://app.casebindsystems.com";
}

/**
 * The host a firm's PUBLIC pages live on: booking landing, contact form,
 * NOC finder, the firm site. Nothing in those URLs names the firm, so the
 * host has to.
 *
 *   custom domain (tenants.public_host)   https://book.theirfirm.com
 *   otherwise                             https://<slug>.<PLATFORM_DOMAIN>
 *
 * In development there is no PLATFORM_DOMAIN; the slug is prefixed onto the
 * app host instead, which yields <slug>.localhost:3000 — a name browsers
 * resolve to the machine with no configuration.
 *
 * Read with the service role: this runs from public pages with no session,
 * and slug and public_host are the firm's advertised address, not a secret.
 */
export async function firmPublicUrl(tenantId: string): Promise<string> {
  const { data } = await adminClient()
    .schema("crm")
    .from("tenants")
    .select("slug, public_host")
    .eq("id", tenantId)
    .maybeSingle();

  if (!data) return getBaseUrl();
  if (data.public_host) return `https://${data.public_host}`;

  const domain = process.env.PLATFORM_DOMAIN?.trim();
  if (domain) return `https://${data.slug}.${domain}`;

  // Development: hang the slug off whatever host the app is on.
  const app = new URL(await getBaseUrl());
  const bare = app.host.replace(/^(app|www)\./, "");
  return `${app.protocol}//${data.slug}.${bare}`;
}
