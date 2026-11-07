import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
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
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">Log in to save properties you like.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas pt-16 dark:bg-charcoal-900">
      <Text className="px-4 pb-3 font-display-bold text-xl text-charcoal-700 dark:text-ivory-100">Saved</Text>
      {favourites.isLoading ? (
        <ActivityIndicator />
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
            <Text className="px-4 text-sm text-charcoal-500 dark:text-charcoal-400">
              Nothing saved yet. Tap the heart on a listing to save it here.
            </Text>
          }
        />
      )}
    </View>
  );
}
