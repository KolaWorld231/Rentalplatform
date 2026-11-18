import { Text, TextInput, View, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="flex flex-col gap-1.5">
      {label && <Text className="text-sm font-medium text-content-strong">{label}</Text>}
      <TextInput
        placeholderTextColor="#737373"
        accessibilityLabel={label ?? props.placeholder}
        accessibilityHint={hint}
        className={cn(
          // bg-well-* (not bg-surface) gives this a recessed look relative
          // to the Card it usually sits in -- RN has no inset-shadow
          // support, so this background-tint swap is the substitute for
          // web's --shadow-clay-inset.
 "h-12 rounded-md border border-border bg-well-light px-3.5 text-base text-content-strong",
 "dark:border-charcoal-500 dark:bg-well-dark ",
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
