// Hand-ported subset of ../../../lib/validation/scouts.ts -- same
// rules, kept in sync by hand (see mobile/README.md). Admin-review-queue
// schemas (reference outcome, decision, settings) aren't ported here --
// admin stays web-only.
import { z } from "zod";
import { phoneNumberSchema } from "./auth";

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
