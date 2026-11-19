import { afterEach, describe, expect, it } from "vitest";
import { isPaymentProviderConfigured } from "@/lib/payments";

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

/**
 * /pricing called getPaymentProvider() during render. That function throws
 * by design -- correct for a write path, wrong for a page that only shows
 * a price. The moment the deployment became a real production one, the
 * mock provider was refused and /pricing returned 500 to every visitor,
 * with the link still in the header nav.
 *
 * Read paths ask this instead, so an unconfigured environment renders an
 * honest "not available yet" state.
 */
describe("isPaymentProviderConfigured", () => {
  it("is false for the mock provider in real production", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    process.env.VERCEL_ENV = "production";
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  it("is false for the mock provider in a preview deployment", () => {
    // A preview is a public URL on the production database, so the mock
    // is refused there too -- /pricing shows the unavailable state rather
    // than a checkout that could mint a free pass.
    process.env.PAYMENTS_PROVIDER = "mock";
    process.env.VERCEL_ENV = "preview";
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  it("is true for the mock provider running locally", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    delete process.env.VERCEL_ENV;
    (process.env as Record<string, string>).NODE_ENV = "development";
    expect(isPaymentProviderConfigured()).toBe(true);
  });

  it("is false for an unknown provider name", () => {
    process.env.PAYMENTS_PROVIDER = "stripe";
    delete process.env.VERCEL_ENV;
    expect(isPaymentProviderConfigured()).toBe(false);
  });

  it("is true for a real provider", () => {
    process.env.PAYMENTS_PROVIDER = "mtn_momo";
    process.env.VERCEL_ENV = "production";
    expect(isPaymentProviderConfigured()).toBe(true);
  });

  it("never throws, whatever it is given", () => {
    process.env.PAYMENTS_PROVIDER = "";
    process.env.VERCEL_ENV = "production";
    expect(() => isPaymentProviderConfigured()).not.toThrow();
  });
});
