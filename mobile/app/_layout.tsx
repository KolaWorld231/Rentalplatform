import "../global.css";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, useFonts as useManrope } from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts as usePlusJakartaSans,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AnimatedSplash from "../components/AnimatedSplash";
import { NotificationsBootstrap } from "../components/NotificationsBootstrap";
import { SessionProvider, useSession } from "../lib/auth/session";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// AnimatedSplash itself hides the native splash (see its onLayout) once
// it has laid out and is ready to paint its own first frame -- a single
// handoff point, rather than this file also racing to call
// SplashScreen.hideAsync() the moment fonts load.
function RootLayoutInner() {
  const { loading: sessionLoading } = useSession();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      <NotificationsBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
      {!splashDone && <AnimatedSplash isAppReady={!sessionLoading} onFinish={() => setSplashDone(true)} />}
    </>
  );
}

export default function RootLayout() {
  const [manropeLoaded] = useManrope({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold });
  const [displayLoaded] = usePlusJakartaSans({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const fontsLoaded = manropeLoaded && displayLoaded;

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <RootLayoutInner />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
