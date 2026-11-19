import { describe, expect, it } from "vitest";
import { checkEventAmount } from "@/lib/payments/service";

const LEDGER = { amount: 5, currency: "USD" };

describe("checkEventAmount", () => {
  it("accepts an event that matches the ledger exactly", () => {
    expect(checkEventAmount(LEDGER, { amountUsd: 5, currency: "USD" }, true)).toBe("ok");
  });

  it("rejects a short payment in the same currency", () => {
    expect(checkEventAmount(LEDGER, { amountUsd: 1, currency: "USD" }, true)).toBe("mismatch");
  });

  /**
   * The regression this function exists for. The previous expression was
   *   amount !== event.amount && transaction.currency === event.currency
   * which reads as "flag a mismatch" but behaves as "skip the check
   * whenever the currencies differ": 1 EUR against $5 USD evaluated to
   * `true && false`, reported no mismatch, and activated the pass.
   */
  it("rejects a short payment in a different currency, rather than skipping the check", () => {
    expect(checkEventAmount(LEDGER, { amountUsd: 1, currency: "EUR" }, true)).toBe("mismatch");
  });

  it("rejects a matching number in the wrong currency", () => {
    expect(checkEventAmount(LEDGER, { amountUsd: 5, currency: "EUR" }, true)).toBe("mismatch");
  });

  it("reports not-comparable for a provider that settles in another currency", () => {
    // MTN echoes its own settlement currency against a USD ledger, so the
    // comparison is meaningless -- but it is now an explicit, per-provider
    // exemption rather than any currency difference silently bypassing it.
    expect(checkEventAmount(LEDGER, { amountUsd: 1, currency: "EUR" }, false)).toBe("not-comparable");
  });

  it("does not let a comparable provider inherit that exemption", () => {
    expect(checkEventAmount(LEDGER, { amountUsd: 0, currency: "XOF" }, true)).toBe("mismatch");
  });
});
