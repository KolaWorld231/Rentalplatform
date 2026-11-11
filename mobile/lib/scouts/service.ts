// The applicant-facing OTP/submit flow has no account yet, so it's
// proxied through app/api/mobile/scouts/* on the web app (same pattern
// as lib/auth/whatsapp-service.ts) -- those routes call the existing
// lib/scouts/actions.ts Server Actions directly. Everything else here
// (scout dashboard reads, referral attribution/response, account claim)
// is already-authenticated and goes straight through RLS or the
// SECURITY DEFINER RPCs added in
// supabase/migrations/20261110000600_scout_program_m7_mobile.sql.
import { supabase } from "../supabase";
import type { Scout, OwnerReferral } from "../database.types";
import type { ScoutApplicationInput } from "../validation/scouts";

function webAppOrigin(): string {
  return process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export interface ScoutArea {
  id: string;
  county: string;
  neighborhood: string;
}

export async function listOpenScoutAreas(): Promise<ScoutArea[]> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/scouts/areas`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.areas ?? [];
}

export interface ScoutOtpResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  otpSent?: boolean;
  verified?: boolean;
  phone?: string;
}

export async function startScoutApplicationOtp(phone: string): Promise<ScoutOtpResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/scouts/otp/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, fieldErrors: data.fieldErrors };
  return { otpSent: data.otpSent, phone: data.phone };
}

export async function verifyScoutApplicationOtp(phone: string, code: string): Promise<ScoutOtpResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/scouts/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, fieldErrors: data.fieldErrors, phone: data.phone };
  return { verified: data.verified, phone: data.phone };
}

export interface ScoutSubmitResult {
  error?: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
  referenceCode?: string;
  status?: "applied" | "waitlisted";
}

export async function submitScoutApplication(input: ScoutApplicationInput): Promise<ScoutSubmitResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/scouts/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, fieldErrors: data.fieldErrors };
  return { submitted: data.submitted, referenceCode: data.referenceCode, status: data.status };
}

/** Best-effort: an unknown/self-referral code is silently ignored by the RPC itself. */
export async function attributeScoutReferral(refCode: string): Promise<void> {
  await supabase.rpc("attribute_scout_referral", { p_ref_code: refCode });
}

export async function getPendingScoutReferral(ownerUserId: string): Promise<OwnerReferral | null> {
  const { data } = await supabase
    .from("owner_referrals")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("status", "pending_confirmation")
    .maybeSingle();
  return data ?? null;
}

export async function respondToScoutReferral(referralId: string, confirm: boolean): Promise<void> {
  await supabase.rpc("respond_to_scout_referral", { p_referral_id: referralId, p_confirm: confirm });
}

export async function getMyScout(userId: string): Promise<Scout | null> {
  const { data } = await supabase.from("scouts").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export async function claimScoutAccount(scoutId: string): Promise<void> {
  await supabase.rpc("claim_scout_account", { p_scout_id: scoutId });
}

export async function findClaimableScoutId(): Promise<string | null> {
  const { data } = await supabase.rpc("find_claimable_scout_id");
  return data ?? null;
}

export async function getReferredOwnerCount(scoutId: string): Promise<number> {
  const { count } = await supabase
    .from("owner_referrals")
    .select("id", { count: "exact", head: true })
    .eq("scout_id", scoutId)
    .eq("status", "confirmed");
  return count ?? 0;
}
