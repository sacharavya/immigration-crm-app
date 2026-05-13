import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// POST = explicit user sign-out from the sidebar. GET = internal
// hand-off from server actions that need a clean signOut + redirect
// (cookie writes inside a Server Action can race the redirect response
// and leave a stale session — a route handler avoids that footgun).
//
// The optional `?next` param lets callers preserve a query string on
// the destination (e.g. /login?reset=1). It must be a same-origin
// relative path starting with "/".

function destination(request: NextRequest): string {
  const next = request.nextUrl.searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/login";
}

async function handle(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(destination(request), request.url), {
    status: 303,
  });
}

export const POST = handle;
export const GET = handle;
