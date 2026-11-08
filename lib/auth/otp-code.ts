import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** A random 6-digit code, zero-padded -- crypto.randomInt, not Math.random. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Only the hash is ever stored, never the code itself -- same principle
 * as a password hash. Salted with the phone number so the same code
 * hashes differently per recipient (a leaked hash for one number can't
 * be replayed against another).
 */
export function hashOtpCode(code: string, phone: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function verifyOtpCode(code: string, phone: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code, phone), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
