import "../global.css";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, useFonts as useManrope } from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as usePlusJakartaSans,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationsBootstrap } from "../components/NotificationsBootstrap";
import { SessionProvider } from "../lib/auth/session";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [manropeLoaded] = useManrope({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold });
  const [displayLoaded] = usePlusJakartaSans({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  const fontsLoaded = manropeLoaded && displayLoaded;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NotificationsBootstrap />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
