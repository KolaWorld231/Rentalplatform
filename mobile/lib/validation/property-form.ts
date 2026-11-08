// Hand-ported subset of ../../../lib/validation/property.ts's
// propertyFormSchema -- same rules, kept in sync by hand (see
// mobile/README.md). Keeps the existing simple amenity booleans, no
// richer utility/amenity schema fields (see the mobile plan's explicit
// scope decision).
import { z } from "zod";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "../database.types";

// Fields are kept as number|null in form state (converted at the input's
// onChangeText, not here) so zodResolver can infer a concrete type --
// z.preprocess/.transform chains infer as `unknown` through the resolver.
const optionalNumber = z.number().nullable();

export const propertyFormSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000),
  category: z.enum(PROPERTY_CATEGORIES),
  usageType: z.enum(["residential", "commercial", "land"]),
  rentAmount: z.number().min(0),
  rentalFrequency: z.enum(["monthly", "quarterly", "yearly", "nightly"]),
  county: z.enum(LIBERIA_COUNTIES),
  city: z.string().trim().min(1).max(80),
  community: z.string().trim().max(80).optional().or(z.literal("")),
  landmark: z.string().trim().max(160).optional().or(z.literal("")),
  bedrooms: optionalNumber,
  bathrooms: optionalNumber,
  floorAreaSqm: optionalNumber,
  furnished: z.boolean(),
  hasElectricity: z.boolean(),
  hasWater: z.boolean(),
  hasAirConditioning: z.boolean(),
  hasParking: z.boolean(),
  hasSecurity: z.boolean(),
  advanceRentAmount: optionalNumber,
  securityDepositAmount: optionalNumber,
});
export type PropertyFormInput = z.infer<typeof propertyFormSchema>;
