import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { useSession } from "../../lib/auth/session";
import { formatCategory, formatRentalFrequency, formatUsd } from "../../lib/format";
import { getPropertyBySlug, getSimilarProperties, toggleFavourite, getFavouritedPropertyIds } from "../../lib/properties/service";
import { propertyImageUrl } from "../../lib/storage";

const AMENITIES: { key: "has_electricity" | "has_water" | "has_air_conditioning" | "has_parking" | "has_security"; label: string }[] = [
  { key: "has_electricity", label: "Electricity" },
  { key: "has_water", label: "Water supply" },
  { key: "has_air_conditioning", label: "Air conditioning" },
  { key: "has_parking", label: "Parking" },
  { key: "has_security", label: "Security" },
];

export default function PropertyDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const property = useQuery({ queryKey: ["property", slug], queryFn: () => getPropertyBySlug(slug) });
  const similar = useQuery({
    queryKey: ["similar", slug],
    enabled: !!property.data,
    queryFn: () => getSimilarProperties(property.data!),
  });
  const favourites = useQuery({
    queryKey: ["favourite-ids", user?.id],
    enabled: !!user,
    queryFn: () => getFavouritedPropertyIds(user!.id),
  });
  const [togglingFavourite, setTogglingFavourite] = useState(false);

  if (property.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (property.isError || !property.data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas p-6 dark:bg-charcoal-900">
        <Text className="text-base text-charcoal-700 dark:text-ivory-100">This listing isn&apos;t available anymore.</Text>
      </View>
    );
  }

  const p = property.data;
  const images = [...p.property_images].sort((a, b) => a.position - b.position);
  const isFavourited = favourites.data?.has(p.id) ?? false;

  const upfrontItems = [
    { label: "Advance rent", value: p.advance_rent_amount },
    { label: "Security deposit", value: p.security_deposit_amount },
    { label: "Other fees", value: p.other_fees_amount },
  ].filter((i) => i.value !== null) as { label: string; value: number }[];
  const totalUpfront = upfrontItems.reduce((sum, i) => sum + i.value, 0) + p.rent_amount;

  async function onToggleFavourite() {
    if (!user) return;
    setTogglingFavourite(true);
    await toggleFavourite(user.id, p.id);
    await queryClient.invalidateQueries({ queryKey: ["favourite-ids", user.id] });
    setTogglingFavourite(false);
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900">
      <Stack.Screen options={{ headerShown: true, title: p.title }} />

      {images.length > 0 ? (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          keyExtractor={(img) => img.id}
          renderItem={({ item }) => (
            <Image
              source={{ uri: propertyImageUrl(item.storage_path) }}
              style={{ width: 390, height: 260 }}
              contentFit="cover"
              alt={`Photo of ${p.title}`}
            />
          )}
        />
      ) : (
        <View className="h-64 items-center justify-center bg-sage-100 dark:bg-charcoal-500">
          <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">No photos yet</Text>
        </View>
      )}

      <View className="gap-5 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-display-bold text-xl text-charcoal-700 dark:text-ivory-100">{p.title}</Text>
            <Text className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
              {[p.community, p.city, p.county].filter(Boolean).join(", ")}
            </Text>
          </View>
          {user && (
            <Pressable onPress={onToggleFavourite} disabled={togglingFavourite} className="rounded-full border border-border p-2 dark:border-charcoal-500">
              <Text className={isFavourited ? "text-clay-500" : "text-charcoal-500 dark:text-charcoal-400"}>{isFavourited ? "♥" : "♡"}</Text>
            </Pressable>
          )}
        </View>

        <Card className="gap-1 p-4">
          <Text className="font-display-bold text-2xl text-forest-700 dark:text-forest-500">
            {formatUsd(p.rent_amount)}
            <Text className="font-sans text-base text-charcoal-400"> {formatRentalFrequency(p.rental_frequency)}</Text>
          </Text>
          {upfrontItems.length > 0 && (
            <View className="mt-3 gap-1 border-t border-border pt-3 dark:border-charcoal-500">
              <Text className="font-sans-semibold text-sm text-charcoal-700 dark:text-ivory-100">Disclosed move-in costs</Text>
              <CostRow label={`First ${formatRentalFrequency(p.rental_frequency).replace("/ ", "")} rent`} value={p.rent_amount} />
              {upfrontItems.map((i) => (
                <CostRow key={i.label} label={i.label} value={i.value} />
              ))}
              <View className="mt-1 flex-row justify-between border-t border-border pt-1 dark:border-charcoal-500">
                <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Total upfront</Text>
                <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">{formatUsd(totalUpfront)}</Text>
              </View>
            </View>
          )}
          <Button variant="clay" className="mt-4" disabled>
            Message owner (coming soon)
          </Button>
        </Card>

        <View className="gap-2">
          <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100">About this property</Text>
          <Text className="text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-400">
            {p.description || "No description provided yet."}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100">Details & amenities</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip label={formatCategory(p.category)} />
            {p.bedrooms !== null && <Chip label={`${p.bedrooms} bed`} />}
            {p.bathrooms !== null && <Chip label={`${p.bathrooms} bath`} />}
            {p.floor_area_sqm !== null && <Chip label={`${p.floor_area_sqm} m²`} />}
            {p.furnished !== null && <Chip label={p.furnished ? "Furnished" : "Unfurnished"} />}
            {AMENITIES.filter((a) => p[a.key] === true).map((a) => (
              <Chip key={a.key} label={a.label} />
            ))}
          </View>
        </View>

        {similar.data && similar.data.length > 0 && (
          <View className="gap-3">
            <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100">Similar properties</Text>
            <FlatList
              horizontal
              data={similar.data}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3"
              renderItem={({ item }) => (
                <View className="w-56">
                  <PropertyCard property={item} />
                </View>
              )}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">{label}</Text>
      <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">{formatUsd(value)}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border px-3 py-1 dark:border-charcoal-500">
      <Text className="text-xs text-charcoal-700 dark:text-ivory-100">{label}</Text>
    </View>
  );
}
