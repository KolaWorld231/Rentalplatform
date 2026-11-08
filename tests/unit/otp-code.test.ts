import { describe, expect, it } from "vitest";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "@/lib/auth/otp-code";

describe("generateOtpCode", () => {
  it("always returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode / verifyOtpCode", () => {
  it("verifies a code hashed for the same phone", () => {
    const hash = hashOtpCode("123456", "+231770000000");
    expect(verifyOtpCode("123456", "+231770000000", hash)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const hash = hashOtpCode("123456", "+231770000000");
    expect(verifyOtpCode("654321", "+231770000000", hash)).toBe(false);
  });

  it("rejects the right code hashed for a DIFFERENT phone -- a leaked hash can't be replayed against another number", () => {
    const hash = hashOtpCode("123456", "+231770000000");
    expect(verifyOtpCode("123456", "+231999999999", hash)).toBe(false);
  });

  it("never stores the plaintext code in the hash output", () => {
    const hash = hashOtpCode("123456", "+231770000000");
    expect(hash).not.toContain("123456");
  });

  it("is deterministic for the same code+phone pair", () => {
    expect(hashOtpCode("123456", "+231770000000")).toBe(hashOtpCode("123456", "+231770000000"));
  });
});
