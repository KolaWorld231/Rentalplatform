import "../global.css";
import NetInfo from "@react-native-community/netinfo";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, useFonts as useManrope } from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as usePlusJakartaSans,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationsBootstrap } from "../components/NotificationsBootstrap";
import { OfflineBanner } from "../components/ui/OfflineBanner";
import { SessionProvider } from "../lib/auth/session";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Pauses/resumes React Query's own refetching on connectivity change --
// the officially documented integration, not custom retry logic.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

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
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
