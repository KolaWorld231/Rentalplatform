import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, Text, View } from "react-native";
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from "./SwipeCard";
import { useSession } from "../../lib/auth/session";
import { addFavourite, getFavouritedPropertyIds, searchProperties, type PropertyWithCover } from "../../lib/properties/service";
import type { SearchParamsInput } from "../../lib/validation/property";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 0.75 + 130;
const PREFETCH_THRESHOLD = 3;
const STACK_SIZE = 3;

interface SwipeDeckProps {
  params: Omit<SearchParamsInput, "page">;
}

// Assumes a logged-in user -- search.tsx only mounts this for a signed-in
// session (guests see the plain grid, no Swipe toggle).
export function SwipeDeck({ params }: SwipeDeckProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [cards, setCards] = useState<PropertyWithCover[]>([]);
  const [cursor, setCursor] = useState(0);
  const [fetchedPage, setFetchedPage] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const topCardRef = useRef<SwipeCardHandle>(null);
  const fetchingRef = useRef(false);

  const favouriteIds = useQuery({
    queryKey: ["favourite-ids", user?.id],
    enabled: !!user,
    queryFn: () => getFavouritedPropertyIds(user!.id),
  });

  const remaining = cards.length - cursor;
  const needsMore = !exhausted && remaining <= PREFETCH_THRESHOLD && favouriteIds.data !== undefined;

  useEffect(() => {
    if (!needsMore || fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    const nextPage = fetchedPage + 1;
    searchProperties({ ...params, page: nextPage }).then((result) => {
      fetchingRef.current = false;
      if (cancelled) return;
      const excluded = favouriteIds.data ?? new Set<string>();
      const fresh = result.properties.filter((p) => !excluded.has(p.id));
      setFetchedPage(nextPage);
      setCards((prev) => [...prev, ...fresh]);
      if (nextPage * result.pageSize >= result.total) setExhausted(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsMore, fetchedPage]);

  function handleSwiped(direction: SwipeDirection) {
    const property = cards[cursor];
    if (direction === "right" && property && user) {
      void addFavourite(user.id, property.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["favourite-ids", user.id] });
        queryClient.invalidateQueries({ queryKey: ["favourites", user.id] });
      });
    }
    setCursor((c) => c + 1);
  }

  const visible = cards.slice(cursor, cursor + STACK_SIZE);

  if (favouriteIds.isLoading || (cards.length === 0 && !exhausted)) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (visible.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">You&apos;ve gone through everything.</Text>
        <Text className="text-center text-sm text-charcoal-500 dark:text-charcoal-400">
          No more properties match these filters. Try widening your search or switch to Grid.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-6">
      <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        {visible
          .map((property, index) => (
            <View
              key={property.id}
              style={{
                position: "absolute",
                width: "100%",
                zIndex: visible.length - index,
                transform: [{ scale: 1 - index * 0.04 }, { translateY: index * 8 }],
              }}
            >
              <SwipeCard
                ref={index === 0 ? topCardRef : undefined}
                property={property}
                active={index === 0}
                onSwiped={index === 0 ? handleSwiped : () => {}}
              />
            </View>
          ))
          .reverse()}
      </View>

      <View className="flex-row items-center gap-8">
        <Pressable
          onPress={() => topCardRef.current?.flingOff("left")}
          accessibilityRole="button"
          accessibilityLabel="Skip this property"
          className="h-14 w-14 items-center justify-center rounded-full border border-error-500 bg-surface shadow-raised active:shadow-subtle dark:bg-charcoal-700"
        >
          <X color="#c23f3f" size={26} />
        </Pressable>
        <Pressable
          onPress={() => topCardRef.current?.flingOff("right")}
          accessibilityRole="button"
          accessibilityLabel="Add to picks"
          className="h-14 w-14 items-center justify-center rounded-full border border-success-500 bg-surface shadow-raised active:shadow-subtle dark:bg-charcoal-700"
        >
          <Heart color="#2f8f5b" size={26} />
        </Pressable>
      </View>
    </View>
  );
}
