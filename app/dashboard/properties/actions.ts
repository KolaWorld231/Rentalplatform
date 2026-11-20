"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { propertyFormSchema, vacancySchema, type PropertyFormInput } from "@/lib/validation/property";
import { slugify } from "@/services/properties";
import { firstFieldErrors } from "@/lib/auth/field-errors";
import type { ActionState } from "@/lib/auth/actions";
import type { AvailabilityStatus, ListingStatus } from "@/types/database";

function parseForm(formData: FormData) {
  return propertyFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    usageType: formData.get("usageType"),
    rentAmount: formData.get("rentAmount"),
    rentalFrequency: formData.get("rentalFrequency") || "monthly",
    county: formData.get("county"),
    city: formData.get("city"),
    community: formData.get("community"),
    landmark: formData.get("landmark"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    floorAreaSqm: formData.get("floorAreaSqm"),
    furnished: formData.get("furnished") ?? undefined,
    hasElectricity: formData.get("hasElectricity") ?? undefined,
    hasWater: formData.get("hasWater") ?? undefined,
    hasAirConditioning: formData.get("hasAirConditioning") ?? undefined,
    hasParking: formData.get("hasParking") ?? undefined,
    hasSecurity: formData.get("hasSecurity") ?? undefined,
    roadAccessible: formData.get("roadAccessible") ?? undefined,
    advanceRentAmount: formData.get("advanceRentAmount"),
    securityDepositAmount: formData.get("securityDepositAmount"),
    otherFeesAmount: formData.get("otherFeesAmount"),
    // These two are optional *strings*, so an absent field arrives as
    // null and is rejected, where an absent number is preprocessed away.
    // The checkbox keys above already guard this; these did not, which
    // only showed up once a form stopped rendering every field.
    otherFeesDescription: formData.get("otherFeesDescription") ?? undefined,
    leaseDurationMonths: formData.get("leaseDurationMonths"),
    moveInDate: formData.get("moveInDate") ?? undefined,
  });
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
    road_accessible: input.roadAccessible,
    advance_rent_amount: input.advanceRentAmount,
    security_deposit_amount: input.securityDepositAmount,
    other_fees_amount: input.otherFeesAmount,
    other_fees_description: input.otherFeesDescription || null,
    lease_duration_months: input.leaseDurationMonths,
    // move_in_date is deliberately absent. It is the vacancy date, and
    // setVacancyAction owns it. Writing it from here would mean saving
    // any unrelated field -- a typo in the description -- silently
    // erased the date the owner set on the availability switch.
  };
}

export async function createPropertyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: user.id,
      slug: slugify(parsed.data.title, parsed.data.county),
      ...toRow(parsed.data),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't create the listing. Please try again." };
  }

  redirect(`/dashboard/properties/${data.id}/edit?created=1`);
}

export async function updatePropertyAction(
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please check the highlighted fields." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("properties").update(toRow(parsed.data)).eq("id", propertyId);

  if (error) {
    return { error: "Couldn't save changes. Please try again." };
  }

  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  revalidatePath("/dashboard/properties");
  return {};
}

export async function setListingStatusAction(propertyId: string, status: ListingStatus) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("properties").update({ listing_status: status }).eq("id", propertyId);
  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}

export async function setAvailabilityAction(propertyId: string, status: AvailabilityStatus) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("properties").update({ availability_status: status }).eq("id", propertyId);
  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}

/**
 * The owner's vacancy switch, plus the date an occupied property frees
 * up. One action rather than two, because the status and the date are a
 * single decision -- setting them separately leaves a window where a
 * listing says "occupied" with a date that belongs to the previous
 * tenancy.
 *
 * Writes `move_in_date`, which is the same fact under its existing
 * name: the earliest date a renter can move in. Clearing the switch to
 * vacant also clears the date, so a property cannot be free now and
 * free later at the same time.
 *
 * Ownership is enforced by RLS (properties_update_owner), which is the
 * real boundary here -- this runs under the caller's own session, not
 * the service role, so a property that is not theirs matches no row.
 */
export async function setVacancyAction(
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = vacancySchema.safeParse({
    vacant: formData.get("vacant") === "on",
    vacantFrom: formData.get("vacantFrom") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const { vacant, vacantFrom } = parsed.data;
  const supabase = await createClient();
  // `.select()` matters: an update that matches no row -- the usual sign
  // of RLS refusing it -- comes back with error null and no indication
  // anything was skipped. Without this the action would report success
  // while the listing stayed exactly as it was.
  const { data: updated, error: updateError } = await supabase
    .from("properties")
    .update({
      availability_status: vacant ? "available" : "rented",
      move_in_date: vacant ? null : vacantFrom || null,
    })
    .eq("id", propertyId)
    .select("id");

  if (updateError) return { error: "Couldn't update availability. Please try again." };
  if (!updated || updated.length === 0) {
    return { error: "Couldn't update this listing. Please reload and try again." };
  }

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
  // No success flag: revalidation re-renders the switch in its new
  // position, which is the confirmation. ActionState carries failures.
  return {};
}

export async function deletePropertyImageAction(propertyId: string, imageId: string, storagePath: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.storage.from("property-images").remove([storagePath]);
  await supabase.from("property_images").delete().eq("id", imageId);
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}

export async function setCoverImageAction(propertyId: string, imageId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
  await supabase.from("property_images").update({ is_cover: true }).eq("id", imageId);
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}
