import { beforeEach, describe, expect, it } from "vitest";
import { MockPaymentProvider } from "@/lib/payments/providers/mock";

describe("MockPaymentProvider.verifyWebhook", () => {
  const provider = new MockPaymentProvider();

  beforeEach(() => {
    process.env.PAYMENTS_WEBHOOK_SECRET = "test-secret";
  });

  function makeHeaders(secret?: string) {
    const h = new Headers();
    if (secret !== undefined) h.set("x-mock-webhook-secret", secret);
    return h;
  }

  it("rejects a request with no secret configured", async () => {
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
    const result = await provider.verifyWebhook({
      rawBody: JSON.stringify({ eventId: "e1", providerTransactionId: "t1", internalReference: "r1", amountUsd: 5, status: "confirmed" }),
      headers: makeHeaders("anything"),
    });
    expect(result).toBeNull();
  });

  it("rejects a request with the wrong secret", async () => {
    const result = await provider.verifyWebhook({
      rawBody: JSON.stringify({ eventId: "e1", providerTransactionId: "t1", internalReference: "r1", amountUsd: 5, status: "confirmed" }),
      headers: makeHeaders("wrong-secret"),
    });
    expect(result).toBeNull();
  });

  it("rejects malformed JSON", async () => {
    const result = await provider.verifyWebhook({
      rawBody: "not json",
      headers: makeHeaders("test-secret"),
    });
    expect(result).toBeNull();
  });

  it("rejects a payload missing required fields", async () => {
    const result = await provider.verifyWebhook({
      rawBody: JSON.stringify({ eventId: "e1" }),
      headers: makeHeaders("test-secret"),
    });
    expect(result).toBeNull();
  });

  it("rejects an unrecognized status value", async () => {
    const result = await provider.verifyWebhook({
      rawBody: JSON.stringify({
        eventId: "e1",
        providerTransactionId: "t1",
        internalReference: "r1",
        amountUsd: 5,
        status: "totally-paid",
      }),
      headers: makeHeaders("test-secret"),
    });
    expect(result).toBeNull();
  });

  it("verifies a well-formed, correctly-authenticated confirmed event", async () => {
    const result = await provider.verifyWebhook({
      rawBody: JSON.stringify({
        eventId: "evt_1",
        providerTransactionId: "txn_1",
        internalReference: "ref_1",
        amountUsd: 5,
        status: "confirmed",
      }),
      headers: makeHeaders("test-secret"),
    });
    expect(result).toEqual({
      eventId: "evt_1",
      providerTransactionId: "txn_1",
      internalReference: "ref_1",
      status: "confirmed",
      amountUsd: 5,
      currency: "USD",
    });
  });
});
