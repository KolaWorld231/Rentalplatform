import "server-only";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "@/lib/auth/otp-code";
import { sendWhatsAppOtp } from "@/lib/auth/whatsapp-cloud-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { WhatsappOtpVerifyInput, WhatsappLoginInput, WhatsappSignupInput } from "@/lib/validation/auth";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const START_RATE_LIMIT_WINDOW_MS = 60_000;
const START_RATE_LIMIT_MAX = 5;

export type StartResult = { ok: true } | { error: string; fieldErrors?: Record<string, string> };
export type VerifyResult = { ok: true; email: string; mode: "signup" | "login" } | { error: string; fieldErrors?: Record<string, string> };

async function checkStartRateLimit(phone: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - START_RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("whatsapp_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  return (count ?? 0) < START_RATE_LIMIT_MAX;
}

async function createAndSendChallenge(phone: string, purpose: "signup" | "login", metadata: Record<string, unknown>): Promise<StartResult> {
  if (!(await checkStartRateLimit(phone))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const code = generateOtpCode();
  const admin = createServiceRoleClient();
  const { data: inserted, error: insertError } = await admin
    .from("whatsapp_otp_challenges")
    .insert({
      phone,
      code_hash: hashOtpCode(code, phone),
      purpose,
      metadata,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !inserted) return { error: "Couldn't start the WhatsApp sign-in. Please try again." };

  try {
    await sendWhatsAppOtp(phone, code);
  } catch {
    // Never leave an un-sendable challenge behind -- it would both
    // mislead a later "did we already try this number" check and
    // count against this phone's own rate limit for no reason.
    await admin.from("whatsapp_otp_challenges").delete().eq("id", inserted.id);
    return { error: "We couldn't send a code to that number on WhatsApp. Check it and try again." };
  }
  return { ok: true };
}

export async function startWhatsAppSignup(input: WhatsappSignupInput): Promise<StartResult> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin.auth.admin.listUsers();
  if (existing.users.some((u) => u.email === input.email)) {
    return { error: "An account already uses this email.", fieldErrors: { email: "An account already uses this email." } };
  }

  return createAndSendChallenge(input.phone, "signup", {
    displayName: input.displayName,
    email: input.email,
    intent: input.intent,
  });
}

export async function startWhatsAppLogin(input: WhatsappLoginInput): Promise<StartResult> {
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("phone", input.phone).maybeSingle();
  if (!profile) {
    // Same message as a real send failure -- never confirm or deny
    // whether a number has an account.
    return { error: "We couldn't send a code to that number on WhatsApp. Check it and try again." };
  }
  return createAndSendChallenge(input.phone, "login", {});
}

/**
 * Verifies the code and, on success, returns the email to mint a
 * session for -- never mints the session itself, since web (cookie
 * jar) and mobile (raw tokens) need different mechanisms for that
 * last step. See lib/auth/whatsapp-actions.ts and
 * app/api/mobile/whatsapp-otp/verify/route.ts.
 */
export async function verifyWhatsAppOtp(input: WhatsappOtpVerifyInput): Promise<VerifyResult> {
  const { phone, code, mode } = input;
  const admin = createServiceRoleClient();

  const { data: challenge } = await admin
    .from("whatsapp_otp_challenges")
    .select("*")
    .eq("phone", phone)
    .eq("purpose", mode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    return { error: "That code expired. Please request a new one." };
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    await admin.from("whatsapp_otp_challenges").delete().eq("id", challenge.id);
    return { error: "Too many incorrect attempts. Please request a new code." };
  }

  if (!verifyOtpCode(code, phone, challenge.code_hash)) {
    await admin.from("whatsapp_otp_challenges").update({ attempts: challenge.attempts + 1 }).eq("id", challenge.id);
    return { error: "That code didn't work. Please try again." };
  }

  await admin.from("whatsapp_otp_challenges").delete().eq("id", challenge.id);

  const meta = challenge.metadata as Record<string, unknown>;
  let email: string;

  if (mode === "signup") {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: meta.email as string,
      email_confirm: true,
      user_metadata: { display_name: meta.displayName },
    });
    if (createError || !created.user) {
      return { error: "Couldn't create your account. Please try again." };
    }
    email = meta.email as string;

    await admin.from("profiles").update({ phone, phone_verified_at: new Date().toISOString() }).eq("id", created.user.id);
    if (meta.intent === "owner") {
      await admin.from("user_roles").upsert({ user_id: created.user.id, role: "owner" }, { onConflict: "user_id,role" });
    }
  } else {
    const { data: profile } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (!profile) return { error: "Couldn't find an account for that number. Please try again." };

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !authUser.user?.email) return { error: "Couldn't complete sign-in. Please try again." };
    email = authUser.user.email;
  }

  return { ok: true, email, mode };
}
