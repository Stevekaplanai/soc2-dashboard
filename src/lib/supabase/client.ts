import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client.
 * Gracefully returns null if env vars are not configured (e.g. during build).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}