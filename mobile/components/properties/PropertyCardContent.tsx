import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import { formatCategory, formatRentalFrequency, formatUsd, isRecentlyPublished } from "../../lib/format";
import { propertyImageUrl } from "../../lib/storage";
import type { PropertyWithCover } from "../../lib/properties/service";

/**
 * `available` is deliberately absent, matching the web card: it is the
 * default state of a live listing, so badging it put an identical chip
 * on every card and crowded out the signals that carry information.
 */
const AVAILABILITY_LABEL: Record<string, string> = {
  pending_rental: "Pending",
  rented: "Rented",
  temporarily_unavailable: "Unavailable",
};

// Pure presentational content, no Pressable/Link/gesture wrapper -- shared
// between PropertyCard (tap-to-navigate) and SwipeCard (drag gesture), so
// neither forces the other's interaction model onto this markup.
export function PropertyCardContent({ property }: { property: PropertyWithCover }) {
  const cover = property.property_images.find((img) => img.is_cover) ?? property.property_images[0];
  const isNew = isRecentlyPublished(property.published_at, 72 * 60 * 60 * 1000);
  const availability = AVAILABILITY_LABEL[property.availability_status];
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <View className="overflow-hidden rounded-lg border border-border-themed bg-surface-raised">
      <View className="aspect-[4/3] bg-surface-muted">
        {cover && !imageBroken ? (
          <Image
            source={{ uri: propertyImageUrl(cover.storage_path) }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            alt={`Photo of ${property.title}`}
            onError={() => setImageBroken(true)}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-content-subtle">
              {imageBroken ? "Photo couldn't load" : "No photo yet"}
            </Text>
          </View>
        )}
        <View className="absolute left-2 top-2 flex-row gap-1.5">
          {isNew && (
            <View className="rounded-full bg-accent-soft px-2 py-0.5">
              <Text className="text-xs font-sans-semibold text-accent-on-soft">New</Text>
            </View>
          )}
          {availability && (
            <View className="rounded-full bg-warning-soft px-2 py-0.5">
              <Text className="text-xs font-sans-semibold text-warning">{availability}</Text>
            </View>
          )}
        </View>
      </View>
      <View className="gap-1 p-3">
        {/* Price carries the accent and the largest step: it is the first
            thing anyone compares, and it previously matched the title. */}
        <Text className="font-display-bold text-xl text-accent-text" numberOfLines={1}>
          {formatUsd(property.rent_amount)}
          <Text className="font-sans text-sm text-content-subtle"> {formatRentalFrequency(property.rental_frequency)}</Text>
        </Text>
        <Text className="font-sans-semibold text-sm text-content-strong" numberOfLines={1}>
          {property.title}
        </Text>
        <Text className="text-xs text-content-subtle" numberOfLines={1}>
          {property.community ? `${property.community}, ` : ""}
          {property.city}, {property.county}
        </Text>
        <Text className="text-xs text-content-subtle">{formatCategory(property.category)}</Text>
      </View>
    </View>
  );
}
