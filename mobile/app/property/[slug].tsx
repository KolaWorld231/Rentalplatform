import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { useSession } from "../../lib/auth/session";
import { formatCategory, formatRentalFrequency, formatUsd } from "../../lib/format";
import { startOrContinueConversation } from "../../lib/messaging/service";
import { getPropertyBySlug, getSimilarProperties, toggleFavourite, getFavouritedPropertyIds } from "../../lib/properties/service";
import { reportProperty } from "../../lib/reports/service";
import { propertyImageUrl } from "../../lib/storage";
import { isIdentityVerified, isPropertyVerified } from "../../lib/verification/service";
import { VerificationBadge } from "../../components/verification/VerificationBadge";
import { ReportForm } from "../../components/reports/ReportForm";
import type { ReportReason } from "../../lib/database.types";
import { usePlaceholderColor } from "../../lib/theme";

const AMENITIES: { key: "has_electricity" | "has_water" | "has_air_conditioning" | "has_parking" | "has_security"; label: string }[] = [
  { key: "has_electricity", label: "Electricity" },
  { key: "has_water", label: "Water supply" },
  { key: "has_air_conditioning", label: "Air conditioning" },
  { key: "has_parking", label: "Parking" },
  { key: "has_security", label: "Security" },
];

export default function PropertyDetailScreen() {
  const placeholderColor = usePlaceholderColor();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // pagingEnabled snaps to the viewport, so a gallery item must be exactly
  // as wide as the screen or every page after the first sits off-centre.
  const { width: screenWidth } = useWindowDimensions();
  const { user, session } = useSession();
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
  const identityVerified = useQuery({
    queryKey: ["identity-verified", property.data?.owner_id],
    enabled: !!property.data,
    queryFn: () => isIdentityVerified(property.data!.owner_id),
  });
  const propertyVerified = useQuery({
    queryKey: ["property-verified", property.data?.id],
    enabled: !!property.data,
    queryFn: () => isPropertyVerified(property.data!.id),
  });
  const [togglingFavourite, setTogglingFavourite] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

  if (property.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </View>
    );
  }

  if (property.isError || !property.data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base p-6">
        <Text className="text-base text-content-strong">This listing isn&apos;t available anymore.</Text>
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

  async function onSendMessage() {
    if (!user || !messageDraft.trim()) return;
    setContactError(null);
    setSendingMessage(true);
    const result = await startOrContinueConversation({
      propertyId: p.id,
      renterId: user.id,
      firstMessage: messageDraft.trim(),
      accessToken: session?.access_token,
    });
    setSendingMessage(false);
    if (!result.ok) {
      if (result.reason === "subscription_required") {
        router.push("/pricing?reason=message_gate");
        return;
      }
      if (result.reason === "own_property") {
        setContactError("You can't message yourself about your own listing.");
        return;
      }
      setContactError("Couldn't send your message. Try again.");
      return;
    }
    setMessageDraft("");
    router.push(`/messages/${result.conversationId}`);
  }

  const isOwnListing = user?.id === p.owner_id;

  return (
    <ScrollView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ headerShown: true, title: p.title }} />

      {images.length > 0 ? (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          keyExtractor={(img) => img.id}
          renderItem={({ item }) =>
            brokenImageIds.has(item.id) ? (
              <View style={{ width: screenWidth, height: 260 }} className="items-center justify-center bg-surface-muted">
                <Text className="text-sm text-content-muted">Photo couldn&apos;t load</Text>
              </View>
            ) : (
              <Image
                source={{ uri: propertyImageUrl(item.storage_path) }}
                style={{ width: screenWidth, height: 260 }}
                contentFit="cover"
                alt={`Photo of ${p.title}`}
                onError={() => setBrokenImageIds((prev) => new Set(prev).add(item.id))}
              />
            )
          }
        />
      ) : (
        /* Reserving a full frame only makes sense when something will
           fill it; an empty 256px block just pushed the title down. */
        <View className="items-center justify-center bg-surface-muted px-5 py-5">
          <Text className="text-sm text-content-muted">
            The owner hasn&apos;t added photos to this listing yet.
          </Text>
        </View>
      )}

      <View className="gap-5 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-display-bold text-xl text-content-strong">{p.title}</Text>
            <Text className="mt-1 text-sm text-content-muted">
              {[p.community, p.city, p.county].filter(Boolean).join(", ")}
            </Text>
          </View>
          {user && (
            <Pressable
              onPress={onToggleFavourite}
              disabled={togglingFavourite}
              accessibilityRole="button"
              accessibilityLabel={isFavourited ? "Remove from saved" : "Save this property"}
              accessibilityState={{ selected: isFavourited }}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full border border-border-themed"
            >
              <Text className={isFavourited ? "text-accent-text" : "text-content-muted"}>{isFavourited ? "♥" : "♡"}</Text>
            </Pressable>
          )}
        </View>

        <Card className="gap-1 p-4">
          <Text className="font-display-bold text-2xl text-accent-text">
            {formatUsd(p.rent_amount)}
            <Text className="font-sans text-base text-content-subtle"> {formatRentalFrequency(p.rental_frequency)}</Text>
          </Text>
          {upfrontItems.length > 0 && (
            <View className="mt-3 gap-1 border-t border-border-themed pt-3">
              <Text className="font-sans-semibold text-sm text-content-strong">Disclosed move-in costs</Text>
              <CostRow label={`First ${formatRentalFrequency(p.rental_frequency).replace("/ ", "")} rent`} value={p.rent_amount} />
              {upfrontItems.map((i) => (
                <CostRow key={i.label} label={i.label} value={i.value} />
              ))}
              <View className="mt-2 flex-row items-baseline justify-between border-t border-border-themed pt-2">
                <Text className="font-sans-semibold text-content-strong">Total upfront</Text>
                <Text className="font-display-bold text-base text-content-strong">{formatUsd(totalUpfront)}</Text>
              </View>
            </View>
          )}
        </Card>

        {!isOwnListing && (
          <Card className="gap-2 p-4">
            <Text className="font-sans-semibold text-sm text-content-strong">Contact the owner</Text>
            {(identityVerified.data || propertyVerified.data) && (
              <View className="flex-row flex-wrap gap-2">
                {identityVerified.data && <VerificationBadge kind="identity" />}
                {propertyVerified.data && <VerificationBadge kind="property" />}
              </View>
            )}
            {user ? (
              <>
                <TextInput
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  placeholder="Hi, I'm interested in this property. Is it still available?"
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Message to the owner"
                  className="rounded-md border border-border-themed bg-surface-raised p-3 text-sm text-content-strong"
                />
                {contactError && <Text className="text-sm text-error-500">{contactError}</Text>}
                <Button variant="clay" loading={sendingMessage} onPress={onSendMessage} disabled={!messageDraft.trim()}>
                  Send message
                </Button>
                <Text className="text-xs text-content-subtle">Subscribe once, message unlimited owners. No per-property fee.</Text>
              </>
            ) : (
              <Link href="/(auth)/login" asChild>
                <Button variant="clay">Log in to message the owner</Button>
              </Link>
            )}
          </Card>
        )}

        <View className="gap-2">
          <Text className="font-display-bold text-lg text-content-strong">About this property</Text>
          <Text className="text-sm leading-relaxed text-content-muted">
            {p.description || "No description provided yet."}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-display-bold text-lg text-content-strong">Details & amenities</Text>
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

        {user && !isOwnListing && (
          <ReportForm
            label="Report this listing"
            onSubmit={(reason: ReportReason, details: string) => reportProperty(user.id, p.id, reason, details)}
          />
        )}

        {similar.data && similar.data.length > 0 && (
          <View className="gap-3">
            <Text className="font-display-bold text-lg text-content-strong">Similar properties</Text>
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
      <Text className="text-sm text-content-muted">{label}</Text>
      <Text className="text-sm text-content-muted">{formatUsd(value)}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-border-themed px-3 py-1">
      <Text className="text-xs text-content-strong">{label}</Text>
    </View>
  );
}
