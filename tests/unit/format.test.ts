import { describe, expect, it } from "vitest";
import { daysSince, formatCategory, formatRentalFrequency, formatUsd } from "@/lib/utils/format";

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
