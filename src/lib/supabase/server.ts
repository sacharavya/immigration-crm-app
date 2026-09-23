import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { AUTH_COOKIE, supabaseServerUrl } from "./env";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseServerUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: AUTH_COOKIE,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll was called from a Server Component. Ignored — the proxy
            // refreshes the session on every request, so cookies stay current.
          }
        },
      },
    },
  );
}
