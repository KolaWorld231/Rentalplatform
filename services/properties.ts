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
  // "city" doubles as a general location filter: a renter searching for a
  // community/neighbourhood name (e.g. "Sinkor") expects that to match,
  // not just the city column -- community is the more specific of the
  // two, and many listings' city is just "Monrovia" for every community.
  if (params.city) query = query.or(`city.ilike.%${params.city}%,community.ilike.%${params.city}%`);
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

/**
 * Resolves the verified badge for a whole listing grid in two requests,
 * rather than two per property. A property shows the badge when either
 * its owner's identity or the property itself has been verified.
 *
 * The underlying tables are RLS-restricted, so this goes through the
 * security-definer batch functions added in
 * 20261117000100_batch_verification_lookups.sql.
 */
export async function verifiedFlagsFor(
  supabase: SupabaseClient<Database>,
  properties: Pick<Property, "id" | "owner_id">[],
): Promise<boolean[]> {
  if (properties.length === 0) return [];

  const ownerIds = [...new Set(properties.map((p) => p.owner_id))];
  const propertyIds = properties.map((p) => p.id);

  const [{ data: verifiedOwners }, { data: verifiedProperties }] = await Promise.all([
    supabase.rpc("verified_owner_ids", { target_owners: ownerIds }),
    supabase.rpc("verified_property_ids", { target_properties: propertyIds }),
  ]);

  const owners = new Set<string>(verifiedOwners ?? []);
  const props = new Set<string>(verifiedProperties ?? []);

  return properties.map((p) => owners.has(p.owner_id) || props.has(p.id));
}

/**
 * Photos were not among the checks, so a listing with no images at all
 * reported 100% complete -- the product told owners they were finished
 * while their listing showed "No photo yet" to every renter. Every
 * listing currently on the site is in exactly that state.
 *
 * It is counted like any other signal rather than being weighted
 * specially; what matters is that a photo-less listing can no longer
 * claim to be done.
 */
export function listingCompleteness(
  property: Partial<Property> & { property_images?: unknown[] },
): {
  percent: number;
  missing: string[];
} {
  const checks: { label: string; done: boolean }[] = [
    { label: "Photos", done: (property.property_images?.length ?? 0) > 0 },
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

/**
 * Builds the homepage's collection rows from real listings.
 *
 * Two rules decide what appears, both there to stop the page from
 * advertising depth it does not have:
 *
 *  - A row needs MIN_ROW_ITEMS listings or it is not built at all. A
 *    carousel holding one card is not a collection; it is the same
 *    listing shown again under a different heading, and with the
 *    current inventory almost every category-based row would be exactly
 *    that.
 *  - A listing appears in at most one themed row, so three rows cannot
 *    turn out to be the same properties three times.
 *
 * As inventory grows, rows appear on their own. Nothing here invents a
 * category to fill space.
 */
export const MIN_ROW_ITEMS = 3;

export type Collection = {
  key: string;
  title: string;
  subtitle?: string;
  viewAllHref: string;
  properties: PropertyWithCover[];
};

export function buildCollections(
  all: PropertyWithCover[],
  /** Ids already on screen (the "Recently listed" row). A themed row has
   *  to contribute listings the visitor has not just scrolled past, or it
   *  is padding: with a small catalogue it would otherwise show the same
   *  four properties again under a place name. */
  alreadyShown: Iterable<string> = [],
): Collection[] {
  const collections: Collection[] = [];
  const used = new Set<string>(alreadyShown);

  const take = (
    key: string,
    title: string,
    viewAllHref: string,
    predicate: (p: PropertyWithCover) => boolean,
    subtitle?: string,
  ) => {
    const fresh = all.filter((p) => !used.has(p.id) && predicate(p));
    if (fresh.length < MIN_ROW_ITEMS) return;
    fresh.forEach((p) => used.add(p.id));
    // The row itself shows every match, so it reads as a real collection
    // rather than a remainder -- the threshold is about whether the row
    // earns its place, not about hiding listings from it.
    const items = all.filter(predicate);
    collections.push({ key, title, subtitle, viewAllHref, properties: items });
  };

  const byCount = <T extends string>(values: (T | null)[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((acc, v) => {
        if (v) acc[v] = (acc[v] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);

  for (const [city] of byCount(all.map((p) => p.city))) {
    take(`city-${city}`, `Places to rent in ${city}`, `/search?city=${encodeURIComponent(city)}`, (p) => p.city === city);
  }

  for (const [county] of byCount(all.map((p) => p.county))) {
    take(
      `county-${county}`,
      `Across ${county} County`,
      `/search?county=${encodeURIComponent(county)}`,
      (p) => p.county === county,
    );
  }

  take("furnished", "Move in furnished", "/search?furnished=true", (p) => p.furnished === true);

  return collections;
}
