import { Text, TextInput, View, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";
import { usePlaceholderColor } from "../../lib/theme";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  const placeholderColor = usePlaceholderColor();
  return (
    <View className="flex flex-col gap-1.5">
      {label && <Text className="text-sm font-medium text-content-strong">{label}</Text>}
      <TextInput
        placeholderTextColor={placeholderColor}
        accessibilityLabel={label ?? props.placeholder}
        accessibilityHint={hint}
        className={cn(
          // surface-muted (not surface-raised) gives this a recessed look
          // relative to the Card it usually sits in -- RN has no
          // inset-shadow support, so this background-tint swap is the
          // substitute for web's --shadow-clay-inset. It flips with the
          // theme, which the old bg-well-light/dark pair did not.
          "h-12 rounded-md border border-border-themed bg-surface-muted px-3.5 text-base text-content-strong",
          error && "border-error-500",
          className,
        )}
        {...props}
      />
      {hint && !error && <Text className="text-xs text-content-subtle">{hint}</Text>}
      {error && <Text className="text-xs font-medium text-error-500">{error}</Text>}
    </View>
  );
}
