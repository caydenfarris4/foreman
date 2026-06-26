import { createClient as createSbClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "./env";

// Server-only admin client for cron jobs and webhooks. Bypasses RLS via the
// service-role key. NEVER import this from a client component or route
// that runs outside a trusted server context.
export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set",
    );
  }
  return createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
