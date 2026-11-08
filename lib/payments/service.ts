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
export async function processVerifiedPaymentEvent(event: VerifiedWebhookEvent, providerName: string): Promise<ProcessEventResult> {
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

  // Never trust the event's amount blindly -- compare against our own
  // ledger. (MTN's status response echoes the sandbox EUR amount, which
  // the MtnMomoProvider already notes is informational-only for this
  // reason; this check still runs for providers whose amount IS the
  // business currency, e.g. a real card processor.)
  if (Number(transaction.amount) !== event.amountUsd && transaction.currency === event.currency) {
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
  const { error: insertError } = await supabase.from("payment_webhook_events").insert({
    provider: providerName,
    event_id: event.eventId,
    payload: event as unknown as Record<string, unknown>,
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

    await notifyUser({
      userId: transaction.user_id,
      type: "subscription_activated",
      title: "Your Direct Access Pass is active",
      body: "You can now message property owners for the next 30 days.",
      link: "/pricing",
    });
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

  if (event.status === "failed") {
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
