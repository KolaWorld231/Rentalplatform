import { z } from "zod";

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  intent: z.enum(["renter", "owner"]),
  // Scout referral code, carried from a ?ref= link -- optional, never
  // required, and never blocks registration if the lookup fails.
  refCode: z.string().trim().max(20).optional().or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const passkeySignupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  intent: z.enum(["renter", "owner"]),
});
export type PasskeySignupInput = z.infer<typeof passkeySignupSchema>;

export const passkeyLabelSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
});
export type PasskeyLabelInput = z.infer<typeof passkeyLabelSchema>;

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter your phone number in international format, e.g. +231770000000");

export const phoneSignupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneNumberSchema,
  intent: z.enum(["renter", "owner"]),
});
export type PhoneSignupInput = z.infer<typeof phoneSignupSchema>;

export const phoneLoginSchema = z.object({
  phone: phoneNumberSchema,
});
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

export const phoneOtpSchema = z.object({
  phone: phoneNumberSchema,
  token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  mode: z.enum(["signup", "login"]),
});
export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>;

// WhatsApp OTP isn't a native Supabase Auth method (unlike phone/SMS
// above), so signup still collects an email -- same convention as
// passkeys: it's the underlying Supabase Auth identifier, never typed
// again at sign-in. Only the phone number is asked for on every later
// login. See docs/AUTH_ALTERNATIVES.md.
export const whatsappSignupSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneNumberSchema,
  email: z.string().trim().email("Enter a valid email address"),
  intent: z.enum(["renter", "owner"]),
});
export type WhatsappSignupInput = z.infer<typeof whatsappSignupSchema>;

export const whatsappLoginSchema = z.object({
  phone: phoneNumberSchema,
});
export type WhatsappLoginInput = z.infer<typeof whatsappLoginSchema>;

export const whatsappOtpVerifySchema = z.object({
  phone: phoneNumberSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  mode: z.enum(["signup", "login"]),
});
export type WhatsappOtpVerifyInput = z.infer<typeof whatsappOtpVerifySchema>;
