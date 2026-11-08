import { describe, expect, it } from "vitest";
import { MtnMomoProvider, normalizeLiberianMsisdn } from "@/lib/payments/providers/mtn-momo";

describe("normalizeLiberianMsisdn", () => {
  it("strips a leading 0 and prefixes the Liberia country code", () => {
    expect(normalizeLiberianMsisdn("0770123456")).toBe("231770123456");
  });

  it("prefixes the country code onto a bare local number", () => {
    expect(normalizeLiberianMsisdn("770123456")).toBe("231770123456");
  });

  it("leaves a number that already has the country code unchanged", () => {
    expect(normalizeLiberianMsisdn("231770123456")).toBe("231770123456");
  });

  it("strips formatting characters (+, spaces, dashes)", () => {
    expect(normalizeLiberianMsisdn("+231 770-123-456")).toBe("231770123456");
    expect(normalizeLiberianMsisdn("0770 123 456")).toBe("231770123456");
  });
});

describe("MtnMomoProvider", () => {
  const provider = new MtnMomoProvider();

  it("declares requiresPayerPhone, unlike the mock/redirect-style providers", () => {
    expect(provider.requiresPayerPhone).toBe(true);
    expect(provider.name).toBe("mtn_momo");
  });

  it("rejects createCheckout with no payerPhone before making any network call", async () => {
    await expect(
      provider.createCheckout({
        transactionId: "t1",
        internalReference: "r1",
        amountUsd: 5,
        userId: "u1",
        returnUrl: "https://example.com",
      }),
    ).rejects.toThrow(/payerPhone is required/);
  });

  it("verifyWebhook rejects malformed JSON without making any network call", async () => {
    const result = await provider.verifyWebhook({ rawBody: "not json", headers: new Headers() });
    expect(result).toBeNull();
  });

  it("verifyWebhook rejects a payload with neither referenceId nor externalId", async () => {
    const result = await provider.verifyWebhook({ rawBody: JSON.stringify({ status: "SUCCESSFUL" }), headers: new Headers() });
    expect(result).toBeNull();
  });
});
