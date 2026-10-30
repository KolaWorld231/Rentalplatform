import { z } from "zod";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "@/types/database";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().optional(),
).transform((v) => v ?? null);

const optionalBooleanCheckbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false")])
  .optional()
  .transform((v) => (v === "on" || v === "true" ? true : v === "false" ? false : null));

export const propertyFormSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).default(""),
  category: z.enum(PROPERTY_CATEGORIES),
  usageType: z.enum(["residential", "commercial", "land"]),
  rentAmount: z.coerce.number().min(0),
  rentalFrequency: z.enum(["monthly", "quarterly", "yearly", "nightly"]).default("monthly"),
  county: z.enum(LIBERIA_COUNTIES),
  city: z.string().trim().min(1).max(80),
  community: z.string().trim().max(80).optional().or(z.literal("")),
  landmark: z.string().trim().max(160).optional().or(z.literal("")),
  bedrooms: optionalNumber,
  bathrooms: optionalNumber,
  floorAreaSqm: optionalNumber,
  furnished: optionalBooleanCheckbox,
  hasElectricity: optionalBooleanCheckbox,
  hasWater: optionalBooleanCheckbox,
  hasAirConditioning: optionalBooleanCheckbox,
  hasParking: optionalBooleanCheckbox,
  hasSecurity: optionalBooleanCheckbox,
  roadAccessible: optionalBooleanCheckbox,
  advanceRentAmount: optionalNumber,
  securityDepositAmount: optionalNumber,
  otherFeesAmount: optionalNumber,
  otherFeesDescription: z.string().trim().max(500).optional().or(z.literal("")),
  leaseDurationMonths: optionalNumber,
  moveInDate: z.string().trim().optional().or(z.literal("")),
});
export type PropertyFormInput = z.infer<typeof propertyFormSchema>;

export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  county: z.enum(LIBERIA_COUNTIES).optional(),
  city: z.string().trim().max(80).optional(),
  category: z.enum(PROPERTY_CATEGORIES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  furnished: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

export const reportPropertySchema = z.object({
  reason: z.enum([
    "fake_listing",
    "misleading_price",
    "already_rented",
    "unauthorized_representative",
    "impersonation",
    "harassment",
    "fraudulent_payment_request",
    "suspicious_message",
    "other",
  ]),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});
