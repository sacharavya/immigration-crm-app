import { type NextRequest } from "next/server";

import { maybeSetIntakePortalCookie } from "@/lib/auth/intake-portal-proxy";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // updateSession refreshes the staff Supabase auth cookie chain on
  // every request. For unauthenticated /intake/<token>/* requests it's
  // a cheap no-op (no auth session to refresh), so it's safe to call
  // unconditionally — we then layer the intake-portal cookie on the
  // same response.
  const response = await updateSession(request);
  await maybeSetIntakePortalCookie(request, response);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static asset files)
     * - _next/image   (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - any file with an extension served from /public (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
