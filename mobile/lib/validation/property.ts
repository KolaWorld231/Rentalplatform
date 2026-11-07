// Hand-ported subset of ../../../lib/validation/property.ts -- same
// search-params rules, kept in sync by hand (see mobile/README.md).
import { z } from "zod";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "../database.types";

export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  county: z.enum(LIBERIA_COUNTIES).optional(),
  city: z.string().trim().max(80).optional(),
  category: z.enum(PROPERTY_CATEGORIES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
