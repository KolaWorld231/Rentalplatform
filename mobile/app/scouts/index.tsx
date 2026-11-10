import { Link, Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { brand, scoutProgram } from "../../lib/brand";

const nonNegotiables = [
  "Scouts never charge owners or renters any fee.",
  "Owners still list, receive, and reply for free. Renters still pay US$5 / 30 days.",
  "Scouts are paid only for verified supply -- never for leases or \"successful rentals\".",
  `${brand.name} never holds rent, deposits, or escrow -- scouts must never collect money for us or for owners.`,
  "Scouts get no access to renter data, owner private contact details, messages, or payment records.",
];

export default function ScoutsInfoScreen() {
  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-4 px-4 pt-16 pb-8">
      <Stack.Screen options={{ headerShown: true, title: scoutProgram.name }} />

      <View>
        <Text className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Scout Program</Text>
        <Text className="font-display-bold text-2xl text-charcoal-700 dark:text-ivory-100">{scoutProgram.name}</Text>
        <Text className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
          {scoutProgram.name} are vetted local scouts who bring verified property owners with real listings onto{" "}
          {brand.name}. They replace the informal-agent role with an accountable, auditable one.
        </Text>
      </View>

      <Card className="gap-3 p-5">
        <Text className="text-sm font-sans-semibold text-charcoal-700 dark:text-ivory-100">How it works</Text>
        {nonNegotiables.map((item) => (
          <Text key={item} className="text-sm text-charcoal-600 dark:text-charcoal-400">
            • {item}
          </Text>
        ))}
      </Card>

      <Card className="gap-2 p-5">
        <Text className="text-sm font-sans-semibold text-charcoal-700 dark:text-ivory-100">Applying</Text>
        <Text className="text-sm text-charcoal-600 dark:text-charcoal-400">
          There is no open sign-up -- scouts apply through a short form and are reviewed in the order their
          application is received. Seats are limited per area, so applying does not guarantee acceptance.
        </Text>
      </Card>

      <Link href="/scouts/apply" asChild>
        <Button>Apply to become a scout</Button>
      </Link>
    </ScrollView>
  );
}
