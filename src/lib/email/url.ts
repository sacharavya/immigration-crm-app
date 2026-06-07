import "server-only";

import { headers } from "next/headers";

// Resolves the public base URL for outbound links. Server actions don't
// have direct access to the request URL, so we fall back to forwarded
// headers. Trailing slashes are stripped so callers can append paths
// directly.
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
  // this was crm.bigbangimmigration.com, which doesn't resolve. If
  // NEXT_PUBLIC_APP_URL is somehow missing AND we're outside a
  // request context, this is what every link in every email points at.
  return "https://app.bigbangimmigration.com";
}
