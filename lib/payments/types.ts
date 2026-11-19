export interface CheckoutParams {
  transactionId: string;
  internalReference: string;
  amountUsd: number;
  userId: string;
  returnUrl: string;
  /** Required by push-payment providers (MTN MoMo); unused by redirect-style ones. */
  payerPhone?: string;
}

/**
 * Two real checkout shapes exist, not one:
 * - "redirect": a hosted checkout page (card processors, the mock
 *   provider) — the caller navigates the browser to `redirectUrl`.
 * - "pending": a push-payment provider (MTN MoMo's RequestToPay) already
 *   sent a prompt to the payer's phone; there is no page to redirect to.
 *   The caller shows a "check your phone" state and polls `reference`
 *   via `PaymentProvider.checkStatus` until it resolves.
 */
export type CheckoutResult = { kind: "redirect"; redirectUrl: string } | { kind: "pending"; reference: string };

export interface VerifiedWebhookEvent {
  eventId: string;
  providerTransactionId: string;
  internalReference: string;
  status: "confirmed" | "failed" | "reversed" | "refunded";
  amountUsd: number;
  currency: string;
}

export interface WebhookVerificationInput {
  rawBody: string;
  headers: Headers;
}

/**
 * Provider-agnostic payment interface. Every real provider (Orange Money,
 * MTN MoMo, a card processor) implements this; see docs/PAYMENTS.md for
 * what's needed to add one. `verifyWebhook` MUST independently verify the
 * event's authenticity (signature, API callback, etc.) — returning null
 * means "not verified," and the caller must never activate a subscription
 * for an unverified event.
 */
export interface PaymentProvider {
  readonly name: string;
  /** True for providers whose createCheckout requires CheckoutParams.payerPhone. */
  readonly requiresPayerPhone: boolean;
  /**
   * True when the amount and currency on a verified event describe the
   * same money as `payment_transactions.amount`, and can therefore be
   * checked against the ledger before activating.
   *
   * False for providers that settle in another currency and echo that
   * back (MTN MoMo's sandbox reports EUR against a USD ledger). For
   * those the comparison is meaningless, and the service records that
   * it was skipped rather than quietly passing.
   */
  readonly reportsSettlementAmount: boolean;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent | null>;
  /**
   * Polls the provider directly for a push-payment's current state —
   * independent of any webhook/callback, since those are known
   * unreliable in MTN's sandbox and not every provider has one at all.
   * Returns null while still pending. Only providers whose checkout can
   * return `{ kind: "pending" }` need to implement this meaningfully.
   */
  checkStatus?(reference: string): Promise<VerifiedWebhookEvent | null>;
}
