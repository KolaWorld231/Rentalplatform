"use server";

import { redirect } from "next/navigation";

/**
 * Simulates the provider calling our webhook after a (fake) successful
 * payment. This exists ONLY because PAYMENTS_PROVIDER=mock is the
 * development provider — it calls the exact same /api/payments/webhook
 * endpoint a real provider would, with the dev webhook secret, so the
 * verification/idempotency/activation code path is identical in dev and
 * production. getPaymentProvider() refuses to construct the mock provider
 * at all when NODE_ENV==="production", so this page is inert there.
 */
export async function simulatePaymentAction(formData: FormData) {
  const transactionId = String(formData.get("txn"));
  const internalReference = String(formData.get("ref"));
  const amount = Number(formData.get("amount"));
  const outcome = String(formData.get("outcome"));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET ?? "";

  await fetch(`${appUrl}/api/payments/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-mock-webhook-secret": secret },
    body: JSON.stringify({
      eventId: `mock_evt_${transactionId}_${Date.now()}`,
      providerTransactionId: `mock_txn_${transactionId}`,
      internalReference,
      amountUsd: amount,
      status: outcome === "fail" ? "failed" : "confirmed",
    }),
  });

  redirect(outcome === "fail" ? "/pricing?payment=failed" : "/pricing?payment=success");
}
