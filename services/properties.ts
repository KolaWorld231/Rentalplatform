import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Property, PropertyImage } from "@/types/database";
import type { SearchParamsInput } from "@/lib/validation/property";

const PAGE_SIZE = 12;

export type PropertyWithCover = Property & {
  property_images: Pick<PropertyImage, "id" | "storage_path" | "is_cover">[];
};

/**
 * supabase-js can't statically infer the shape of embedded-resource
 * selects (e.g. `.select("*, property_images(...)")`) without generated
 * Relationships metadata from a live database, which this project doesn't
 * have access to (see docs/ARCHITECTURE.md). Call sites cast query results
 * to this type instead of fighting that inference — the real authorization
 * and correctness guarantee is RLS + the migration, not the TS type.
 */
export type PropertyWithImages = Property & { property_images: PropertyImage[] };

export interface SearchResult {
  properties: PropertyWithCover[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Builds and runs the published-listing search query. Every filter maps
 * directly to an indexed column (see properties_search_idx /
 * properties_city_idx / properties_fts_idx in the M3 migration) so this
 * stays fast without an external search service.
 */
export async function searchProperties(
  supabase: SupabaseClient<Database>,
  params: SearchParamsInput,
): Promise<SearchResult> {
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)", { count: "exact" })
    .eq("listing_status", "published");

  if (params.q) {
    query = query.textSearch("title", params.q, { type: "websearch", config: "english" });
  }
  if (params.county) query = query.eq("county", params.county);
  if (params.city) query = query.ilike("city", `%${params.city}%`);
  if (params.category) query = query.eq("category", params.category);
  if (params.minPrice !== undefined) query = query.gte("rent_amount", params.minPrice);
  if (params.maxPrice !== undefined) query = query.lte("rent_amount", params.maxPrice);
  if (params.bedrooms !== undefined) query = query.gte("bedrooms", params.bedrooms);
  if (params.furnished !== undefined) query = query.eq("furnished", params.furnished);

  switch (params.sort) {
    case "price_asc":
      query = query.order("rent_amount", { ascending: true });
      break;
    case "price_desc":
      query = query.order("rent_amount", { ascending: false });
      break;
    default:
      query = query.order("published_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  return {
    properties: (data ?? []) as unknown as PropertyWithCover[],
    total: count ?? 0,
    page: params.page,
    pageSize: PAGE_SIZE,
  };
}

export async function getSimilarProperties(
  supabase: SupabaseClient<Database>,
  property: Pick<Property, "id" | "county" | "category">,
  limit = 4,
) {
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)")
    .eq("listing_status", "published")
    .eq("county", property.county)
    .eq("category", property.category)
    .neq("id", property.id)
    .limit(limit);

  return (data ?? []) as unknown as PropertyWithCover[];
}

export function slugify(title: string, county: string): string {
  const base = `${title}-${county}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`.slice(0, 100);
}

/**
 * Records a property view, deduplicated to one counted view per
 * viewer/property/day. The uniqueness check happens here (application
 * layer) rather than as a DB constraint — see the M3 migration's comment
 * on why a timezone-aware "same day" unique index isn't straightforward in
 * plain Postgres.
 */
export async function recordPropertyView(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  viewer: { userId?: string; fingerprint?: string },
) {
  if (!viewer.userId && !viewer.fingerprint) return;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  let existing = supabase
    .from("property_views")
    .select("id")
    .eq("property_id", propertyId)
    .gte("viewed_at", startOfDay.toISOString())
    .limit(1);

  existing = viewer.userId
    ? existing.eq("viewer_id", viewer.userId)
    : existing.eq("viewer_fingerprint", viewer.fingerprint!);

  const { data } = await existing;
  if (data && data.length > 0) return;

  await supabase.from("property_views").insert({
    property_id: propertyId,
    viewer_id: viewer.userId ?? null,
    viewer_fingerprint: viewer.userId ? null : (viewer.fingerprint ?? null),
  });
}

export function listingCompleteness(property: Partial<Property>): {
  percent: number;
  missing: string[];
} {
  const checks: { label: string; done: boolean }[] = [
    { label: "Description", done: !!property.description && property.description.length > 20 },
    { label: "Price", done: !!property.rent_amount && property.rent_amount > 0 },
    { label: "Location", done: !!property.county && !!property.city },
    { label: "Property type", done: !!property.category },
    { label: "Rental terms", done: !!property.advance_rent_amount || !!property.security_deposit_amount },
    { label: "Availability", done: !!property.availability_status },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}
