import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "clay" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-forest-600 active:bg-forest-700",
  secondary: "bg-surface dark:bg-charcoal-700 border border-border dark:border-charcoal-500",
  clay: "bg-clay-500 active:bg-clay-600",
  ghost: "bg-transparent",
  danger: "bg-error-500",
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-ivory-50",
  secondary: "text-charcoal-700 dark:text-ivory-100",
  clay: "text-ivory-50",
  ghost: "text-charcoal-700 dark:text-ivory-100",
  danger: "text-ivory-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-12 px-5",
  lg: "h-14 px-6",
};

export interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant = "primary", size = "md", loading, disabled, children, className, ...props }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-full",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        (disabled || loading) && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading && <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#1a1a1a" : "#ffffff"} />}
      {typeof children === "string" ? (
        <Text className={cn("text-base font-medium", VARIANT_TEXT_CLASSES[variant])}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
