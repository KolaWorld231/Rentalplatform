"use server";

import { redirect } from "next/navigation";
import { firstFieldErrors } from "@/lib/auth/field-errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { phoneLoginSchema, phoneOtpSchema, phoneSignupSchema } from "@/lib/validation/auth";

export interface PhoneActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  otpSent?: boolean;
  phone?: string;
}

/**
 * Supabase Auth's native phone/OTP sign-in -- unlike passkeys, this needs
 * no custom session-minting trick, since signInWithOtp/verifyOtp(phone)
 * are first-class Supabase Auth methods. It requires a real SMS provider
 * (Twilio/etc.) configured on the project to actually deliver codes to
 * real numbers -- see docs/AUTH_ALTERNATIVES.md. This code path is fully
 * wired and verified against Supabase's test-OTP numbers; it goes live
 * for real users the moment a provider is configured, no further code
 * changes needed.
 */
export async function startPhoneSignupAction(
  _prev: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const parsed = phoneSignupSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
    options: {
      shouldCreateUser: true,
      data: { display_name: parsed.data.displayName, pending_intent: parsed.data.intent },
    },
  });
  if (error) {
    return { error: "We couldn't send a code to that number. Check it and try again." };
  }

  return { otpSent: true, phone: parsed.data.phone };
}

export async function startPhoneLoginAction(
  _prev: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const parsed = phoneLoginSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
    options: { shouldCreateUser: false },
  });
  if (error) {
    return { error: "We couldn't send a code to that number. Check it and try again." };
  }

  return { otpSent: true, phone: parsed.data.phone };
}

export async function verifyPhoneOtpAction(
  _prev: PhoneActionState,
  formData: FormData,
): Promise<PhoneActionState> {
  const parsed = phoneOtpSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) {
    return { otpSent: true, phone: String(formData.get("phone") ?? ""), fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });
  if (error || !data.user) {
    return { otpSent: true, phone: parsed.data.phone, error: "That code didn't work. Please try again." };
  }

  // Mirrors registerAction's intent -> role logic in lib/auth/actions.ts:
  // the on_auth_user_created trigger already granted 'renter'; add
  // 'owner' too when the signup form declared that intent. Absent for a
  // plain login, so this is a no-op there.
  const pendingIntent = (data.user.user_metadata as { pending_intent?: string } | null)?.pending_intent;
  if (pendingIntent === "owner") {
    const admin = createServiceRoleClient();
    await admin.from("user_roles").upsert({ user_id: data.user.id, role: "owner" }, { onConflict: "user_id,role" });
  }

  redirect(parsed.data.mode === "signup" ? "/onboarding/welcome" : "/");
}
