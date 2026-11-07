import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { formatCategory, formatRentalFrequency, formatUsd, isRecentlyPublished } from "../../lib/format";
import { propertyImageUrl } from "../../lib/storage";
import type { PropertyWithCover } from "../../lib/properties/service";

export function PropertyCard({ property }: { property: PropertyWithCover }) {
  const cover = property.property_images.find((img) => img.is_cover) ?? property.property_images[0];
  const isNew = isRecentlyPublished(property.published_at, 72 * 60 * 60 * 1000);

  return (
    <Link href={`/property/${property.slug}`} asChild>
      <Pressable className="overflow-hidden rounded-lg border border-border bg-surface active:opacity-90 dark:border-charcoal-500 dark:bg-charcoal-700">
        <View className="aspect-[4/3] bg-sage-100 dark:bg-charcoal-500">
          {cover ? (
            <Image
              source={{ uri: propertyImageUrl(cover.storage_path) }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              alt={`Photo of ${property.title}`}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">No photo yet</Text>
            </View>
          )}
          {isNew && (
            <View className="absolute left-2 top-2 rounded-full bg-forest-600 px-2 py-0.5">
              <Text className="text-xs font-sans-semibold text-ivory-50">New</Text>
            </View>
          )}
        </View>
        <View className="gap-1 p-3">
          <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100" numberOfLines={1}>
            {formatUsd(property.rent_amount)}
            <Text className="font-sans text-sm text-charcoal-500 dark:text-charcoal-400"> {formatRentalFrequency(property.rental_frequency)}</Text>
          </Text>
          <Text className="font-sans-semibold text-sm text-charcoal-700 dark:text-ivory-100" numberOfLines={1}>
            {property.title}
          </Text>
          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400" numberOfLines={1}>
            {property.community ? `${property.community}, ` : ""}
            {property.city}, {property.county}
          </Text>
          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">{formatCategory(property.category)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
