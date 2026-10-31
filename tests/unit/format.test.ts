import { describe, expect, it } from "vitest";
import { daysSince, formatCategory, formatExpiryDate, formatRentalFrequency, formatUsd } from "@/lib/utils/format";

describe("formatUsd", () => {
  it("formats whole dollar amounts with no decimals", () => {
    expect(formatUsd(5)).toBe("$5");
    expect(formatUsd(350)).toBe("$350");
  });

  it("rounds fractional amounts", () => {
    expect(formatUsd(349.6)).toBe("$350");
  });
});

describe("formatRentalFrequency", () => {
  it("maps known frequencies", () => {
    expect(formatRentalFrequency("monthly")).toBe("/ month");
    expect(formatRentalFrequency("nightly")).toBe("/ night");
  });

  it("returns empty string for an unknown frequency", () => {
    expect(formatRentalFrequency("biweekly")).toBe("");
  });
});

describe("formatCategory", () => {
  it("title-cases underscore-separated categories", () => {
    expect(formatCategory("shared_room")).toBe("Shared Room");
    expect(formatCategory("apartment")).toBe("Apartment");
  });
});

describe("daysSince", () => {
  it("returns null for a null input", () => {
    expect(daysSince(null)).toBeNull();
  });

  it("returns 0 for a timestamp from right now", () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });

  it("returns the correct day count for a known past date", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(daysSince(tenDaysAgo)).toBe(10);
  });
});

describe("formatExpiryDate", () => {
  // Regression test: found live against a real Supabase project, where a
  // freshly-activated 30-day subscription's expiry displayed as "Today"
  // because the UI was reusing formatRelativeDate (built for elapsed
  // time) on a future date instead of this function.
  it("does not report a ~30-day-future expiry as today", () => {
    const thirtyDaysOut = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const result = formatExpiryDate(thirtyDaysOut);
    expect(result).not.toBe("today");
  });

  it("reports an already-passed date as today", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(formatExpiryDate(yesterday)).toBe("today");
  });

  it("reports tomorrow correctly", () => {
    const in23Hours = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    expect(formatExpiryDate(in23Hours)).toBe("tomorrow");
  });

  it("reports a near-future date in days", () => {
    const fiveDaysOut = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(formatExpiryDate(fiveDaysOut)).toBe("in 5 days");
  });
});
