"use server";

import { generateOtpCode, hashOtpCode, verifyOtpCode } from "@/lib/auth/otp-code";
import { firstFieldErrors } from "@/lib/auth/field-errors";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendScoutApplicationOtp } from "@/lib/scouts/scout-sms";
import {
  SCOUT_CODE_OF_CONDUCT_VERSION,
  scoutApplicationSchema,
  scoutOtpRequestSchema,
  scoutOtpVerifySchema,
} from "@/lib/validation/scouts";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const START_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const START_RATE_LIMIT_MAX = 3;
const VERIFIED_WINDOW_MS = 30 * 60 * 1000;

export interface ScoutOtpActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  otpSent?: boolean;
  verified?: boolean;
  phone?: string;
}

export interface ScoutSubmitActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
  referenceCode?: string;
  status?: "applied" | "waitlisted";
}

export interface ScoutArea {
  id: string;
  county: string;
  neighborhood: string;
}

/** Areas open for applications -- fetched via service-role since RLS denies anon/authenticated on scout_areas (see migration). */
export async function listOpenScoutAreas(): Promise<ScoutArea[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin.from("scout_areas").select("id, county, neighborhood").eq("is_open", true).order("county");
  return data ?? [];
}

export async function startScoutApplicationOtpAction(
  _prev: ScoutOtpActionState,
  formData: FormData,
): Promise<ScoutOtpActionState> {
  const parsed = scoutOtpRequestSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  const { phone } = parsed.data;

  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - START_RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("scout_application_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= START_RATE_LIMIT_MAX) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const code = generateOtpCode();
  const { error: insertError } = await admin.from("scout_application_otp_challenges").insert({
    phone,
    code_hash: hashOtpCode(code, phone),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (insertError) return { error: "Couldn't start phone verification. Please try again." };

  try {
    await sendScoutApplicationOtp(phone, code);
  } catch {
    return { error: "Code delivery isn't live yet for the Scout Program. Please check back soon or contact support." };
  }

  return { otpSent: true, phone };
}

export async function verifyScoutApplicationOtpAction(
  _prev: ScoutOtpActionState,
  formData: FormData,
): Promise<ScoutOtpActionState> {
  const parsed = scoutOtpVerifySchema.safeParse({ phone: formData.get("phone"), code: formData.get("code") });
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error), phone: String(formData.get("phone") ?? "") };
  const { phone, code } = parsed.data;

  const admin = createServiceRoleClient();
  const { data: challenge } = await admin
    .from("scout_application_otp_challenges")
    .select("*")
    .eq("phone", phone)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    return { error: "That code expired. Please request a new one.", phone };
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { error: "Too many incorrect attempts. Please request a new code.", phone };
  }
  if (!verifyOtpCode(code, phone, challenge.code_hash)) {
    await admin.from("scout_application_otp_challenges").update({ attempts: challenge.attempts + 1 }).eq("id", challenge.id);
    return { error: "That code didn't work. Please try again.", phone };
  }

  await admin.from("scout_application_otp_challenges").update({ verified_at: new Date().toISOString() }).eq("id", challenge.id);
  return { verified: true, phone };
}

export async function submitScoutApplicationAction(
  _prev: ScoutSubmitActionState,
  formData: FormData,
): Promise<ScoutSubmitActionState> {
  const referencesRaw = formData.get("references");
  let references: unknown;
  try {
    references = JSON.parse(String(referencesRaw ?? "[]"));
  } catch {
    return { error: "Something went wrong with your references. Please try again." };
  }

  const parsed = scoutApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    ageConfirmed: formData.get("ageConfirmed") === "true",
    areaId: formData.get("areaId"),
    areaKnowledge: formData.get("areaKnowledge"),
    experience: formData.get("experience"),
    smartphoneModel: formData.get("smartphoneModel"),
    hasDataAccess: formData.get("hasDataAccess") === "true",
    motivation: formData.get("motivation"),
    references,
    codeOfConductAccepted: formData.get("codeOfConductAccepted") === "true",
    verificationConsent: formData.get("verificationConsent") === "true",
  });
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  const input = parsed.data;

  const admin = createServiceRoleClient();

  // Enforce the OTP gate here, as a fresh request-time check -- the form
  // can't be submitted just because the client-side phase said so.
  const { data: challenge } = await admin
    .from("scout_application_otp_challenges")
    .select("verified_at")
    .eq("phone", input.phone)
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge?.verified_at || Date.now() - new Date(challenge.verified_at).getTime() > VERIFIED_WINDOW_MS) {
    return { error: "Verify your phone number first." };
  }

  const { data, error } = await admin.rpc("submit_scout_application", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email || null,
    p_area_id: input.areaId,
    p_area_knowledge: input.areaKnowledge,
    p_experience: input.experience || null,
    p_smartphone_model: input.smartphoneModel,
    p_has_data_access: input.hasDataAccess,
    p_motivation: input.motivation,
    p_code_of_conduct_version: SCOUT_CODE_OF_CONDUCT_VERSION,
    p_phone_verified_at: challenge.verified_at,
    p_references: input.references,
  });

  if (error) {
    if (error.message.includes("duplicate_phone") || error.message.includes("duplicate_email")) {
      return { error: "An application already exists for that phone number or email." };
    }
    return { error: "Couldn't submit your application. Please try again." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  await admin.from("admin_audit_logs").insert({
    actor_id: null,
    action: "scout_application_submitted",
    target_table: "scout_applications",
    target_id: row.id,
    metadata: { area_id: input.areaId, status: row.status, reference_code: row.reference_code },
  });

  // The RPC only ever assigns "applied" or "waitlisted" on insert --
  // "withdrawn" is a later-milestone transition, never a submit outcome.
  return { submitted: true, referenceCode: row.reference_code, status: row.status as "applied" | "waitlisted" };
}
