export interface CheckoutParams {
  transactionId: string;
  internalReference: string;
  amountUsd: number;
  userId: string;
  returnUrl: string;
}

export interface CheckoutResult {
  redirectUrl: string;
}

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
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent | null>;
}
