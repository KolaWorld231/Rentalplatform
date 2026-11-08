// Hand-ported from ../../../components/ui/Avatar.tsx -- same hash-based
// color rotation, kept in sync by hand (see mobile/README.md).
import { Text, View } from "react-native";
import { cn } from "../../lib/cn";

const PALETTE = [
  "bg-forest-600",
  "bg-clay-500",
  "bg-info-500",
  "bg-sage-300",
];
const PALETTE_TEXT = ["text-ivory-50", "text-ivory-50", "text-ivory-50", "text-charcoal-700"];

function indexFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function Avatar({ name, size = "md" }: { name: string | null | undefined; size?: "sm" | "md" }) {
  const label = name?.trim() || "?";
  const initial = label[0]!.toUpperCase();
  const idx = indexFor(label);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("items-center justify-center rounded-full", size === "sm" ? "h-7 w-7" : "h-9 w-9", PALETTE[idx])}
    >
      <Text className={cn("font-display-bold", size === "sm" ? "text-xs" : "text-sm", PALETTE_TEXT[idx])}>{initial}</Text>
    </View>
  );
}
