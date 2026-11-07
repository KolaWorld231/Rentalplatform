import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("rounded-lg bg-surface dark:bg-charcoal-700 border border-border dark:border-charcoal-500", className)}
      {...props}
    />
  );
}
