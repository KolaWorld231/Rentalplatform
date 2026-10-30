import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * Server Component / Server Action / Route Handler client. Reads the
 * caller's session from cookies, so RLS runs as that user — not as
 * service_role. Never use this to perform a privileged write; use
 * `createServiceRoleClient` for that, from trusted server code only.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies can't be written;
          // middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}
