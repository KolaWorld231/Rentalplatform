import { View, Text } from "react-native";
import { Card } from "./ui/Card";

export function PlaceholderScreen({ title, milestone }: { title: string; milestone: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas p-6 dark:bg-charcoal-900">
      <Card className="w-full p-6">
        <Text className="font-display-bold text-xl text-charcoal-700 dark:text-ivory-100">{title}</Text>
        <Text className="mt-2 text-sm text-charcoal-500 dark:text-charcoal-400">{milestone}</Text>
      </Card>
    </View>
  );
}
