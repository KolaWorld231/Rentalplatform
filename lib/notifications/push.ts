import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Best-effort push delivery on top of the `notifications` table — never
 * a replacement for it, and never something a caller should block on or
 * treat as having thrown for a real error (per the mobile plan's own
 * "push is optional, core flows must not depend on it" framing). Uses
 * Expo's push API directly (https://exp.host/--/api/v2/push/send) since
 * both the Expo Go dev client and a built app register an Expo push
 * token — no separate APNs/FCM credential setup needed for this.
 */
export async function sendPushNotification(userId: string, params: { title: string; body?: string; link?: string }) {
  const admin = createServiceRoleClient();

  const { data: prefs } = await admin.from("notification_preferences").select("push_enabled").eq("user_id", userId).maybeSingle();
  if (prefs?.push_enabled === false) return;

  const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", userId);
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: params.title,
    body: params.body,
    data: { link: params.link },
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // Never let a push-delivery failure surface to the caller -- the
    // in-app notification row (lib/admin/audit.ts's notifyUser) is the
    // source of truth either way.
  }
}
