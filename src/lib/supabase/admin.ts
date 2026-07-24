import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

let cachedClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS — server code only.
 * All writes (scan lifecycle, findings, reports) go through this
 * client; RLS grants the public read-only access by scan UUID.
 */
export function getAdminClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();

  cachedClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  return cachedClient;
}
