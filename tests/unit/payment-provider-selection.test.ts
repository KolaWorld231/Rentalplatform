import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPaymentProvider } from "@/lib/payments";
import { MockPaymentProvider } from "@/lib/payments/providers/mock";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo";

describe("getPaymentProvider", () => {
  const originalEnv = { ...process.env };

  function setNodeEnv(value: string) {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  beforeEach(() => {
    delete process.env.PAYMENTS_PROVIDER;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the mock provider when running locally", () => {
    setNodeEnv("development");
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
  });

  /**
   * This previously asserted the opposite, and that assertion is what made
   * the bypass reachable: a Vercel preview is not "production", but it is
   * a public URL served from the production database, and the mock's
   * checkout page would mint a real 30-day pass. The page is deleted and
   * the mock is refused on any deployment.
   */
  it("rejects the mock provider on a Vercel preview build, which is still a public deployment", () => {
    setNodeEnv("production");
    process.env.VERCEL_ENV = "preview";
    expect(() => getPaymentProvider()).toThrow(/not allowed in a deployed environment/);
  });

  it("rejects the mock provider on a Vercel development deployment", () => {
    setNodeEnv("production");
    process.env.VERCEL_ENV = "development";
    expect(() => getPaymentProvider()).toThrow(/not allowed in a deployed environment/);
  });

  it("rejects the mock provider on a real Vercel production deployment", () => {
    setNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    expect(() => getPaymentProvider()).toThrow(/not allowed in a deployed environment/);
  });

  it("rejects the mock provider on a non-Vercel production host (no VERCEL_ENV)", () => {
    setNodeEnv("production");
    expect(() => getPaymentProvider()).toThrow(/not allowed in a deployed environment/);
  });

  it("gives the mock provider no checkout page to send anyone to", async () => {
    setNodeEnv("development");
    const provider = getPaymentProvider();
    await expect(
      provider.createCheckout({
        transactionId: "t",
        internalReference: "r",
        amountUsd: 5,
        userId: "u",
        returnUrl: "http://localhost:3000",
      }),
    ).rejects.toThrow(/no checkout page/);
  });

  it("returns the MTN MoMo provider regardless of environment", () => {
    process.env.PAYMENTS_PROVIDER = "mtn_momo";
    setNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    expect(getPaymentProvider()).toBeInstanceOf(MtnMomoProvider);
  });
});
