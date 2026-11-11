import { describe, expect, it } from "vitest";
import {
  scoutApplicationSchema,
  scoutOtpRequestSchema,
  scoutOtpVerifySchema,
  scoutProgramSettingsSchema,
  scoutReferenceSchema,
} from "@/lib/validation/scouts";

const validReference = { fullName: "Jane Doe", relationship: "family" as const, phone: "+231770000011" };

function validApplication() {
  return {
    fullName: "Applicant Name",
    phone: "+231770000001",
    email: "applicant@example.com",
    ageConfirmed: true as const,
    areaId: "11111111-1111-4111-8111-111111111111",
    areaKnowledge: "I have lived in this area for ten years.",
    experience: "",
    smartphoneModel: "Tecno Spark",
    hasDataAccess: true as const,
    motivation: "I want to help owners list their properties directly.",
    references: [validReference, { ...validReference, fullName: "John Doe", relationship: "employer" as const }],
    codeOfConductAccepted: true as const,
    verificationConsent: true as const,
  };
}

describe("scoutApplicationSchema", () => {
  it("accepts a fully valid application", () => {
    expect(scoutApplicationSchema.safeParse(validApplication()).success).toBe(true);
  });

  it("rejects when ageConfirmed is false", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), ageConfirmed: false });
    expect(result.success).toBe(false);
  });

  it("rejects when hasDataAccess is false", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), hasDataAccess: false });
    expect(result.success).toBe(false);
  });

  it("rejects when codeOfConductAccepted is false", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), codeOfConductAccepted: false });
    expect(result.success).toBe(false);
  });

  it("rejects when verificationConsent is false", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), verificationConsent: false });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than two references", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), references: [validReference] });
    expect(result.success).toBe(false);
  });

  it("rejects more than two references", () => {
    const result = scoutApplicationSchema.safeParse({
      ...validApplication(),
      references: [validReference, validReference, validReference],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID areaId", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), areaId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty optional email", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email when provided", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects area knowledge shorter than 10 characters", () => {
    const result = scoutApplicationSchema.safeParse({ ...validApplication(), areaKnowledge: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown reference relationship", () => {
    const result = scoutApplicationSchema.safeParse({
      ...validApplication(),
      references: [validReference, { ...validReference, relationship: "friend" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("scoutReferenceSchema", () => {
  it("accepts a valid reference", () => {
    expect(scoutReferenceSchema.safeParse(validReference).success).toBe(true);
  });

  it("rejects a reference name under 2 characters", () => {
    expect(scoutReferenceSchema.safeParse({ ...validReference, fullName: "J" }).success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(scoutReferenceSchema.safeParse({ ...validReference, phone: "0770000011" }).success).toBe(false);
  });
});

describe("scoutOtpRequestSchema / scoutOtpVerifySchema", () => {
  it("accepts a valid phone for the OTP request", () => {
    expect(scoutOtpRequestSchema.safeParse({ phone: "+231770000001" }).success).toBe(true);
  });

  it("rejects a phone with no country code", () => {
    expect(scoutOtpRequestSchema.safeParse({ phone: "0770000001" }).success).toBe(false);
  });

  it("accepts a valid phone + 6-digit code", () => {
    expect(scoutOtpVerifySchema.safeParse({ phone: "+231770000001", code: "123456" }).success).toBe(true);
  });

  it("rejects a code that isn't exactly 6 digits", () => {
    expect(scoutOtpVerifySchema.safeParse({ phone: "+231770000001", code: "12345" }).success).toBe(false);
    expect(scoutOtpVerifySchema.safeParse({ phone: "+231770000001", code: "1234567" }).success).toBe(false);
  });

  it("rejects a non-numeric code", () => {
    expect(scoutOtpVerifySchema.safeParse({ phone: "+231770000001", code: "abcdef" }).success).toBe(false);
  });
});

describe("scoutProgramSettingsSchema", () => {
  it("accepts valid settings with an optional monthly cap omitted", () => {
    const result = scoutProgramSettingsSchema.safeParse({
      bountyAmountUsd: 2,
      sharePercent: 10,
      shareDurationMonths: 6,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative bounty amount", () => {
    const result = scoutProgramSettingsSchema.safeParse({
      bountyAmountUsd: -1,
      sharePercent: 10,
      shareDurationMonths: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a share percent over 100", () => {
    const result = scoutProgramSettingsSchema.safeParse({
      bountyAmountUsd: 2,
      sharePercent: 150,
      shareDurationMonths: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer share duration", () => {
    const result = scoutProgramSettingsSchema.safeParse({
      bountyAmountUsd: 2,
      sharePercent: 10,
      shareDurationMonths: 6.5,
    });
    expect(result.success).toBe(false);
  });
});
