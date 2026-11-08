"use server";

import { redirect } from "next/navigation";
import { firstFieldErrors } from "@/lib/auth/field-errors";
import { mintSessionForEmail } from "@/lib/auth/session-mint";
import { startWhatsAppLogin, startWhatsAppSignup, verifyWhatsAppOtp } from "@/lib/auth/whatsapp-otp";
import { whatsappLoginSchema, whatsappOtpVerifySchema, whatsappSignupSchema } from "@/lib/validation/auth";

export interface WhatsAppActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  otpSent?: boolean;
  phone?: string;
}

export async function startWhatsAppSignupAction(
  _prev: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = whatsappSignupSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const result = await startWhatsAppSignup(parsed.data);
  if ("error" in result) return { error: result.error, fieldErrors: result.fieldErrors };
  return { otpSent: true, phone: parsed.data.phone };
}

export async function startWhatsAppLoginAction(
  _prev: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = whatsappLoginSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const result = await startWhatsAppLogin(parsed.data);
  if ("error" in result) return { error: result.error };
  return { otpSent: true, phone: parsed.data.phone };
}

export async function verifyWhatsAppOtpAction(
  _prev: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const parsed = whatsappOtpVerifySchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) {
    return { otpSent: true, phone: String(formData.get("phone") ?? ""), fieldErrors: firstFieldErrors(parsed.error) };
  }

  const result = await verifyWhatsAppOtp(parsed.data);
  if ("error" in result) {
    return { otpSent: true, phone: parsed.data.phone, error: result.error, fieldErrors: result.fieldErrors };
  }

  await mintSessionForEmail(result.email);
  redirect(result.mode === "signup" ? "/onboarding/welcome" : "/");
}
