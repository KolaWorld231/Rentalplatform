import "server-only";
import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./providers/mock";

export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENTS_PROVIDER ?? "mock";

  if (providerName === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PAYMENTS_PROVIDER=mock is not allowed in production — it can never activate a real subscription. Configure a real provider (see docs/PAYMENTS.md).",
      );
    }
    return new MockPaymentProvider();
  }

  throw new Error(
    `Unknown or unconfigured payment provider "${providerName}". No real provider is integrated yet — see docs/PAYMENTS.md for what's required to add one.`,
  );
}
