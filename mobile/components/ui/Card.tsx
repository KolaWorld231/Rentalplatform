import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("rounded-lg bg-surface-raised border border-border-themed shadow-raised", className)}
      {...props}
    />
  );
}
