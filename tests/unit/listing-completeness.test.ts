import { describe, expect, it } from "vitest";
import { listingCompleteness, slugify } from "@/services/properties";

describe("listingCompleteness", () => {
  it("reports 0% for an empty draft", () => {
    const result = listingCompleteness({});
    expect(result.percent).toBe(0);
    expect(result.missing).toContain("Description");
    expect(result.missing).toContain("Price");
  });

  it("reports 100% when every signal is present", () => {
    const result = listingCompleteness({
      description: "A spacious two-bedroom apartment close to the market.",
      rent_amount: 300,
      county: "Montserrado",
      city: "Monrovia",
      category: "apartment",
      advance_rent_amount: 300,
      availability_status: "available",
    });
    expect(result.percent).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  it("does not count a short, low-effort description as complete", () => {
    const result = listingCompleteness({ description: "nice" });
    expect(result.missing).toContain("Description");
  });
});

describe("slugify", () => {
  it("produces a url-safe, lowercase slug", () => {
    const slug = slugify("Cozy 2BR Apartment!", "Montserrado");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("cozy-2br-apartment");
    expect(slug).toContain("montserrado");
  });

  it("produces different slugs for the same title (random suffix avoids collisions)", () => {
    const a = slugify("Same Title", "Montserrado");
    const b = slugify("Same Title", "Montserrado");
    expect(a).not.toBe(b);
  });
});
