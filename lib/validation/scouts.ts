import { z } from "zod";
import { phoneNumberSchema } from "@/lib/validation/auth";

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export const scoutOtpRequestSchema = z.object({
  phone: phoneNumberSchema,
});
export type ScoutOtpRequestInput = z.infer<typeof scoutOtpRequestSchema>;

export const scoutOtpVerifySchema = z.object({
  phone: phoneNumberSchema,
  code: otpCodeSchema,
});
export type ScoutOtpVerifyInput = z.infer<typeof scoutOtpVerifySchema>;

export const scoutReferenceSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the reference's name").max(80),
  relationship: z.enum(["family", "employer", "community_leader", "other"]),
  phone: phoneNumberSchema,
});
export type ScoutReferenceInput = z.infer<typeof scoutReferenceSchema>;

// Bump this (and the displayed Code of Conduct copy) together when the
// wording changes -- recorded on every application so an older
// acceptance is never silently reinterpreted as agreeing to new terms.
export const SCOUT_CODE_OF_CONDUCT_VERSION = "2026-11-v1";

export const scoutApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: phoneNumberSchema,
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  ageConfirmed: z.literal(true, { error: "Confirm you are 18 or older" }),
  areaId: z.string().uuid("Select your area"),
  areaKnowledge: z.string().trim().min(10, "Tell us about your knowledge of the area").max(500),
  experience: z.string().trim().max(500).optional().or(z.literal("")),
  smartphoneModel: z.string().trim().min(2, "Enter your phone model").max(80),
  hasDataAccess: z.literal(true, { error: "Confirm you have mobile data access" }),
  motivation: z.string().trim().min(10, "Tell us why you want to join").max(500),
  references: z.array(scoutReferenceSchema).length(2, "Provide exactly two references"),
  codeOfConductAccepted: z.literal(true, { error: "Accept the Code of Conduct" }),
  verificationConsent: z.literal(true, { error: "Confirm you consent to verification checks" }),
});
export type ScoutApplicationInput = z.infer<typeof scoutApplicationSchema>;

// Milestone 2: admin review -------------------------------------------

export const scoutReferenceOutcomeSchema = z.object({
  outcome: z.enum(["reached_positive", "reached_concern", "not_reached"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ScoutReferenceOutcomeInput = z.infer<typeof scoutReferenceOutcomeSchema>;

export const scoutDecisionSchema = z.object({
  decision: z.enum(["approve_probation", "waitlist", "reject"]),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ScoutDecisionInput = z.infer<typeof scoutDecisionSchema>;

export const PROBATION_DAYS = 30;
export const REAPPLY_AFTER_DAYS = 90;

// Milestone 4: earnings. The bounty amount, revenue-share %, share
// duration, and monthly cap are admin-configurable in
// /admin/scouts/settings (scout_program_settings, Milestone 6) --
// never hardcoded here, per the spec's own "stored in
// platform_settings, not constants in code" rule. The 30-day
// confirmed-available waiting period is the bounty trigger's fixed
// timing rule, not one of the settings the spec calls out as
// admin-editable, so it stays a code constant.
export const BOUNTY_CONFIRMED_AVAILABLE_AFTER_DAYS = 30;

export const scoutProgramSettingsSchema = z.object({
  bountyAmountUsd: z.coerce.number().min(0).max(1000),
  sharePercent: z.coerce.number().min(0).max(100),
  shareDurationMonths: z.coerce.number().int().min(1).max(60),
  monthlyCapUsd: z.coerce.number().min(0).max(100000).optional(),
  payoutProvider: z.string().trim().max(80).optional().or(z.literal("")),
  payoutMethodNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  taxTreatmentNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ScoutProgramSettingsInput = z.infer<typeof scoutProgramSettingsSchema>;
// Milestone 5: field verification (spec §9). Off by default -- the
// scout-facing submission flow (camera capture, compression, the
// checklist UI) isn't built yet; flip this on only once it is.
export const SCOUT_FIELD_VERIFICATION_ENABLED = false;
export const SCOUT_FIELD_VISITED_LABEL_TEMPLATE = "A scout visited this property on {date}.";
