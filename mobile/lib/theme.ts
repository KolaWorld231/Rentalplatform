import { useColorScheme } from "react-native";

/**
 * React Native's TextInput takes `placeholderTextColor` as a prop, not a
 * style, so neither NativeWind classes nor the variables in global.css
 * reach it. Every call site had the same hardcoded `#737373`, which is
 * the old cold grey and does not flip: on the dark ground it sat at
 * roughly 3.4:1.
 *
 * These are the resolved content-subtle values from global.css.
 */
export function usePlaceholderColor(): string {
  return useColorScheme() === "dark" ? "#9a9188" : "#6e6762";
}
