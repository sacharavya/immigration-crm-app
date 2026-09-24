import { createBrowserClient } from "@supabase/ssr";

import { AUTH_COOKIE } from "./env";
import type { Database } from "./types";

// Browser-side Supabase client for Client Components. The app is SSR-first, so
// this is intentionally narrow: it exists for features that must run in the
// browser — currently the notification bell's (future) Realtime subscription.
// Mutations and most reads still go through Server Actions. RLS remains the
// security boundary; this uses the publishable (anon) key, never a secret.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: AUTH_COOKIE },
  );
}
