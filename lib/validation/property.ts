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

const SEARCH_FILTER_KEYS = ["q", "county", "city", "category", "minPrice", "maxPrice", "bedrooms", "furnished"] as const;

/** The filter-only (no page/sort) subset of a parsed search, as a query
 * string -- carried from /search result cards into a property's detail
 * page link so "More from your search" there can reuse the same filters. */
export function searchFilterQueryString(params: SearchParamsInput): string {
  const query = new URLSearchParams();
  for (const key of SEARCH_FILTER_KEYS) {
    const value = params[key];
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

/** True when `params` reflects an actual applied search (not just page/sort
 * defaults) -- used to decide whether a property detail page should show
 * "More from your search" instead of generic category/county similarity. */
export function hasActiveSearchFilters(params: SearchParamsInput): boolean {
  return SEARCH_FILTER_KEYS.some((key) => params[key] !== undefined && params[key] !== "");
}

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

/**
 * The owner's vacancy control.
 *
 * `vacantFrom` is only meaningful while a property is occupied -- it is
 * the date it frees up. It is rejected rather than ignored when the
 * property is marked vacant, because silently dropping a date an owner
 * deliberately entered is how a listing ends up saying something its
 * owner did not intend.
 */
export const vacancySchema = z
  .object({
    vacant: z.boolean(),
    vacantFrom: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD.")
      .optional()
      .or(z.literal("")),
  })
  .refine((v) => !(v.vacant && v.vacantFrom), {
    path: ["vacantFrom"],
    message: "A vacant property does not need a vacant-from date.",
  })
  .refine(
    (v) => {
      if (!v.vacantFrom) return true;
      const [y, m, d] = v.vacantFrom.split("-").map(Number);
      const picked = new Date(y, m - 1, d);
      const today = new Date();
      return picked.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    },
    { path: ["vacantFrom"], message: "Pick today or a future date." },
  );

export type VacancyInput = z.infer<typeof vacancySchema>;
