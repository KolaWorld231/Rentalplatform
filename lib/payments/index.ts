import "server-only";
import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./providers/mock";
import { MtnMomoProvider } from "./providers/mtn-momo";

/**
 * Whether a provider that can actually take money is configured for this
 * environment. False means no payment is possible here -- either nothing
 * real is configured, or the mock is configured somewhere it is refused.
 *
 * This exists because `getPaymentProvider()` throws by design, which is
 * right for a write path (never guess about money) but wrong for a page
 * that merely renders the price. /pricing called it during render and
 * returned a 500 for every visitor the moment the deployment became a
 * real production one -- a top-level nav link, down, telling nobody why.
 * Read paths ask this first and render an honest "not available yet"
 * state instead.
 */
export function isPaymentProviderConfigured(): boolean {
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENTS_PROVIDER ?? "mock";

  if (providerName === "mock") {
    // NODE_ENV is "production" for every `next build`, including a Vercel
    // *preview* deployment -- it says nothing about whether this is the
    // real, live production environment. VERCEL_ENV does distinguish that
    // ("production" vs. "preview"/"development"); fall back to NODE_ENV
    // only when VERCEL_ENV is unset (e.g. a non-Vercel production host).
    const isRealProduction = process.env.VERCEL_ENV
      ? process.env.VERCEL_ENV === "production"
      : process.env.NODE_ENV === "production";
    if (isRealProduction) {
      throw new Error(
        "PAYMENTS_PROVIDER=mock is not allowed in production — it can never activate a real subscription. Configure a real provider (see docs/PAYMENTS.md).",
      );
    }
    return new MockPaymentProvider();
  }

  if (providerName === "mtn_momo") {
    return new MtnMomoProvider();
  }

  throw new Error(
    `Unknown or unconfigured payment provider "${providerName}". No real provider is integrated yet — see docs/PAYMENTS.md for what's required to add one.`,
  );
}
