/**
 * Single source of truth for brand identity. Change it here, not by
 * hunting through the app.
 */
export const brand = {
  name: "231Rentals",
  tagline: "Your Next Place. Direct From the Owner.",
  supportingLine: "Less searching through agents. More direct connections.",
  heroHeading: "Your Next Place. Direct From the Owner.",
  heroSupportingCopy:
    "Find apartments, houses, rooms, and commercial spaces across Liberia. Browse for free and connect directly with property owners.",
  primaryCta: "Find a Property",
  secondaryCta: "List Your Property — Free",
  subscriptionHeading: "Your Next Place Is One Conversation Away.",
  subscriptionSupportingCopy:
    "Browse properties for free. Unlock direct messaging and contact multiple property owners with one affordable pass.",
  // Legal/business identity: placeholders only, pending real registration.
  legalEntityName: "231Rentals",
  supportEmail: "support@example-231rentals.test",
  supportPhone: "[SUPPORT PHONE — PENDING]",
  officeAddress: "[OFFICE ADDRESS — PENDING]",
} as const;

export const verificationBadges = {
  identity: "Identity Verified",
  property: "Property Documents Reviewed",
} as const;

export const subscriptionPlan = {
  name: "Direct Access Pass",
  priceUsd: 5,
  durationDays: 30,
} as const;

export const scoutProgram = {
  name: "Rental HunterZ",
} as const;
