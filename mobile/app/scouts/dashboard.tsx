import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useSession } from "../../lib/auth/session";
import { scoutProgram } from "../../lib/brand";
import { claimScoutAccount, findClaimableScoutId, getMyScout, getReferredOwnerCount } from "../../lib/scouts/service";
import { Screen } from "../../components/ui/Screen";

const STATUS_LABEL: Record<string, string> = {
  probation: "On probation",
  active: "Active",
  suspended: "Suspended",
  removed: "Removed",
  resigned: "Resigned",
};

export default function ScoutDashboardScreen() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const myScout = useQuery({
    queryKey: ["my-scout", user?.id],
    enabled: !!user,
    queryFn: () => getMyScout(user!.id),
  });

  const claimable = useQuery({
    queryKey: ["claimable-scout-id", user?.id],
    enabled: !!user && myScout.isSuccess && !myScout.data,
    queryFn: () => findClaimableScoutId(),
  });

  const referredCount = useQuery({
    queryKey: ["scout-referred-count", myScout.data?.id],
    enabled: !!myScout.data,
    queryFn: () => getReferredOwnerCount(myScout.data!.id),
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface-base p-6">
        <Stack.Screen options={{ headerShown: true, title: `My ${scoutProgram.name} dashboard` }} />
        <Text className="text-center text-base text-content-strong">Log in to see your scout dashboard.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  if (myScout.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </View>
    );
  }

  if (!myScout.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface-base p-6">
        <Stack.Screen options={{ headerShown: true, title: `My ${scoutProgram.name} dashboard` }} />
        {claimable.data ? (
          <Card className="w-full gap-3 p-5">
            <Text className="text-sm text-content-strong">
              We found a promoted {scoutProgram.name} application matching your account&apos;s phone number.
            </Text>
            <Button
              onPress={async () => {
                await claimScoutAccount(claimable.data!);
                queryClient.invalidateQueries({ queryKey: ["my-scout", user.id] });
              }}
            >
              Claim my scout dashboard
            </Button>
          </Card>
        ) : (
          <Text className="text-center text-sm text-content-muted">
            No scout account is linked here yet. If you&apos;ve been approved, make sure the phone number on your account
            matches the one on your application.
          </Text>
        )}
      </View>
    );
  }

  const scout = myScout.data;
  const referralLink = `${process.env.EXPO_PUBLIC_APP_URL ?? ""}/register?intent=owner&ref=${scout.referral_code}`;

  return (
    <Screen className="gap-4 px-4 pt-3">
      <Stack.Screen options={{ headerShown: true, title: `My ${scoutProgram.name} dashboard` }} />

      <Card className="gap-2 p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-sans-semibold text-content-strong">Status</Text>
          <Text className="text-sm text-content-muted">{STATUS_LABEL[scout.status] ?? scout.status}</Text>
        </View>
        {scout.status === "probation" && (
          <Text className="text-xs text-content-muted">
            Probation ends {new Date(scout.probation_ends_at).toLocaleDateString()}. Every listing you bring in is reviewed before it&apos;s credited.
          </Text>
        )}
      </Card>

      <Card className="gap-2 p-5">
        <Text className="text-sm font-sans-semibold text-content-strong">Your referral link</Text>
        <Text className="rounded-md bg-surface-muted px-3 py-2 text-xs text-content-muted">{referralLink}</Text>
        <Text className="text-xs text-content-subtle">Code: {scout.referral_code}</Text>
      </Card>

      <Card className="gap-2 p-5">
        <Text className="text-sm font-sans-semibold text-content-strong">Owners referred (confirmed)</Text>
        <Text className="font-display-bold text-2xl text-accent-text">{referredCount.data ?? 0}</Text>
      </Card>

      <Text className="text-xs text-content-subtle">Earnings aren&apos;t tracked on mobile yet -- see the web dashboard for payout status.</Text>
    </Screen>
  );
}
