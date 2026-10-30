import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
