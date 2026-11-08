// Mobile's half of push notifications -- the server side lives in
// lib/notifications/push.ts and lib/admin/audit.ts's notifyUser() on
// the web app, which both subscription activation (via the payments
// webhook) and new messages (via app/messages/actions.ts and this
// project's app/api/mobile/messages/notify/route.ts) already funnel
// through. This file is purely "get an Expo push token onto this
// device's account" plus notifying the recipient of a sent message.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  // Simulators/emulators have no real push capability, and Expo Go on
  // SDK 53+ no longer supports remote push at all -- registering there
  // would just fail noisily for no benefit. Core flows never depend on
  // this succeeding, per the mobile plan's own framing.
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (existingStatus !== "granted") {
    const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
    status = requestedStatus;
  }
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await supabase.rpc("register_push_token", { p_token: tokenResponse.data, p_platform: Platform.OS === "ios" ? "ios" : "android" });
}

function webAppOrigin(): string {
  return process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Mobile sends messages directly via the anon client (no server-role
 * layer), so unlike web's Server Actions it can't call notifyUser()
 * itself -- this hits the thin authenticated route that does, the same
 * pattern as mobile/lib/subscriptions/service.ts's checkout calls.
 * Fire-and-forget: a failure here should never block the message the
 * recipient will see as soon as they open the thread anyway.
 */
export async function notifyMessageRecipient(accessToken: string, conversationId: string): Promise<void> {
  try {
    await fetch(`${webAppOrigin()}/api/mobile/messages/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ conversationId }),
    });
  } catch {
    // best-effort, see above
  }
}
