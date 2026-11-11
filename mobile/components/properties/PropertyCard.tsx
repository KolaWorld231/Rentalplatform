import { Link } from "expo-router";
import { Pressable } from "react-native";
import { PropertyCardContent } from "./PropertyCardContent";
import type { PropertyWithCover } from "../../lib/properties/service";

export function PropertyCard({ property }: { property: PropertyWithCover }) {
  return (
    <Link href={`/property/${property.slug}`} asChild>
      {/* Shadow lives on this outer layer (unclipped); overflow-hidden
          lives inside PropertyCardContent -- combining the two on one
          view clips the shadow on iOS. */}
      <Pressable className="rounded-lg shadow-raised active:shadow-subtle">
        <PropertyCardContent property={property} />
      </Pressable>
    </Link>
  );
}
