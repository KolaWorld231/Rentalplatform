import "server-only";
import type { CheckoutParams, CheckoutResult, PaymentProvider, VerifiedWebhookEvent, WebhookVerificationInput } from "../types";

/**
 * Development/test-only payment provider. It simulates a payment flow end
 * to end (checkout → confirmation → webhook) WITHOUT ever touching real
 * money, so the subscription activation path can be built and tested
 * before a real Liberia-capable provider is integrated.
 *
 * Safety: `getPaymentProvider()` (../index.ts) refuses to construct this
 * provider when NODE_ENV === "production" — a mock payment can never
 * activate a production subscription. The "confirm" step requires the
 * caller to know PAYMENTS_WEBHOOK_SECRET, matching how a real provider's
 * webhook signature check works, so even in development nothing but this
 * app's own checkout page can trigger an activation.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly requiresPayerPhone = false;

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const url = new URL("/checkout/mock", params.returnUrl);
    url.searchParams.set("txn", params.transactionId);
    url.searchParams.set("ref", params.internalReference);
    url.searchParams.set("amount", params.amountUsd.toFixed(2));
    return { kind: "redirect", redirectUrl: url.toString() };
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
