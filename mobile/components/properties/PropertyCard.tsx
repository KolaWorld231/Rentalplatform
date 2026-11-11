import { Link } from "expo-router";
import { Pressable } from "react-native";
import { PropertyCardContent } from "./PropertyCardContent";
import { formatRentalFrequency, formatUsd } from "../../lib/format";
import type { PropertyWithCover } from "../../lib/properties/service";

export function PropertyCard({ property }: { property: PropertyWithCover }) {
  return (
    <Link href={`/property/${property.slug}`} asChild>
      {/* Shadow lives on this outer layer (unclipped); overflow-hidden
          lives inside PropertyCardContent -- combining the two on one
          view clips the shadow on iOS. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${property.title}, ${formatUsd(property.rent_amount)} ${formatRentalFrequency(property.rental_frequency)}`}
        className="rounded-lg shadow-raised active:shadow-subtle"
      >
        <PropertyCardContent property={property} />
      </Pressable>
    </Link>
  );
}
