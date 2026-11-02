import { BedDouble, Bath, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCategory, formatRelativeDate, formatRentalFrequency, formatUsd, isRecentlyPublished } from "@/lib/utils/format";
import type { PropertyWithCover } from "@/services/properties";
import { FavouriteButton } from "./FavouriteButton";
import { PropertyCardMedia } from "./PropertyCardMedia";

const AVAILABILITY_LABEL: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  available: { label: "Available", variant: "success" },
  pending_rental: { label: "Pending", variant: "warning" },
  rented: { label: "Rented", variant: "error" },
  temporarily_unavailable: { label: "Unavailable", variant: "warning" },
};

const NEW_LISTING_WINDOW_MS = 72 * 60 * 60 * 1000;

export function PropertyCard({
  property,
  isFavourited = false,
  isVerified = false,
}: {
  property: PropertyWithCover;
  isFavourited?: boolean;
  /** True when the owner's identity or this property's documents are verified (real DB-backed signal only). */
  isVerified?: boolean;
}) {
  const cover = property.property_images.find((img) => img.is_cover) ?? property.property_images[0];
  const orderedPaths = cover
    ? [cover, ...property.property_images.filter((img) => img.id !== cover.id)].map((img) => img.storage_path)
    : property.property_images.map((img) => img.storage_path);
  const availability = AVAILABILITY_LABEL[property.availability_status];
  const isNew = isRecentlyPublished(property.published_at, NEW_LISTING_WINDOW_MS);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-raised)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-floating)] active:translate-y-0 active:shadow-[var(--shadow-clay-inset)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={`/properties/${property.slug}`} className="focus-ring block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-sage-200">
          <PropertyCardMedia storagePaths={orderedPaths} alt={property.title} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant="neutral" className="bg-surface/90">
              {formatCategory(property.category)}
            </Badge>
            {isNew && (
              <Badge variant="clay" className="animate-pulse gap-1 bg-clay-500/90 text-ivory-50">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                New
              </Badge>
            )}
          </div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            {availability && (
              <Badge variant={availability.variant} className="bg-surface/90">
                {availability.label}
              </Badge>
            )}
            {isVerified && (
              <Badge variant="info" className="gap-1 bg-surface/90">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-3 bottom-[4.5rem]">
        <FavouriteButton propertyId={property.id} initialFavourited={isFavourited} />
      </div>

      <Link href={`/properties/${property.slug}`} className="focus-ring flex flex-1 flex-col gap-1.5 p-4">
        <p className="font-display text-lg font-semibold text-charcoal-700">
          {formatUsd(property.rent_amount)}{" "}
          <span className="text-sm font-normal text-charcoal-400">
            {formatRentalFrequency(property.rental_frequency)}
          </span>
        </p>
        <p className="line-clamp-1 text-sm font-medium text-charcoal-700">{property.title}</p>
        <p className="flex items-center gap-1 text-xs text-charcoal-400">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {[property.community, property.city, property.county].filter(Boolean).join(", ")}
        </p>
        {property.published_at && (
          <p className="text-xs text-charcoal-400">
            Listed {formatRelativeDate(property.published_at)}
          </p>
        )}
        {(property.bedrooms !== null || property.bathrooms !== null) && (
          <p className="mt-1 flex items-center gap-3 text-xs text-charcoal-500">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" aria-hidden="true" /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" aria-hidden="true" /> {property.bathrooms}
              </span>
            )}
          </p>
        )}
      </Link>
    </div>
  );
}
