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
