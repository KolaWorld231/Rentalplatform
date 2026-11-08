// Mobile's half of WhatsApp OTP sign-up/sign-in. The server side (code
// generation/hashing, sending via the WhatsApp Cloud API, verifying)
// lives entirely on the web app, in lib/auth/whatsapp-otp.ts --
// reused as-is via two unauthenticated-by-design routes (there's no
// session yet at the point of requesting/verifying a code), since
// mobile has no service-role layer to talk to Meta's API or create a
// Supabase user directly. Mobile's own job is just the UI plus turning
// the verify step's returned tokens into a real local session.
import { supabase } from "../supabase";

function webAppOrigin(): string {
  return process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export interface WhatsAppResult {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function startWhatsAppSignup(input: {
  displayName: string;
  phone: string;
  email: string;
  intent: "renter" | "owner";
}): Promise<WhatsAppResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/whatsapp-otp/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "signup", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, fieldErrors: data.fieldErrors };
  return { ok: true };
}

export async function startWhatsAppLogin(phone: string): Promise<WhatsAppResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/whatsapp-otp/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "login", phone }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error };
  return { ok: true };
}

/** On success, also establishes the local Supabase session -- the caller just navigates. */
export async function verifyWhatsAppOtp(input: { phone: string; code: string; mode: "signup" | "login" }): Promise<WhatsAppResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/whatsapp-otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, fieldErrors: data.fieldErrors };

  const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (sessionError) return { error: "Couldn't complete sign-in. Please try again." };
  return { ok: true };
}
