// Hand-ported from ../../../app/dashboard/properties/actions.ts and
// ../../../services/properties.ts's slugify -- same RLS-enforced
// owner-scoped writes (properties_insert_owner requires has_role('owner'),
// properties_update_owner/property_images_write_owner scope to
// owner_id/manager_id = auth.uid()), kept in sync by hand (see
// mobile/README.md).
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";
import type { AvailabilityStatus, ListingStatus, Property, PropertyImage } from "../database.types";
import type { PropertyFormInput } from "../validation/property-form";

export function slugify(title: string, county: string): string {
  const base = `${title}-${county}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`.slice(0, 100);
}

function toRow(input: PropertyFormInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    usage_type: input.usageType,
    rent_amount: input.rentAmount,
    rental_frequency: input.rentalFrequency,
    county: input.county,
    city: input.city,
    community: input.community || null,
    landmark: input.landmark || null,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    floor_area_sqm: input.floorAreaSqm,
    furnished: input.furnished,
    has_electricity: input.hasElectricity,
    has_water: input.hasWater,
    has_air_conditioning: input.hasAirConditioning,
    has_parking: input.hasParking,
    has_security: input.hasSecurity,
    advance_rent_amount: input.advanceRentAmount,
    security_deposit_amount: input.securityDepositAmount,
  };
}

export async function getMyProperties(ownerId: string): Promise<Property[]> {
  const { data } = await supabase.from("properties").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyProperty(id: string): Promise<(Property & { property_images: PropertyImage[] }) | null> {
  const { data } = await supabase.from("properties").select("*, property_images(*)").eq("id", id).maybeSingle();
  return data as unknown as (Property & { property_images: PropertyImage[] }) | null;
}

export async function createProperty(ownerId: string, input: PropertyFormInput): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ owner_id: ownerId, slug: slugify(input.title, input.county), ...toRow(input) })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't create the listing. You may need owner access first." };
  return { id: data.id };
}

export async function updateProperty(propertyId: string, input: PropertyFormInput): Promise<{ error?: string }> {
  const { error } = await supabase.from("properties").update(toRow(input)).eq("id", propertyId);
  return error ? { error: "Couldn't save changes." } : {};
}

export async function setListingStatus(propertyId: string, status: ListingStatus) {
  await supabase.from("properties").update({ listing_status: status }).eq("id", propertyId);
}

export async function setAvailability(propertyId: string, status: AvailabilityStatus) {
  await supabase.from("properties").update({ availability_status: status }).eq("id", propertyId);
}

export async function confirmAvailability(propertyId: string) {
  await supabase.from("properties").update({ last_availability_confirmed_at: new Date().toISOString() }).eq("id", propertyId);
}

export async function uploadPropertyPhoto(propertyId: string, uri: string): Promise<{ error?: string }> {
  const FileSystem = await import("expo-file-system/legacy");
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const arrayBuffer = decode(base64);
  const ext = uri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `${propertyId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("property-images").upload(path, arrayBuffer, { contentType });
  if (uploadError) return { error: "Couldn't upload the photo." };

  const { count } = await supabase.from("property_images").select("id", { count: "exact", head: true }).eq("property_id", propertyId);
  const { error: insertError } = await supabase
    .from("property_images")
    .insert({ property_id: propertyId, storage_path: path, position: count ?? 0, is_cover: (count ?? 0) === 0 });
  if (insertError) return { error: "Uploaded, but couldn't record the photo." };
  return {};
}

export async function deletePropertyPhoto(propertyId: string, imageId: string, storagePath: string) {
  await supabase.storage.from("property-images").remove([storagePath]);
  await supabase.from("property_images").delete().eq("id", imageId);
}

export async function setCoverPhoto(propertyId: string, imageId: string) {
  await supabase.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
  await supabase.from("property_images").update({ is_cover: true }).eq("id", imageId);
}

export async function becomeOwner(): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("grant_owner_role_to_self");
  return error ? { error: error.message } : {};
}
