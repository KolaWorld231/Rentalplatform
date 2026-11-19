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
    // This used to allow the mock on a Vercel *preview* build, on the
    // reasoning that a preview is not production. A preview deployment is
    // still a public URL served from the production database, and the
    // mock's checkout page offered a button that posted a "confirmed"
    // event to the real webhook with the real secret -- so any signed-in
    // renter could mint themselves a 30-day pass. That page is gone, and
    // the mock is now refused in every deployed environment, not just the
    // one labelled production.
    //
    // VERCEL_ENV is set on every Vercel deployment and unset locally, so
    // its mere presence means "deployed". NODE_ENV is the fallback for a
    // non-Vercel host, where it is "production" for any real build.
    const isDeployed = process.env.VERCEL_ENV
      ? true
      : process.env.NODE_ENV === "production";
    if (isDeployed) {
      throw new Error(
        "PAYMENTS_PROVIDER=mock is not allowed in a deployed environment — it can never activate a real subscription. Configure a real provider (see docs/PAYMENTS.md).",
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
