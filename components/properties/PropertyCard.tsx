import { BedDouble, Bath, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { formatCategory, formatRentalFrequency, formatUsd } from "@/lib/utils/format";
import type { PropertyWithCover } from "@/services/properties";
import { FavouriteButton } from "./FavouriteButton";

const AVAILABILITY_LABEL: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  available: { label: "Available", variant: "success" },
  pending_rental: { label: "Pending", variant: "warning" },
  rented: { label: "Rented", variant: "error" },
  temporarily_unavailable: { label: "Unavailable", variant: "warning" },
};

export function PropertyCard({
  property,
  isFavourited = false,
}: {
  property: PropertyWithCover;
  isFavourited?: boolean;
}) {
  const cover = property.property_images.find((img) => img.is_cover) ?? property.property_images[0];
  const availability = AVAILABILITY_LABEL[property.availability_status];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-raised)] transition-shadow hover:shadow-[var(--shadow-floating)]">
      <Link href={`/properties/${property.slug}`} className="focus-ring block">
        <div className="relative aspect-[4/3] w-full bg-sage-200">
          {cover ? (
            <Image
              src={propertyImageUrl(cover.storage_path)}
              alt={property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-charcoal-400">
              No photo yet
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="neutral" className="bg-surface/90">
              {formatCategory(property.category)}
            </Badge>
          </div>
          {availability && (
            <div className="absolute right-3 top-3">
              <Badge variant={availability.variant} className="bg-surface/90">
                {availability.label}
              </Badge>
            </div>
          )}
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
