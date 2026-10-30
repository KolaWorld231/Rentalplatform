import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Payment provider webhook endpoint. Handles subscription activation —
 * the one and only path by which a subscription becomes active. See
 * docs/PAYMENTS.md for the full verification/idempotency model.
 *
 * NOTE on architecture: the build brief's reference design routes this
 * through a Supabase Edge Function. We implement it as a Next.js Route
 * Handler instead — same trust boundary (server-only code using the
 * service-role key, never reachable by client-supplied authorization),
 * and it's directly testable in this environment where the Supabase CLI's
 * Docker-backed Edge Functions runtime isn't available. Porting this
 * handler's body into `supabase/functions/payments-webhook/` later is a
 * copy, not a redesign — see that folder's README.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const provider = getPaymentProvider();

  const event = await provider.verifyWebhook({ rawBody, headers: request.headers });
  if (!event) {
    return NextResponse.json({ error: "invalid or unverifiable webhook" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("internal_reference", event.internalReference)
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "unknown transaction reference" }, { status: 404 });
  }

  // Reject an event whose amount/currency don't match what we expect for
  // this transaction — never trust the webhook payload's amount blindly.
  if (Number(transaction.amount) !== event.amountUsd || transaction.currency !== event.currency) {
    await supabase.from("payment_webhook_events").insert({
      provider: provider.name,
      event_id: event.eventId,
      payload: { note: "amount/currency mismatch", event },
      processing_status: "failed",
      related_transaction_id: transaction.id,
      error_message: "amount or currency mismatch",
      processed_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  // Idempotency: this insert is the only gate. A unique(provider, event_id)
  // violation means this event was already processed — acknowledge and
  // stop, without touching subscription state again.
  const { error: insertError } = await supabase.from("payment_webhook_events").insert({
    provider: provider.name,
    event_id: event.eventId,
    payload: event as unknown as Record<string, unknown>,
    processing_status: "received",
    related_transaction_id: transaction.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    }
    return NextResponse.json({ error: "could not record webhook event" }, { status: 500 });
  }

  if (event.status === "confirmed") {
    await supabase
      .from("payment_transactions")
      .update({ provider_transaction_id: event.providerTransactionId })
      .eq("id", transaction.id);

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
      .eq("provider", provider.name)
      .eq("event_id", event.eventId);

    if (activationError) {
      return NextResponse.json({ error: "activation failed" }, { status: 500 });
    }
  } else {
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
      .eq("provider", provider.name)
      .eq("event_id", event.eventId);
  }

  return NextResponse.json({ status: "ok" });
}
