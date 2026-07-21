import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * Used for server actions that need elevated privileges (AI analysis, admin operations).
 * NEVER expose this to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}