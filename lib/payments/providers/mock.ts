import "server-only";
import type { CheckoutResult, PaymentProvider, VerifiedWebhookEvent, WebhookVerificationInput } from "../types";

/**
 * Development/test-only payment provider. It simulates a payment flow end
 * to end (checkout → confirmation → webhook) WITHOUT ever touching real
 * money, so the subscription activation path can be built and tested
 * before a real Liberia-capable provider is integrated.
 *
 * It has no checkout UI. There was one -- /checkout/mock, with a button
 * that posted a "confirmed" event to the real webhook using the real
 * secret. `getPaymentProvider()` refused the mock in production, but a
 * Vercel *preview* is not production and is still a public URL served
 * from the production database, so on the live site any signed-in renter
 * could click through to a free 30-day pass. The page is deleted and the
 * mock is now refused in every deployed environment.
 *
 * A payment is simulated the way a real provider does it: POST the event
 * to /api/payments/webhook with the x-mock-webhook-secret header. That
 * exercises the verification, idempotency and activation path exactly as
 * production will, instead of a button that bypasses the provider
 * entirely.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly requiresPayerPhone = false;
  // The mock settles in the ledger currency, so its amounts are checkable.
  readonly reportsSettlementAmount = true;

  async createCheckout(): Promise<CheckoutResult> {
    throw new Error(
      "The mock provider has no checkout page. Simulate a payment by POSTing the event to /api/payments/webhook with the x-mock-webhook-secret header — see lib/payments/providers/mock.ts.",
    );
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent | null> {
    const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
    const provided = input.headers.get("x-mock-webhook-secret");
    if (!secret || provided !== secret) return null;

    let body: unknown;
    try {
      body = JSON.parse(input.rawBody);
    } catch {
      return null;
    }
    if (typeof body !== "object" || body === null) return null;
    const b = body as Record<string, unknown>;

    if (
      typeof b.eventId !== "string" ||
      typeof b.providerTransactionId !== "string" ||
      typeof b.internalReference !== "string" ||
      typeof b.amountUsd !== "number" ||
      (b.status !== "confirmed" && b.status !== "failed")
    ) {
      return null;
    }

    return {
      eventId: b.eventId,
      providerTransactionId: b.providerTransactionId,
      internalReference: b.internalReference,
      status: b.status,
      amountUsd: b.amountUsd,
      currency: "USD",
    };
  }
}
