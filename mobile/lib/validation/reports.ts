// Hand-ported subset of ../../../lib/validation/property.ts's
// reportPropertySchema and ../../../lib/validation/messaging.ts's
// reportMessageSchema -- kept in sync by hand (see mobile/README.md).
import { z } from "zod";

const reportReasonSchema = z.enum([
  "fake_listing",
  "misleading_price",
  "already_rented",
  "unauthorized_representative",
  "impersonation",
  "harassment",
  "fraudulent_payment_request",
  "suspicious_message",
  "other",
]);

export const reportPropertySchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ReportPropertyInput = z.infer<typeof reportPropertySchema>;

export const reportMessageSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ReportMessageInput = z.infer<typeof reportMessageSchema>;

export const REPORT_REASON_LABELS: Record<z.infer<typeof reportReasonSchema>, string> = {
  fake_listing: "Fake listing",
  misleading_price: "Misleading price",
  already_rented: "Already rented",
  unauthorized_representative: "Not authorized to list this property",
  impersonation: "Impersonating someone else",
  harassment: "Harassment",
  fraudulent_payment_request: "Asked for payment before viewing",
  suspicious_message: "Suspicious message",
  other: "Other",
};
