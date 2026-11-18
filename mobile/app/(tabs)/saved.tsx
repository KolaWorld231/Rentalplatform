import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { Screen } from "../../components/ui/Screen";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { useSession } from "../../lib/auth/session";
import { getFavouritedProperties } from "../../lib/properties/service";

export default function SavedScreen() {
  const { user, loading } = useSession();
  const favourites = useQuery({
    queryKey: ["favourites", user?.id],
    enabled: !!user,
    queryFn: () => getFavouritedProperties(user!.id),
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface-base p-6">
        <Text className="text-center text-base text-content-strong">Log in to save properties you like.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  return (
    <Screen>
      <Text className="px-4 pb-3 pt-3 font-display-bold text-xl text-content-strong">Saved</Text>
      {favourites.isLoading ? (
        <ActivityIndicator />
      ) : favourites.isError ? (
        <ErrorState
          message="Couldn't load your saved properties. Your saved list is safe — this is a problem loading it."
          onRetry={() => favourites.refetch()}
          retrying={favourites.isRefetching}
        />
      ) : (
        <FlatList
          data={favourites.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperClassName="gap-3 px-4"
          contentContainerClassName="gap-3 pb-6"
          renderItem={({ item }) => (
            <View className="flex-1">
              <PropertyCard property={item} />
            </View>
          )}
          ListEmptyComponent={
            <Text className="px-4 text-sm text-content-muted">
              Nothing saved yet. Tap the heart on a listing to save it here.
            </Text>
          }
        />
      )}
    </Screen>
  );
}
