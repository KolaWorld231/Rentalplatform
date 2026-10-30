import { notFound } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { PropertyImageManager } from "@/components/forms/PropertyImageManager";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listingCompleteness, type PropertyWithImages } from "@/services/properties";
import { setAvailabilityAction, setListingStatusAction, updatePropertyAction } from "../../actions";
import { confirmAvailabilityAction } from "@/app/dashboard/verification/actions";
import { daysSince } from "@/lib/utils/format";

const STALE_AFTER_DAYS = 14;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: property } = (await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover, position)")
    .eq("id", id)
    .maybeSingle()) as { data: PropertyWithImages | null };

  if (!property || property.owner_id !== user.id) notFound();

  const completeness = listingCompleteness(property);
  const boundUpdate = updatePropertyAction.bind(null, id);
  const images = [...property.property_images].sort((a, b) => a.position - b.position);

  const daysSinceConfirmed = daysSince(property.last_availability_confirmed_at);
  const isStale = daysSinceConfirmed === null || daysSinceConfirmed >= STALE_AFTER_DAYS;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal-700">{property.title}</h1>
          <div className="mt-1 flex gap-2">
            <Badge variant={property.listing_status === "published" ? "success" : "neutral"}>
              {property.listing_status.replace("_", " ")}
            </Badge>
            <Badge variant="neutral">{completeness.percent}% complete</Badge>
          </div>
        </div>
        <Link href={`/properties/${property.slug}`} className="text-sm font-medium text-brand-700">
          View public listing
        </Link>
      </div>

      {completeness.missing.length > 0 && (
        <p className="mt-2 text-xs text-charcoal-400">Missing: {completeness.missing.join(", ")}</p>
      )}

      <section className="mt-6 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-raised)]">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Photos</h2>
        <div className="mt-4">
          <PropertyImageManager propertyId={property.id} images={images} />
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-raised)]">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Status</h2>

        {property.listing_status === "published" && isStale && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-warning-100 p-3">
            <p className="text-sm text-warning-500">
              {daysSinceConfirmed === null
                ? "Availability has never been confirmed."
                : `Availability hasn't been reconfirmed in ${daysSinceConfirmed} days.`}
            </p>
            <form action={async () => { "use server"; await confirmAvailabilityAction(id); }}>
              <Button type="submit" size="sm" variant="secondary">
                Reconfirm now
              </Button>
            </form>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {property.listing_status !== "published" && (
            <form action={async () => { "use server"; await setListingStatusAction(id, "published"); }}>
              <Button type="submit" variant="primary" size="sm">
                Publish listing
              </Button>
            </form>
          )}
          {property.listing_status === "published" && (
            <form action={async () => { "use server"; await setListingStatusAction(id, "draft"); }}>
              <Button type="submit" variant="secondary" size="sm">
                Unpublish
              </Button>
            </form>
          )}
          <form action={async () => { "use server"; await setAvailabilityAction(id, "rented"); }}>
            <Button type="submit" variant="secondary" size="sm">
              Mark as rented
            </Button>
          </form>
          <form action={async () => { "use server"; await setAvailabilityAction(id, "available"); }}>
            <Button type="submit" variant="secondary" size="sm">
              Mark as available
            </Button>
          </form>
          <form action={async () => { "use server"; await setListingStatusAction(id, "archived"); }}>
            <Button type="submit" variant="ghost" size="sm">
              Archive
            </Button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-raised)]">
        <h2 className="mb-4 font-display text-lg font-semibold text-charcoal-700">Edit details</h2>
        <PropertyForm action={boundUpdate} property={property} submitLabel="Save changes" />
      </section>
    </div>
  );
}
