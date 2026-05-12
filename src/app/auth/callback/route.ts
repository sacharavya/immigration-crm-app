import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Handles Supabase auth redirects (recovery links, email confirmations).
// The recovery link emitted by admin.generateLink lands here with a PKCE
// `code` query param. We exchange it for a cookie-based session, then
// forward the user to `?next` (defaults to /reset-password).
//
// Errors fall through to /login with an error flag rather than throwing —
// stale or already-used links shouldn't show a stack trace.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/reset-password";

  // Whitelist the redirect target. Always relative, must start with "/".
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback_failed`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
