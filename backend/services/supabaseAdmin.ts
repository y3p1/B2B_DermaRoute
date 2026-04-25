import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../config/env";

let cachedSupabase: ReturnType<typeof createClient> | undefined;

export function getSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!cachedSupabase) {
    cachedSupabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return cachedSupabase;
}
