import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPaymentProvider } from "@/lib/payments";
import { MockPaymentProvider } from "@/lib/payments/providers/mock";
import { MtnMomoProvider } from "@/lib/payments/providers/mtn-momo";

describe("getPaymentProvider", () => {
  const originalEnv = { ...process.env };

  function setNodeEnv(value: string) {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  beforeEach(() => {
    delete process.env.PAYMENTS_PROVIDER;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the mock provider outside production", () => {
    setNodeEnv("development");
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
  });

  it("returns the mock provider on a Vercel preview build, even though NODE_ENV is production", () => {
    setNodeEnv("production");
    process.env.VERCEL_ENV = "preview";
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
  });

  it("rejects the mock provider on a real Vercel production deployment", () => {
    setNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    expect(() => getPaymentProvider()).toThrow(/not allowed in production/);
  });

  it("rejects the mock provider on a non-Vercel production host (no VERCEL_ENV)", () => {
    setNodeEnv("production");
    expect(() => getPaymentProvider()).toThrow(/not allowed in production/);
  });

  it("returns the MTN MoMo provider regardless of environment", () => {
    process.env.PAYMENTS_PROVIDER = "mtn_momo";
    setNodeEnv("production");
    process.env.VERCEL_ENV = "production";
    expect(getPaymentProvider()).toBeInstanceOf(MtnMomoProvider);
  });
});
