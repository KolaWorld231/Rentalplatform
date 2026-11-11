// Hand-ported from ../../../services/properties.ts -- same query shapes
// and RLS-backed authorization boundary, kept in sync by hand (see
// mobile/README.md). Mobile has no Next.js Server Action layer, so these
// are called directly from screens -- RLS is the enforcement boundary
// either way, per CLAUDE.md rule #7.
import { supabase } from "../supabase";
import type { Property, PropertyImage } from "../database.types";
import type { SearchParamsInput } from "../validation/property";

const PAGE_SIZE = 12;

export type PropertyWithCover = Property & {
  property_images: Pick<PropertyImage, "id" | "storage_path" | "is_cover">[];
};

export interface SearchResult {
  properties: PropertyWithCover[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchProperties(params: SearchParamsInput): Promise<SearchResult> {
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)", { count: "exact" })
    .eq("listing_status", "published");

  if (params.q) query = query.textSearch("title", params.q, { type: "websearch", config: "english" });
  if (params.county) query = query.eq("county", params.county);
  if (params.city) query = query.or(`city.ilike.%${params.city}%,community.ilike.%${params.city}%`);
  if (params.category) query = query.eq("category", params.category);
  if (params.minPrice !== undefined) query = query.gte("rent_amount", params.minPrice);
  if (params.maxPrice !== undefined) query = query.lte("rent_amount", params.maxPrice);
  if (params.bedrooms !== undefined) query = query.gte("bedrooms", params.bedrooms);

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

export async function getRecentlyListed(limit = 6): Promise<PropertyWithCover[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)")
    .eq("listing_status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PropertyWithCover[];
}

export async function getPropertyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover, position)")
    .eq("slug", slug)
    .eq("listing_status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (Property & { property_images: PropertyImage[] }) | null;
}

export async function getSimilarProperties(
  property: Pick<Property, "id" | "county" | "category">,
  limit = 4,
): Promise<PropertyWithCover[]> {
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

export async function getFavouritedPropertyIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from("property_favourites").select("property_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.property_id));
}

export async function getFavouritedProperties(userId: string): Promise<PropertyWithCover[]> {
  const { data, error } = await supabase
    .from("property_favourites")
    .select("properties(*, property_images(id, storage_path, is_cover))")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as unknown as { properties: PropertyWithCover }[])
    .map((row) => row.properties)
    .filter(Boolean);
}

// Add-only -- unlike toggleFavourite, this never deletes a row. Used by the
// swipe deck (and safe for any other "add to picks" affordance) where the
// caller doesn't know/care whether the property is already a Pick and must
// never accidentally un-pick it.
export async function addFavourite(userId: string, propertyId: string): Promise<{ favourited: true } | { error: string }> {
  const { error } = await supabase
    .from("property_favourites")
    .upsert({ user_id: userId, property_id: propertyId }, { onConflict: "user_id,property_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't save this property." };
  return { favourited: true };
}

export async function toggleFavourite(userId: string, propertyId: string): Promise<{ favourited: boolean } | { error: string }> {
  const { data: existing } = await supabase
    .from("property_favourites")
    .select("property_id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("property_favourites").delete().eq("user_id", userId).eq("property_id", propertyId);
    if (error) return { error: "Couldn't update favourites." };
    return { favourited: false };
  }

  const { error } = await supabase.from("property_favourites").insert({ user_id: userId, property_id: propertyId });
  if (error) return { error: "Couldn't update favourites." };
  return { favourited: true };
}
