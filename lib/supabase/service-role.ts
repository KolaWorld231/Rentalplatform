import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * service_role client: bypasses RLS entirely. Use ONLY from trusted
 * server-side code that performs an explicitly privileged operation
 * (subscription activation, payment verification, role assignment, admin
 * moderation actions) — never import this into anything that renders to
 * the client or accepts unvalidated user input without its own
 * authorization check first. The `server-only` import makes it a build
 * error to pull this into a client bundle.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
