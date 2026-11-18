import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../lib/cn";

/**
 * Standard screen container: real safe-area insets and keyboard avoidance.
 *
 * Every screen previously opened with a hardcoded `pt-16` (64px). That is a
 * guess at one device's status bar, and it is wrong in both directions: an
 * iPhone with Dynamic Island reserves 59pt and a notchless device 20pt, so the
 * same constant either crowds the island or wastes 44px of a small screen.
 * Android status bars vary again. `useSafeAreaInsets` reports what the device
 * actually reserves.
 *
 * `avoidKeyboard` is opt-in because it is only correct for screens with a
 * focusable input pinned near the bottom (the message composer, the forms). On
 * a plain scrolling list it would add padding for no reason.
 */
export function Screen({
  children,
  className,
  edges = ["top"],
  avoidKeyboard = false,
}: {
  children: ReactNode;
  className?: string;
  edges?: ("top" | "bottom")[];
  avoidKeyboard?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={{
        paddingTop: edges.includes("top") ? insets.top : 0,
        paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
      }}
      className={cn("flex-1 bg-surface-base", className)}
    >
      {children}
    </View>
  );

  if (!avoidKeyboard) return content;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
