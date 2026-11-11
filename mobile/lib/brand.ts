// Hand-ported subset of ../../lib/config/brand.ts -- kept in sync by
// hand (see mobile/README.md).
export const brand = {
  name: "231Rentals",
  tagline: "Your Next Place. Direct From the Owner.",
  colors: {
    splash: "#da1a32",
    onSplash: "#ffffff",
  },
} as const;

export const subscriptionPlan = {
  name: "Direct Access Pass",
  priceUsd: 5,
  durationDays: 30,
} as const;

export const scoutProgram = {
  name: "Rental HunterZ",
} as const;
