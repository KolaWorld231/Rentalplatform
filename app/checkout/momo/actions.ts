"use server";

import { requireUser } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/payments";
import { processVerifiedPaymentEvent } from "@/lib/payments/service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type MomoPollResult = { status: "pending" | "confirmed" | "failed" | "error"; error?: string };

/**
 * Polled by the pending page (and mobile, via app/api/mobile/checkout/status)
 * since MTN's sandbox callbacks are known unreliable -- this calls the
 * provider's own checkStatus() to get the real, independently-verified
 * state, then funnels a resolved result through the exact same
 * processVerifiedPaymentEvent() a real webhook delivery would use.
 */
export async function checkMomoPaymentStatusAction(reference: string): Promise<MomoPollResult> {
  const user = await requireUser();

  const admin = createServiceRoleClient();
  const { data: transaction } = await admin.from("payment_transactions").select("user_id, status").eq("internal_reference", reference).maybeSingle();
  if (!transaction || transaction.user_id !== user.id) {
    return { status: "error", error: "Transaction not found." };
  }
  if (transaction.status === "confirmed") return { status: "confirmed" };
  if (transaction.status === "failed" || transaction.status === "reversed" || transaction.status === "refunded") return { status: "failed" };

  const provider = getPaymentProvider();
  if (!provider.checkStatus) {
    return { status: "error", error: "This payment method doesn't support status polling." };
  }

  const event = await provider.checkStatus(reference);
  if (!event) return { status: "pending" };

  const result = await processVerifiedPaymentEvent(event, provider.name);
  if (result.status === "error") return { status: "error", error: result.error };
  if (result.status === "confirmed") return { status: "confirmed" };
  return { status: "failed" };
}
