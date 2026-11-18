import { describe, expect, it } from "vitest";
import { listingCompleteness, slugify } from "@/services/properties";

describe("listingCompleteness", () => {
  it("reports 0% for an empty draft", () => {
    const result = listingCompleteness({});
    expect(result.percent).toBe(0);
    expect(result.missing).toContain("Description");
    expect(result.missing).toContain("Price");
    expect(result.missing).toContain("Photos");
  });

  const COMPLETE = {
    property_images: [{ id: "img-1" }],
    description: "A spacious two-bedroom apartment close to the market.",
    rent_amount: 300,
    county: "Montserrado" as const,
    city: "Monrovia",
    category: "apartment" as const,
    advance_rent_amount: 300,
    availability_status: "available" as const,
  };

  it("reports 100% when every signal is present", () => {
    const result = listingCompleteness(COMPLETE);
    expect(result.percent).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  // Regression: this previously returned 100%, so the product told owners a
  // listing with no photos was finished. Every listing on the site is in
  // that state.
  it("is never complete without photos, however good the rest is", () => {
    const result = listingCompleteness({ ...COMPLETE, property_images: [] });
    expect(result.missing).toContain("Photos");
    expect(result.percent).toBeLessThan(100);
  });

  it("treats a missing property_images key the same as none", () => {
    const withoutKey: Partial<typeof COMPLETE> = { ...COMPLETE };
    delete withoutKey.property_images;
    expect(listingCompleteness(withoutKey).missing).toContain("Photos");
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
