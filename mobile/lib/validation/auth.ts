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

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter your phone number in international format, e.g. +231770000000");

export const whatsappSignupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneNumberSchema,
  email: z.string().trim().email("Enter a valid email address"),
  intent: z.enum(["renter", "owner"]),
});
export type WhatsappSignupInput = z.infer<typeof whatsappSignupSchema>;

export const whatsappLoginSchema = z.object({ phone: phoneNumberSchema });
export type WhatsappLoginInput = z.infer<typeof whatsappLoginSchema>;

export const whatsappOtpVerifySchema = z.object({
  phone: phoneNumberSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  mode: z.enum(["signup", "login"]),
});
export type WhatsappOtpVerifyInput = z.infer<typeof whatsappOtpVerifySchema>;
