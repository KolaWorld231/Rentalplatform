import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Mints a real Supabase session for userEmail without a password, after
 * the caller has independently verified some other factor (a WebAuthn
 * ceremony, a WhatsApp OTP code). Supabase Auth has no API to "just log
 * this user in" from trusted server code, so this uses generateLink
 * (which only generates a token, never sends an email) and immediately
 * redeems it via verifyOtp on the request-scoped, cookie-writing client
 * -- the standard pattern for bolting a custom auth factor onto
 * Supabase Auth. Shared by lib/auth/webauthn-actions.ts and
 * lib/auth/whatsapp-actions.ts so there's one copy of this trick, not
 * two drifting ones.
 */
export async function mintSessionForEmail(email: string) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    throw new Error("Could not complete sign-in. Please try again.");
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    throw new Error("Could not complete sign-in. Please try again.");
  }
}

/**
 * Mobile's equivalent -- there's no cookie jar to write into from an
 * API route the way there is from a Server Action, so this returns the
 * session tokens directly for the caller (app/api/mobile/whatsapp-otp/
 * verify/route.ts) to hand back in its JSON response; mobile then calls
 * supabase.auth.setSession({ access_token, refresh_token }) itself.
 */
export async function mintSessionTokensForEmail(email: string): Promise<{ access_token: string; refresh_token: string }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    throw new Error("Could not complete sign-in. Please try again.");
  }

  const anon = createSupabaseClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError || !verified.session) {
    throw new Error("Could not complete sign-in. Please try again.");
  }

  return { access_token: verified.session.access_token, refresh_token: verified.session.refresh_token };
}
