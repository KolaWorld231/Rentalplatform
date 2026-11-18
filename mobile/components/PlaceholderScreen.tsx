import { View, Text } from "react-native";
import { Card } from "./ui/Card";

export function PlaceholderScreen({ title, milestone }: { title: string; milestone: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-base p-6">
      <Card className="w-full p-6">
        <Text className="font-display-bold text-xl text-content-strong">{title}</Text>
        <Text className="mt-2 text-sm text-content-muted">{milestone}</Text>
      </Card>
    </View>
  );
}
