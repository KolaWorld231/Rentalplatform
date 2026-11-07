import "server-only";
import type { CheckoutParams, CheckoutResult, PaymentProvider, VerifiedWebhookEvent, WebhookVerificationInput } from "../types";

/**
 * MTN expects local MSISDN digits only (no "+", country code included).
 * Liberia country code 231. Exported standalone (not a class method) so
 * it's unit-testable without network/credentials -- see
 * tests/unit/mtn-momo-provider.test.ts.
 */
export function normalizeLiberianMsisdn(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("231")) return digits;
  if (digits.startsWith("0")) return `231${digits.slice(1)}`;
  return `231${digits}`;
}

/**
 * MTN Mobile Money (MoMo) Collection API. Unlike a card processor, this is
 * a PUSH flow, not a hosted redirect: RequestToPay sends a USSD prompt to
 * the payer's phone and the flow resolves only once they approve + enter
 * their PIN. There is no checkout page to redirect to, so createCheckout
 * returns `{ kind: "pending" }` and the caller (web's pending page, or
 * mobile) polls `checkStatus` until it resolves.
 *
 * Sandbox vs. production: the sandbox (momodeveloper.mtn.com, self-
 * provisioned, no business registration required) only accepts EUR and
 * uses a generic `X-Target-Environment: sandbox`. Liberia is a live MoMo
 * production market (confirmed against MTN's own developer-community
 * posts, Nov 2026), but production credentials, the correct
 * X-Target-Environment value for Liberia, and the real settlement
 * currency (almost certainly LRD, not USD) are NOT resolved here — see
 * docs/PAYMENTS.md. `MTN_MOMO_CURRENCY` lets that stay a config value
 * instead of a hardcoded guess; it does not change what this ledger
 * records in `payment_transactions.currency` (always the business
 * currency, USD), only what's sent to MTN's API.
 *
 * Callback reliability: MTN's own sandbox docs and third-party
 * integration guides agree sandbox callbacks are unreliable. verifyWebhook
 * therefore never trusts the callback body's status directly — it only
 * uses the callback to learn WHICH reference to check, then calls
 * checkStatus() to get the real, independently-verified status. This is
 * the same "independently verify" contract every provider must meet.
 */
export class MtnMomoProvider implements PaymentProvider {
  readonly name = "mtn_momo";
  readonly requiresPayerPhone = true;

  private get baseUrl() {
    return process.env.MTN_MOMO_BASE_URL ?? "https://sandbox.momodeveloper.mtn.com";
  }
  private get targetEnvironment() {
    return process.env.MTN_MOMO_TARGET_ENVIRONMENT ?? "sandbox";
  }
  private get currency() {
    return process.env.MTN_MOMO_CURRENCY ?? "EUR";
  }
  private get subscriptionKey() {
    const key = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    if (!key) throw new Error("MTN_MOMO_SUBSCRIPTION_KEY is not configured.");
    return key;
  }
  private get apiUser() {
    const user = process.env.MTN_MOMO_API_USER;
    if (!user) throw new Error("MTN_MOMO_API_USER is not configured.");
    return user;
  }
  private get apiKey() {
    const key = process.env.MTN_MOMO_API_KEY;
    if (!key) throw new Error("MTN_MOMO_API_KEY is not configured.");
    return key;
  }

  // Simple in-process cache. MTN access tokens are valid ~1 hour; this is
  // fine for a long-lived Node process but resets per cold start on
  // serverless — acceptable for now (one extra token call per cold
  // start), flagged here rather than silently assumed away.
  private cachedToken: { value: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const basicAuth = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString("base64");
    const res = await fetch(`${this.baseUrl}/collection/token/`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
      },
    });
    if (!res.ok) {
      throw new Error(`MTN MoMo token request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    if (!params.payerPhone) {
      throw new Error("payerPhone is required for MTN MoMo checkout.");
    }

    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": params.internalReference,
        "X-Target-Environment": this.targetEnvironment,
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountUsd.toFixed(2),
        currency: this.currency,
        externalId: params.transactionId,
        payer: { partyIdType: "MSISDN", partyId: normalizeLiberianMsisdn(params.payerPhone) },
        payerMessage: "DomiLink Direct Access Pass",
        payeeNote: "DomiLink Direct Access Pass",
      }),
    });

    if (!res.ok) {
      throw new Error(`MTN MoMo RequestToPay failed: ${res.status} ${await res.text()}`);
    }

    return { kind: "pending", reference: params.internalReference };
  }

  async checkStatus(reference: string): Promise<VerifiedWebhookEvent | null> {
    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${reference}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": this.targetEnvironment,
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
      },
    });
    if (!res.ok) {
      throw new Error(`MTN MoMo status check failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      status: "PENDING" | "SUCCESSFUL" | "FAILED";
      financialTransactionId?: string;
      amount: string;
      externalId: string;
    };

    if (data.status === "PENDING") return null;

    return {
      eventId: `${reference}-${data.status}`,
      providerTransactionId: data.financialTransactionId ?? reference,
      internalReference: reference,
      status: data.status === "SUCCESSFUL" ? "confirmed" : "failed",
      // MTN's status response echoes back the amount in MTN_MOMO_CURRENCY
      // (sandbox: EUR), not the business currency -- the caller (service.ts)
      // validates against the ledger's own recorded USD amount, not this
      // field, so this is informational only.
      amountUsd: Number(data.amount),
      currency: this.currency,
    };
  }

  /**
   * Never trusts the callback body's status (sandbox callbacks are known
   * unreliable, and there's no documented signature scheme to check) --
   * only uses it to learn the reference, then calls checkStatus for the
   * real, independently-verified result.
   */
  async verifyWebhook(input: WebhookVerificationInput): Promise<VerifiedWebhookEvent | null> {
    let body: unknown;
    try {
      body = JSON.parse(input.rawBody);
    } catch {
      return null;
    }
    if (typeof body !== "object" || body === null) return null;
    const reference =
      "referenceId" in body && typeof (body as Record<string, unknown>).referenceId === "string"
        ? (body as Record<string, string>).referenceId
        : "externalId" in body && typeof (body as Record<string, unknown>).externalId === "string"
          ? (body as Record<string, string>).externalId
          : null;
    if (!reference) return null;

    return this.checkStatus(reference);
  }
}
