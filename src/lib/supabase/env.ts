/**
 * Where the server reaches Supabase. Normally the same URL the browser uses;
 * inside Docker the app container cannot use the browser's localhost port, so
 * it may be handed its own (SUPABASE_INTERNAL_URL). Browser code keeps using
 * NEXT_PUBLIC_SUPABASE_URL, which is inlined at build time.
 */
export function supabaseServerUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/**
 * One auth cookie name on both sides. @supabase/ssr otherwise derives it from
 * the URL's hostname, and the two sides would disagree whenever their URLs
 * differ. Renaming this signs everyone out once.
 */
export const AUTH_COOKIE = { name: "sb-casebind-auth" } as const;
