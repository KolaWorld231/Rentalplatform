import { ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useSession } from "../../lib/auth/session";

export default function HomeScreen() {
  const { user, loading } = useSession();

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="px-4 pt-16 pb-8 gap-5">
      <View>
        <Text className="font-display-bold text-3xl text-forest-700 dark:text-forest-500">DomiLink</Text>
        <Text className="mt-1 text-base text-charcoal-500 dark:text-charcoal-400">Your Next Place. Direct From the Owner.</Text>
      </View>

      <Card className="p-4">
        <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">
          {loading ? "Checking your session…" : user ? `Signed in as ${user.email ?? user.phone}` : "Not signed in"}
        </Text>
        <Text className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
          Browse, search, saved listings, and messaging land in later milestones — this screen is the Foundation
          milestone&apos;s design-system check.
        </Text>
      </Card>

      <Card className="gap-3 p-4">
        <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Buttons</Text>
        <Button variant="primary">Find a Property</Button>
        <Button variant="clay">List Your Property — Free</Button>
        <Button variant="secondary">Log in</Button>
        <Button variant="ghost">Cancel</Button>
      </Card>
    </ScrollView>
  );
}
