import type { NextRequest, NextResponse } from "next/server";

// Establishes the upload-portal cookie on the proxy response before the
// /upload/<token> page renders.
//
// Parallel to maybeSetIntakePortalCookie. The cookie is path=/" (not
// path-scoped) because /api/files/[fileId] lives outside /upload and
// must receive the cookie for the dual-mode auth pattern to work. The
// route still re-verifies on every request, so a stale-but-matching
// cookie cannot outrun a real revoke or status change.
//
// Optimisation: if the cookie value already matches the URL token, the
// proxy skips the validation roundtrip.

const TOKEN_RE = /^[0-9a-f-]{36}$/i;
const COOKIE_NAME = "bbi_upload_portal";

export async function maybeSetUploadPortalCookie(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  const m = request.nextUrl.pathname.match(
    /^\/upload\/([0-9a-f-]{36})(?:\/|$)/i,
  );
  if (!m) return;
  const token = m[1];
  if (!TOKEN_RE.test(token)) return;

  if (request.cookies.get(COOKIE_NAME)?.value === token) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  // Validate via PostgREST. Minimal lookup — the route handler itself
  // re-runs verifyUploadPortalToken before allowing anything sensitive,
  // so this proxy only confirms the token COULD be valid (worth
  // setting a cookie for).
  let valid = false;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/cases?client_portal_token=eq.${encodeURIComponent(
        token,
      )}&select=id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Accept-Profile": "crm",
        },
        cache: "no-store",
      },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{ id: string }>;
      valid = Array.isArray(rows) && rows.length > 0;
    }
  } catch {
    // Network blip — fall through; route handler will reject anyway.
  }

  if (!valid) return;

  response.cookies.set(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // 14 days, same as the intake portal cookie. The route handler's
    // per-request verifyUploadPortalToken still rejects revoked tokens
    // immediately, so this is just a usability bound.
    maxAge: 60 * 60 * 24 * 14,
  });
}
