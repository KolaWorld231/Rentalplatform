import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { logoutAction } from "../../lib/auth/actions";
import { useSession } from "../../lib/auth/session";
import { getRecentlyListed } from "../../lib/properties/service";
import { brand, scoutProgram } from "../../lib/brand";
import { getPendingScoutReferral, respondToScoutReferral } from "../../lib/scouts/service";

export default function HomeScreen() {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const recentlyListed = useQuery({ queryKey: ["recently-listed"], queryFn: () => getRecentlyListed() });
  const pendingReferral = useQuery({
    queryKey: ["pending-scout-referral", user?.id],
    enabled: !!user,
    queryFn: () => getPendingScoutReferral(user!.id),
  });

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="px-4 pt-16 pb-8 gap-5">
      <View>
        <Text className="font-display-bold text-3xl text-forest-700 dark:text-forest-500">{brand.name}</Text>
        <Text className="mt-1 text-base text-charcoal-500 dark:text-charcoal-400">Your Next Place. Direct From the Owner.</Text>
      </View>

      <Card className="gap-3 p-4">
        {loading ? (
          <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Checking your session…</Text>
        ) : user ? (
          <>
            <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">
              Signed in as {user.email ?? user.phone}
            </Text>
            <Link href="/owner" asChild>
              <Button variant="secondary">Owner mode</Button>
            </Link>
            <Link href="/verification" asChild>
              <Button variant="secondary">Verification center</Button>
            </Link>
            <Link href="/scouts/dashboard" asChild>
              <Button variant="secondary">My scout dashboard</Button>
            </Link>
            <Button variant="secondary" onPress={() => logoutAction()}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Not signed in</Text>
            <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
              Browsing is always free. Sign in to save favourites, message owners, or list a property.
            </Text>
            <Link href="/(auth)/login" asChild>
              <Button>Log in</Button>
            </Link>
            <Link href="/(auth)/register" asChild>
              <Button variant="clay">Create an account</Button>
            </Link>
          </>
        )}
      </Card>

      {pendingReferral.data && (
        <Card className="gap-3 p-4">
          <Text className="text-sm text-charcoal-700 dark:text-ivory-100">
            A {scoutProgram.name} scout says they introduced you to {brand.name}. Confirm this?
          </Text>
          <View className="flex-row gap-2">
            <Button
              size="sm"
              onPress={async () => {
                await respondToScoutReferral(pendingReferral.data!.id, true);
                queryClient.invalidateQueries({ queryKey: ["pending-scout-referral", user!.id] });
              }}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={async () => {
                await respondToScoutReferral(pendingReferral.data!.id, false);
                queryClient.invalidateQueries({ queryKey: ["pending-scout-referral", user!.id] });
              }}
            >
              Decline
            </Button>
          </View>
        </Card>
      )}

      <View className="gap-3">
        <Text className="font-display-bold text-xl text-charcoal-700 dark:text-ivory-100">Recently listed</Text>
        {recentlyListed.isLoading ? (
          <ActivityIndicator />
        ) : recentlyListed.isError ? (
          <Text className="text-sm text-error-500">Couldn&apos;t load listings. Pull to refresh.</Text>
        ) : recentlyListed.data && recentlyListed.data.length > 0 ? (
          <FlatList
            horizontal
            data={recentlyListed.data}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
            renderItem={({ item }) => (
              <View className="w-64">
                <PropertyCard property={item} />
              </View>
            )}
          />
        ) : (
          <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Your next place hasn&apos;t appeared yet. Check back soon.
          </Text>
        )}
      </View>

      <Link href="/pricing" asChild>
        <Button variant="clay">Get the Direct Access Pass</Button>
      </Link>

      <Link href="/scouts" asChild>
        <Button variant="secondary">Become a Scout</Button>
      </Link>
    </ScrollView>
  );
}
