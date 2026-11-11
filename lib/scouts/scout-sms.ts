import "server-only";

/**
 * Scout application OTP delivery. No SMS provider is configured on this
 * project yet ([auth.sms] in supabase/config.toml is dormant) -- same
 * credential-blocker as payments and WhatsApp OTP (see
 * lib/auth/whatsapp-cloud-api.ts). Until a provider is wired in here,
 * this throws rather than silently pretending to send -- the same
 * "never fabricate success" rule CLAUDE.md applies to payments applies
 * here too.
 *
 * In non-production environments, the generated code is logged to the
 * console so the OTP flow can still be exercised end-to-end locally
 * without a real provider. This never happens in production.
 */
export async function sendScoutApplicationOtp(phoneE164: string, code: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[scout-sms] (dev only, not actually sent) OTP for ${phoneE164}: ${code}`);
  }
  throw new Error("SMS provider not configured yet -- scout application OTP delivery is not live. See docs/AUTH_ALTERNATIVES.md.");
}
