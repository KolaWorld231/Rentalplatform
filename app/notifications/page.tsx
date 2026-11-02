import { Bell } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/utils/format";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  updateNotificationPreferencesAction,
} from "./actions";

export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {(!notifications || notifications.length === 0) ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <Bell className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">You&apos;re all caught up.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Updates about your listings, verification, and subscription will appear here.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-subtle)] ${n.read_at ? "bg-surface" : "bg-sage-100"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm ${n.read_at ? "font-medium text-charcoal-600" : "font-semibold text-charcoal-700"}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-xs text-charcoal-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-charcoal-400">{formatRelativeDate(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && (
                    <Link href={n.link} className="text-xs font-medium text-brand-700">
                      View
                    </Link>
                  )}
                  {!n.read_at && (
                    <form action={async () => { "use server"; await markNotificationReadAction(n.id); }}>
                      <Badge variant="info" className="cursor-pointer">
                        <button type="submit">Mark read</button>
                      </Badge>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Preferences</h2>
        <form action={updateNotificationPreferencesAction} className="mt-3 flex flex-col gap-2">
          <Switch
            name="in_app_enabled"
            defaultChecked={prefs?.in_app_enabled ?? true}
            label="In-app notifications"
          />
          <Switch
            name="email_enabled"
            defaultChecked={prefs?.email_enabled ?? true}
            label="Email notifications (sent only if an email provider is configured — see docs/DEPLOYMENT.md)"
          />
          <Button type="submit" size="sm" className="mt-2 self-start">
            Save preferences
          </Button>
        </form>
      </Card>
    </div>
  );
}
