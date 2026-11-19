import "server-only";
import { notifyUser } from "@/lib/admin/audit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { VerifiedWebhookEvent } from "./types";

export type ProcessEventResult =
  | { status: "confirmed" | "failed" | "reversed" | "refunded" | "duplicate" }
  | { status: "error"; error: string };

/**
 * The one and only path by which a subscription becomes active, extracted
 * from the webhook route so a provider's own status-check (MTN MoMo's
 * polling, since its sandbox callbacks are known unreliable) can resolve
 * a payment through the exact same idempotent, amount-verified code path
 * as a real webhook delivery — not a second, drifting copy of it. See
 * docs/PAYMENTS.md.
 */
/**
 * Decides whether a verified event's money matches the ledger.
 *
 * The previous expression was
 * `amount !== event.amount && transaction.currency === event.currency`,
 * which reads as "flag a mismatch" but behaves as "skip the check
 * entirely whenever the currencies differ". A 1 EUR event against a
 * $5 USD transaction produced `true && false` -- no mismatch -- and
 * went on to activate the pass. The bypass existed for MTN, which
 * settles in another currency, but nothing confined it to MTN.
 *
 * Providers now declare whether their amount is comparable, so the
 * exemption is explicit and per-provider instead of implied by a
 * currency difference.
 */
export function checkEventAmount(
  ledger: { amount: number; currency: string },
  event: Pick<VerifiedWebhookEvent, "amountUsd" | "currency">,
  reportsSettlementAmount: boolean,
): "ok" | "mismatch" | "not-comparable" {
  if (!reportsSettlementAmount) return "not-comparable";
  if (ledger.currency !== event.currency) return "mismatch";
  if (ledger.amount !== event.amountUsd) return "mismatch";
  return "ok";
}

export async function processVerifiedPaymentEvent(
  event: VerifiedWebhookEvent,
  providerName: string,
  reportsSettlementAmount: boolean,
): Promise<ProcessEventResult> {
  const supabase = createServiceRoleClient();

  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("internal_reference", event.internalReference)
    .maybeSingle();

  if (!transaction) {
    return { status: "error", error: "unknown transaction reference" };
  }

  // Already resolved (e.g. a webhook delivery already processed this
  // transaction before a poll caught up) -- don't re-run activation.
  if (transaction.status === "confirmed" || transaction.status === "failed" || transaction.status === "reversed" || transaction.status === "refunded") {
    return { status: transaction.status };
  }

  const amountCheck = checkEventAmount(
    { amount: Number(transaction.amount), currency: transaction.currency },
    event,
    reportsSettlementAmount,
  );

  if (amountCheck === "mismatch") {
    await supabase.from("payment_webhook_events").insert({
      provider: providerName,
      event_id: event.eventId,
      payload: { note: "amount/currency mismatch", event },
      processing_status: "failed",
      related_transaction_id: transaction.id,
      error_message: "amount or currency mismatch",
      processed_at: new Date().toISOString(),
    });
    return { status: "error", error: "amount mismatch" };
  }

  // Idempotency: this insert is the only gate. A unique(provider, event_id)
  // violation means this event was already processed -- acknowledge and
  // stop, without touching subscription state again.
  //
  // When the provider settles in another currency the amount could not be
  // checked, so the stored payload says so: an activation that rested
  // only on the provider's own verification should be visible in the
  // audit trail rather than indistinguishable from a fully checked one.
  const { error: insertError } = await supabase.from("payment_webhook_events").insert({
    provider: providerName,
    event_id: event.eventId,
    payload:
      amountCheck === "not-comparable"
        ? ({ note: "amount not comparable to ledger currency", event } as unknown as Record<string, unknown>)
        : (event as unknown as Record<string, unknown>),
    processing_status: "received",
    related_transaction_id: transaction.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { status: "duplicate" };
    }
    return { status: "error", error: "could not record webhook event" };
  }

  if (event.status === "confirmed") {
    await supabase.from("payment_transactions").update({ provider_transaction_id: event.providerTransactionId }).eq("id", transaction.id);

    const { error: activationError } = await supabase.rpc("confirm_payment_and_activate_subscription", {
      p_transaction_id: transaction.id,
      p_provider_event_ref: event.eventId,
    });

    await supabase
      .from("payment_webhook_events")
      .update({
        processing_status: activationError ? "failed" : "processed",
        error_message: activationError?.message ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("provider", providerName)
      .eq("event_id", event.eventId);

    if (activationError) {
      return { status: "error", error: "activation failed" };
    }

    // A provider can confirm a payment after the account was deleted, in
    // which case the ledger row has no owner left to notify. Record the
    // payment, skip the notification, never fail the webhook over it.
    if (transaction.user_id) {
      await notifyUser({
        userId: transaction.user_id,
        type: "subscription_activated",
        title: "Your Direct Access Pass is active",
        body: "You can now message property owners for the next 30 days.",
        link: "/pricing",
      });
    }
    return { status: "confirmed" };
  }

  // failed / reversed / refunded: record the outcome, never activate.
  await supabase.from("payment_transactions").update({ status: event.status }).eq("id", transaction.id);
  if (transaction.subscription_id) {
    await supabase
      .from("subscriptions")
      .update({ status: event.status === "refunded" ? "refunded" : "payment_failed" })
      .eq("id", transaction.subscription_id);
  }
  await supabase
    .from("payment_webhook_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("provider", providerName)
    .eq("event_id", event.eventId);

  if (event.status === "failed" && transaction.user_id) {
    await notifyUser({
      userId: transaction.user_id,
      type: "payment_failed",
      title: "Your payment wasn't confirmed",
      body: "No charge was applied. You can try subscribing again anytime.",
      link: "/pricing",
    });
  }
  return { status: event.status };
}
