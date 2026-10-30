import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000),
});

export const startConversationSchema = z.object({
  propertyId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a message").max(4000),
});

export const reportMessageSchema = z.object({
  reason: z.enum([
    "fake_listing",
    "misleading_price",
    "already_rented",
    "unauthorized_representative",
    "impersonation",
    "harassment",
    "fraudulent_payment_request",
    "suspicious_message",
    "other",
  ]),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});
