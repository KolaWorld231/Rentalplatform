import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useSession } from "../lib/auth/session";
import { subscriptionPlan } from "../lib/brand";
import { formatExpiryDate, formatUsd } from "../lib/format";
import { checkMobileMomoStatus, getActiveSubscription, startMobileCheckout } from "../lib/subscriptions/service";

const BENEFITS = [
  "Message as many property owners as you like for 30 days",
  "No per-property fee -- one pass, unlimited new conversations",
  "Keep read access to your existing conversations after it expires",
  "Manual renewal only -- never an automatic charge",
];

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

export default function PricingScreen() {
  const { user, session } = useSession();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  const subscription = useQuery({
    queryKey: ["active-subscription", user?.id],
    enabled: !!user,
    queryFn: () => getActiveSubscription(user!.id),
  });

  useEffect(() => {
    if (!pendingReference || !session || pollAttempt >= MAX_POLLS) return;

    const timer = setTimeout(
      async () => {
        const result = await checkMobileMomoStatus(session.access_token, pendingReference);
        if (result.status === "confirmed") {
          setPendingReference(null);
          await queryClient.invalidateQueries({ queryKey: ["active-subscription", user?.id] });
          return;
        }
        if (result.status === "failed") {
          setPendingReference(null);
          setError("That payment wasn't confirmed. No charge was applied -- you can try again.");
          return;
        }
        if (result.status === "error") {
          setPendingReference(null);
          setError(result.error ?? "Something went wrong checking your payment.");
          return;
        }
        setPollAttempt((a) => a + 1);
      },
      pollAttempt === 0 ? 0 : POLL_INTERVAL_MS,
    );

    return () => clearTimeout(timer);
  }, [pendingReference, pollAttempt, session, queryClient, user?.id]);

  async function onStartCheckout() {
    if (!session) return;
    setError(null);
    setStarting(true);
    try {
      const checkout = await startMobileCheckout(session.access_token, phone.trim() || undefined);
      if (checkout.kind === "redirect") {
        await WebBrowser.openBrowserAsync(checkout.redirectUrl);
        await queryClient.invalidateQueries({ queryKey: ["active-subscription", user?.id] });
      } else {
        setPollAttempt(0);
        setPendingReference(checkout.reference);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-5 p-4 pb-10">
      <Stack.Screen options={{ headerShown: true, title: subscriptionPlan.name }} />

      {!user ? (
        <Card className="gap-3 p-5">
          <Text className="text-base text-charcoal-700 dark:text-ivory-100">Log in to get a Direct Access Pass.</Text>
          <Link href="/(auth)/login" asChild>
            <Button>Log in</Button>
          </Link>
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
      ) : pendingReference ? (
        <Card className="items-center gap-2 p-5 text-center">
          <ActivityIndicator />
          <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Check your phone</Text>
          <Text className="text-center text-sm text-charcoal-500 dark:text-charcoal-400">
            Approve the mobile money payment request and enter your PIN to activate your pass.
          </Text>
        </Card>
      ) : null}

      {!pendingReference && (
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

          {error && <Text className="text-sm text-error-500">{error}</Text>}

          {user && !subscription.data && (
            <>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Mobile money phone number (e.g. 0770 000 000)"
                placeholderTextColor="#737373"
                keyboardType="phone-pad"
                className="h-12 rounded-md border border-border bg-surface px-3.5 text-base text-charcoal-700 dark:border-charcoal-500 dark:bg-charcoal-700 dark:text-ivory-100"
              />
              <Button variant="clay" loading={starting} onPress={onStartCheckout}>
                Get the Direct Access Pass
              </Button>
            </>
          )}
        </Card>
      )}

      <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">
        Only a verified payment ever activates your pass -- nothing here marks it active until that&apos;s
        confirmed.
      </Text>
    </ScrollView>
  );
}
