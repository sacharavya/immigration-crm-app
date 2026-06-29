import { type NextRequest } from "next/server";

import { maybeSetIntakePortalCookie } from "@/lib/auth/intake-portal-proxy";
import { maybeSetUploadPortalCookie } from "@/lib/auth/upload-portal-proxy";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // updateSession refreshes the staff Supabase auth cookie chain on
  // every request. For unauthenticated /intake/<token>/* or
  // /upload/<token>/* requests it's a cheap no-op (no auth session to
  // refresh), so it's safe to call unconditionally — we then layer the
  // portal cookies on the same response.
  const response = await updateSession(request);
  await maybeSetIntakePortalCookie(request, response);
  await maybeSetUploadPortalCookie(request, response);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static asset files)
     * - _next/image   (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - any static asset with a known extension (images, fonts, css, js, map,
     *   web manifest). These never need the Supabase auth-session refresh, so
     *   excluding them avoids an auth round-trip per asset request.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|css|js|mjs|map|webmanifest|txt)$).*)",
  ],
};
