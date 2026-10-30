/**
 * Single source of truth for brand identity. "DomiLink" is a provisional
 * development name — it has not cleared trademark/domain/business-name
 * checks. Change it here, not by hunting through the app.
 */
export const brand = {
  name: "DomiLink",
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
  legalEntityName: "[COMPANY LEGAL NAME — PENDING REGISTRATION]",
  supportEmail: "support@example-domilink.test",
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
