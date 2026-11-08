import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { useSession } from "../lib/auth/session";
import { registerForPushNotifications } from "../lib/notifications/service";

/**
 * Registers this device for push once signed in, and navigates to a
 * notification's `link` (the same field notifyUser()/the `notifications`
 * table uses on web) when the user taps it. Mounted once, at the root
 * layout -- never blocks rendering, never throws into the tree: both
 * the registration call and the listener setup are best-effort per the
 * "push is optional" rule.
 */
export function NotificationsBootstrap() {
  const { user } = useSession();

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().catch(() => {});
  }, [user]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      if (typeof link === "string" && link.startsWith("/")) {
        router.push(link as never);
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}
