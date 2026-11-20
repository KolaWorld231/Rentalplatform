import { BedDouble, Bath, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCategory, formatRelativeDate, formatRentalFrequency, formatUsd, isRecentlyPublished } from "@/lib/utils/format";
import type { PropertyWithCover } from "@/services/properties";
import { AvailabilityMarker } from "./AvailabilityMarker";
import { FavouriteButton } from "./FavouriteButton";
import { PropertyCardMedia } from "./PropertyCardMedia";

const NEW_LISTING_WINDOW_MS = 72 * 60 * 60 * 1000;

export function PropertyCard({
  property,
  isFavourited = false,
  isVerified = false,
  searchQuery,
}: {
  property: PropertyWithCover;
  isFavourited?: boolean;
  /** True when the owner's identity or this property's documents are verified (real DB-backed signal only). */
  isVerified?: boolean;
  /** The current /search query string (e.g. "county=Montserrado&city=Sinkor"),
   * carried into the detail page link so "More from your search" there can
   * reuse the same filters instead of falling back to generic similarity. */
  searchQuery?: string;
}) {
  const cover = property.property_images.find((img) => img.is_cover) ?? property.property_images[0];
  const orderedPaths = cover
    ? [cover, ...property.property_images.filter((img) => img.id !== cover.id)].map((img) => img.storage_path)
    : property.property_images.map((img) => img.storage_path);
  const isNew = isRecentlyPublished(property.published_at, NEW_LISTING_WINDOW_MS);
  const href = `/properties/${property.slug}${searchQuery ? `?${searchQuery}` : ""}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface-raised shadow-[var(--shadow-raised)] transition-[transform,box-shadow] duration-[var(--motion-base)] ease-standard hover:-translate-y-1 hover:shadow-[var(--shadow-floating)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        <PropertyCardMedia storagePaths={orderedPaths} alt={property.title} />

        {/*
          Only exception-state and trust signals sit on the photo now.
          Category moved into the text block below: it is useful detail,
          not an alert, and on the image it competed with the two things
          a renter actually scans for.
        */}
        {(isNew || property.is_showcase) && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 pr-14">
            {/*
              Sits on the photo, first, and is the one badge that
              overrides the "exception states only" rule for this
              corner. A placeholder listing carries a stock photograph,
              and a stock photograph of a building reads as a photograph
              of *this* building unless something on the image says
              otherwise. Disclosure on the owner's profile does not
              reach someone scanning a grid.
            */}
            {property.is_showcase && (
              <Badge variant="neutral" className="bg-surface-overlay/90">
                Showcase listing
              </Badge>
            )}
            {isNew && (
              <Badge variant="clay" className="gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                New
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {/*
          Price is the first thing anyone compares, so it carries the
          accent and the largest step on the card. It was previously the
          same weight and colour as the title.
        */}
        <p className="font-display text-xl font-semibold text-accent-text">
          {formatUsd(property.rent_amount)}{" "}
          <span className="text-sm font-normal text-charcoal-400">
            {formatRentalFrequency(property.rental_frequency)}
          </span>
        </p>

        {/*
          The stretched link makes the whole card one click target and,
          more importantly, ONE tab stop. The card previously held two
          separate links to the same href, so keyboard and screen-reader
          users traversed every listing twice.
        */}
        <h3 className="line-clamp-1 text-sm font-medium text-charcoal-700">
          <Link href={href} className="focus-ring before:absolute before:inset-0 before:rounded-[var(--radius-lg)]">
            {property.title}
          </Link>
        </h3>

        {/*
          Verification moved off the photo and next to the listing's own
          details. It is a claim about this owner's paperwork, so it
          belongs with the facts, not floating over the picture where it
          read as decoration.
        */}
        {isVerified && (
          <Badge variant="info" className="w-fit gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Verified
          </Badge>
        )}

        <p className="flex items-center gap-1 text-xs text-charcoal-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {[property.community, property.city, property.county].filter(Boolean).join(", ")}
          </span>
        </p>

        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-charcoal-500">
          <AvailabilityMarker
            status={property.availability_status}
            vacantFrom={property.move_in_date}
          />
          <span>{formatCategory(property.category)}</span>
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
          {property.published_at && (
            <span className="text-charcoal-400">Listed {formatRelativeDate(property.published_at)}</span>
          )}
        </p>
      </div>

      {/*
        Sits above the stretched link's pseudo-element so it stays
        clickable, and stays visible at rest: saving is a primary action
        here, and a control that only appears on hover is unreachable by
        touch and undiscoverable by everyone else.
      */}
      <div className="absolute right-3 top-3 z-10">
        <FavouriteButton propertyId={property.id} initialFavourited={isFavourited} />
      </div>
    </div>
  );
}
