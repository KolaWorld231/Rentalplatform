import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useSession } from "../../lib/auth/session";
import { useUserRoles } from "../../lib/auth/use-user-roles";
import { formatCategory, formatUsd, isAvailabilityStale } from "../../lib/format";
import { becomeOwner, getMyProperties } from "../../lib/owner/service";
import type { Property } from "../../lib/database.types";

export default function OwnerDashboardScreen() {
  const { user } = useSession();
  const roles = useUserRoles();
  const isOwner = roles.data?.includes("owner") ?? false;
  const queryClient = useQueryClient();

  const properties = useQuery({
    queryKey: ["my-properties-full", user?.id],
    enabled: !!user && isOwner,
    queryFn: () => getMyProperties(user!.id),
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Owner mode" }} />
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">Log in to list a property.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  if (roles.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Owner mode" }} />
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">
          Property owners list for free -- always.
        </Text>
        <Button
          variant="clay"
          onPress={async () => {
            await becomeOwner();
            queryClient.invalidateQueries({ queryKey: ["user-roles", user.id] });
          }}
        >
          Start listing properties
        </Button>
      </View>
    );
  }

  const list = properties.data ?? [];
  const published = list.filter((p) => p.listing_status === "published").length;
  const totalViews = list.reduce((sum, p) => sum + p.view_count, 0);
  const staleCount = list.filter((p) => p.listing_status === "published" && isAvailabilityStale(p.last_availability_confirmed_at)).length;

  return (
    <View className="flex-1 bg-canvas pt-16 dark:bg-charcoal-900">
      <Stack.Screen options={{ headerShown: true, title: "Owner mode" }} />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-4">
        <Card className="flex-row divide-x divide-border p-0 dark:divide-charcoal-500">
          <Stat label="Published" value={published} lead />
          <Stat label="Total" value={list.length} />
          <Stat label="Views" value={totalViews} />
        </Card>

        {staleCount > 0 && (
          <Card className="gap-1 border-l-4 border-warning-500 bg-warning-100 p-3">
            <Text className="text-sm font-sans-semibold text-charcoal-700">
              {staleCount} {staleCount === 1 ? "listing needs" : "listings need"} availability reconfirmed
            </Text>
          </Card>
        )}

        <Link href="/owner/new" asChild>
          <Button variant="clay">List a new property</Button>
        </Link>
      </ScrollView>

      {properties.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          contentContainerClassName="gap-2 px-4 pb-8"
          renderItem={({ item }) => <OwnerPropertyRow property={item} />}
          ListEmptyComponent={<Text className="px-4 text-sm text-charcoal-500 dark:text-charcoal-400">No listings yet.</Text>}
        />
      )}
    </View>
  );
}

function Stat({ label, value, lead }: { label: string; value: number; lead?: boolean }) {
  return (
    <View className="flex-1 items-center gap-0.5 p-3">
      <Text className={lead ? "font-display-bold text-xl text-forest-700 dark:text-forest-500" : "font-display-bold text-xl text-charcoal-700 dark:text-ivory-100"}>
        {value}
      </Text>
      <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">{label}</Text>
    </View>
  );
}

function OwnerPropertyRow({ property: p }: { property: Property }) {
  const stale = p.listing_status === "published" && isAvailabilityStale(p.last_availability_confirmed_at);
  return (
    <Link href={`/owner/${p.id}`} asChild>
      <Pressable>
        <Card className="gap-1 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 font-sans-semibold text-charcoal-700 dark:text-ivory-100" numberOfLines={1}>
              {p.title}
            </Text>
            {stale && <Text className="text-xs font-sans-semibold text-warning-500">Reconfirm</Text>}
          </View>
          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">
            {formatUsd(p.rent_amount)} · {formatCategory(p.category)} · {p.listing_status}
          </Text>
        </Card>
      </Pressable>
    </Link>
  );
}
