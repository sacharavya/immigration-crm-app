import type { NextRequest, NextResponse } from "next/server";

// Establishes the intake-portal cookie on the proxy response before
// the page renders.
//
// The /intake/<token>/* route is unauthenticated. Server actions reuse
// the staff intake gate(), which dispatches to portal-mode when it
// finds a verified cookie. Setting the cookie has to happen on the
// SERVER (HttpOnly), so a client-component effect won't do — the
// proxy is the only request-time hook that can read the URL token,
// talk to Supabase, and set a cookie before the page mounts.
//
// Optimisation: if the cookie value already matches the URL token, we
// skip the DB roundtrip. Validation is still authoritative on each
// server action (it re-runs verifyIntakeToken() per action), so a
// stale-but-matching cookie can't outrun a real revoke or submit-lock.

const TOKEN_RE = /^[0-9a-f-]{36}$/i;
const COOKIE_NAME = "bbi_intake_portal";

export async function maybeSetIntakePortalCookie(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  const m = request.nextUrl.pathname.match(
    /^\/intake\/([0-9a-f-]{36})(?:\/|$)/i,
  );
  if (!m) return;
  const token = m[1];
  if (!TOKEN_RE.test(token)) return;

  // Fast path: matching cookie already present.
  if (request.cookies.get(COOKIE_NAME)?.value === token) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // Env misconfigured — let the page render its invalid-link card.
    return;
  }

  // Validate via PostgREST. We deliberately fetch a minimal row and
  // ignore the contents — the page itself re-runs verifyIntakeToken
  // server-side before rendering anything trusted, so this proxy
  // only confirms the token COULD be valid (worth setting a cookie
  // for).
  let valid = false;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/clients?intake_portal_token=eq.${encodeURIComponent(
        token,
      )}&select=id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Accept-Profile": "crm",
        },
        // Edge runtime — explicit no-store so we never reuse a stale
        // validity response across users.
        cache: "no-store",
      },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{ id: string }>;
      valid = Array.isArray(rows) && rows.length > 0;
    }
  } catch {
    // Network blip — fall through; page will show invalid-link card.
  }

  if (!valid) return;

  response.cookies.set(COOKIE_NAME, token, {
    path: "/intake",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // 14 days. Long enough for a slow form fill; the staff revoke
    // path clears the row, so the next action will reject regardless.
    maxAge: 60 * 60 * 24 * 14,
  });
}
