import { describe, expect, it } from "vitest";
import { passkeySignupSchema, phoneNumberSchema, phoneSignupSchema, registerSchema } from "@/lib/validation/auth";
import { propertyFormSchema, searchParamsSchema } from "@/lib/validation/property";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      password: "supersecret",
      intent: "renter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      password: "short",
      intent: "renter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      displayName: "Jane Doe",
      email: "not-an-email",
      password: "supersecret",
      intent: "renter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an intent outside renter/owner", () => {
    const result = registerSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      password: "supersecret",
      intent: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("passkeySignupSchema", () => {
  it("accepts a valid passkey sign-up (no password field)", () => {
    const result = passkeySignupSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      intent: "owner",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = passkeySignupSchema.safeParse({
      displayName: "Jane Doe",
      email: "not-an-email",
      intent: "renter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid intent", () => {
    const result = passkeySignupSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      intent: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("phoneNumberSchema", () => {
  it("accepts a valid E.164 number", () => {
    expect(phoneNumberSchema.safeParse("+231770000000").success).toBe(true);
  });

  it("rejects a number without a country code", () => {
    expect(phoneNumberSchema.safeParse("0770000000").success).toBe(false);
  });

  it("rejects a non-numeric value", () => {
    expect(phoneNumberSchema.safeParse("+231abc0000").success).toBe(false);
  });
});

describe("phoneSignupSchema", () => {
  it("accepts a valid phone sign-up", () => {
    const result = phoneSignupSchema.safeParse({
      displayName: "Jane Doe",
      phone: "+231770000000",
      intent: "renter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    const result = phoneSignupSchema.safeParse({
      displayName: "Jane Doe",
      phone: "not-a-phone",
      intent: "renter",
    });
    expect(result.success).toBe(false);
  });
});

describe("propertyFormSchema", () => {
  it("accepts a minimal valid listing", () => {
    const result = propertyFormSchema.safeParse({
      title: "Cozy Apartment",
      category: "apartment",
      usageType: "residential",
      rentAmount: "300",
      county: "Montserrado",
      city: "Monrovia",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative rent amount", () => {
    const result = propertyFormSchema.safeParse({
      title: "Cozy Apartment",
      category: "apartment",
      usageType: "residential",
      rentAmount: "-50",
      county: "Montserrado",
      city: "Monrovia",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown county", () => {
    const result = propertyFormSchema.safeParse({
      title: "Cozy Apartment",
      category: "apartment",
      usageType: "residential",
      rentAmount: "300",
      county: "Not A Real County",
      city: "Monrovia",
    });
    expect(result.success).toBe(false);
  });

  it("treats empty optional numeric fields as null, not an error", () => {
    const result = propertyFormSchema.safeParse({
      title: "Cozy Apartment",
      category: "apartment",
      usageType: "residential",
      rentAmount: "300",
      county: "Montserrado",
      city: "Monrovia",
      bedrooms: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bedrooms).toBeNull();
    }
  });
});

describe("searchParamsSchema", () => {
  it("defaults sort to newest and page to 1", () => {
    const result = searchParamsSchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.page).toBe(1);
  });

  it("coerces string price params to numbers", () => {
    const result = searchParamsSchema.parse({ minPrice: "100", maxPrice: "500" });
    expect(result.minPrice).toBe(100);
    expect(result.maxPrice).toBe(500);
  });
});
