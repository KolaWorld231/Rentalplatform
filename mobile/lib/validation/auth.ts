// Hand-ported from ../../../lib/validation/auth.ts -- same rules, kept
// in sync by hand (see mobile/README.md).
import { z } from "zod";

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  intent: z.enum(["renter", "owner"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;
