import { Redirect } from "expo-router";

// Both (auth) and (tabs) are route groups with their own first screen;
// this bare redirect gives Expo Router an unambiguous initial route.
// Browsing is free without an account (CLAUDE.md rule #2), so this
// always lands on the tabs, signed in or not -- /(auth)/login and
// /(auth)/register are reached from Home's own sign-in prompt, not a
// forced redirect.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
