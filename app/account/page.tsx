import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionHistory } from "@/lib/subscriptions/service";
import { formatRelativeDate, formatUsd } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { ProfileForm } from "./ProfileForm";

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  pending_payment: "warning",
  payment_failed: "error",
  expired: "neutral",
  cancelled: "neutral",
  refunded: "neutral",
  suspended: "error",
};

export default async function AccountPage() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  const history = await getSubscriptionHistory(supabase, user.id);
  const current = history[0];
  const isActive = current?.status === "active" && current.expires_at && new Date(current.expires_at) > new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Account settings</h1>
      <p className="mt-1 text-sm text-charcoal-500">{user.email}</p>

      <Card className="mt-6 p-6">
        <ProfileForm displayName={profile?.display_name ?? ""} phone={profile?.phone ?? null} />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Direct Access Pass</h2>
        {current ? (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <Badge variant={STATUS_VARIANT[current.status] ?? "neutral"}>
                {current.status.replace("_", " ")}
              </Badge>
              {isActive && current.expires_at && (
                <p className="mt-1 text-sm text-charcoal-500">
                  Expires {formatRelativeDate(current.expires_at)}
                </p>
              )}
            </div>
            {!isActive && (
              <Link href="/pricing" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
                Renew
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-charcoal-500">No subscription yet.</p>
            <Link href="/pricing" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Subscribe
            </Link>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">
              Payment history
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {history.flatMap((s) =>
                (s.payment_transactions ?? []).map((t, i: number) => (
                  <li key={`${s.id}-${i}`} className="flex justify-between text-sm text-charcoal-600">
                    <span>{formatRelativeDate(t.created_at)}</span>
                    <span>{formatUsd(t.amount)}</span>
                    <Badge variant={t.status === "confirmed" ? "success" : t.status === "failed" ? "error" : "neutral"}>
                      {t.status}
                    </Badge>
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
      </Card>

      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="secondary">
          Log out
        </Button>
      </form>
    </div>
  );
}
