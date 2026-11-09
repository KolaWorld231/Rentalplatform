import { useQuery } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useSession } from "../lib/auth/session";
import { brand, subscriptionPlan } from "../lib/brand";
import { formatExpiryDate, formatUsd } from "../lib/format";
import { getActiveSubscription } from "../lib/subscriptions/service";

const BENEFITS = [
  "Message as many property owners as you like for 30 days",
  "No per-property fee -- one pass, unlimited new conversations",
  "Keep read access to your existing conversations after it expires",
  "Manual renewal only -- never an automatic charge",
];

/**
 * Deliberately read-only: mobile shows the plan and the signed-in
 * user's real subscription status, but never initiates a purchase.
 * Apple App Store Review Guideline 3.1.1 and Google Play's Payments
 * Policy generally require unlocking in-app digital content/services
 * through the platform's own in-app purchase system -- the Direct
 * Access Pass's actual price point makes a real IAP integration (plus
 * the store's 15-30% cut) not worth it right now, so mobile simply
 * never offers a way to buy it, the same "reader app" pattern Netflix/
 * Spotify/Kindle use. Web (not an app-store app, no IAP rule applies)
 * keeps its full checkout flow unchanged -- a renter buys the pass
 * there, from any browser, and it's immediately active here too since
 * both clients read the same `subscriptions` table. See
 * docs/IMPLEMENTATION_STATUS.md for the decision record.
 */
export default function PricingScreen() {
  const { user } = useSession();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const subscription = useQuery({
    queryKey: ["active-subscription", user?.id],
    enabled: !!user,
    queryFn: () => getActiveSubscription(user!.id),
  });

  return (
    <View className="flex-1 bg-canvas dark:bg-charcoal-900">
      <Stack.Screen options={{ headerShown: true, title: subscriptionPlan.name }} />
      <View className="gap-5 p-4">
        {reason === "message_gate" && (
          <Card className="gap-1 p-4">
            <Text className="text-sm text-charcoal-700 dark:text-ivory-100">
              You&apos;ll need an active Direct Access Pass to message owners.
            </Text>
          </Card>
        )}

        {!user ? (
          <Card className="gap-3 p-5">
            <Text className="text-base text-charcoal-700 dark:text-ivory-100">Log in to see your Direct Access Pass.</Text>
            <Link href="/(auth)/login" asChild>
              <Button>Log in</Button>
            </Link>
          </Card>
        ) : subscription.isLoading ? (
          <Card className="items-center p-5">
            <ActivityIndicator />
          </Card>
        ) : subscription.data ? (
          <Card className="gap-1 p-5">
            <Text className="font-sans-semibold text-success-500">Your pass is active</Text>
            {subscription.data.expires_at && (
              <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
                Expires {formatExpiryDate(subscription.data.expires_at)}
              </Text>
            )}
          </Card>
        ) : null}

        <Card className="gap-3 p-5 shadow-[var(--shadow-clay-raised)]">
          <Text className="font-sans-semibold text-sm text-forest-700 dark:text-forest-500">{subscriptionPlan.name}</Text>
          <Text className="font-display-bold text-4xl text-charcoal-700 dark:text-ivory-100">
            {formatUsd(subscriptionPlan.priceUsd)}
            <Text className="font-sans text-base text-charcoal-400"> for {subscriptionPlan.durationDays} days</Text>
          </Text>

          <View className="gap-2 border-t border-border pt-3 dark:border-charcoal-500">
            {BENEFITS.map((b) => (
              <Text key={b} className="text-sm text-charcoal-600 dark:text-charcoal-400">
                • {b}
              </Text>
            ))}
          </View>

          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">
            Compare: paying an agent per viewing typically costs $30–40 and only covers one property.
          </Text>

          {user && !subscription.isLoading && !subscription.data && (
            <Text className="text-sm text-charcoal-600 dark:text-charcoal-400">
              Get a Direct Access Pass from the {brand.name} website, on any browser. Once it&apos;s active, it shows up
              here automatically.
            </Text>
          )}
        </Card>
      </View>
    </View>
  );
}
