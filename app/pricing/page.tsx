import { CheckCircle2, MessageCircle, Repeat, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { formatRelativeDate } from "@/lib/utils/format";
import { startCheckoutAction } from "../checkout/actions";

export const metadata = { title: "Pricing" };

const benefits = [
  "Message as many property owners as you like",
  "No additional fee per property you contact",
  "30 days of access from activation",
  "Existing conversations stay visible even after it expires",
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; error?: string }>;
}) {
  const { payment, error } = await searchParams;
  const user = await getCurrentUser();
  let active = null;
  if (user) {
    const supabase = await createClient();
    active = await getActiveSubscription(supabase, user.id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-charcoal-700">
          {brand.subscriptionHeading}
        </h1>
        <p className="mt-2 text-sm text-charcoal-500">{brand.subscriptionSupportingCopy}</p>
      </div>

      {payment === "success" && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-success-100 px-4 py-3 text-sm text-success-500">
          Payment confirmed — your Direct Access Pass is active.
        </p>
      )}
      {payment === "failed" && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-error-100 px-4 py-3 text-sm text-error-500">
          That payment wasn&apos;t confirmed. No charge was applied — you can try again below.
        </p>
      )}
      {error === "checkout_failed" && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-error-100 px-4 py-3 text-sm text-error-500">
          Couldn&apos;t start checkout. Please try again.
        </p>
      )}

      <Card className="mt-8 p-8 text-center">
        <p className="font-display text-5xl font-semibold text-brand-800">
          ${subscriptionPlan.priceUsd}
        </p>
        <p className="mt-1 text-sm text-charcoal-500">for {subscriptionPlan.durationDays} days</p>

        <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-charcoal-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {active ? (
            <div>
              <Badge variant="success">Active</Badge>
              <p className="mt-2 text-sm text-charcoal-500">
                Your pass is active until {active.expires_at && formatRelativeDate(active.expires_at)}.
              </p>
            </div>
          ) : (
            <form action={startCheckoutAction}>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Subscribe for ${subscriptionPlan.priceUsd}
              </Button>
            </form>
          )}
          <p className="mt-3 text-xs text-charcoal-400">
            One-time charge, not a recurring subscription. Renew manually anytime.
          </p>
        </div>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 text-center">
          <MessageCircle className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-charcoal-600">Direct owner messaging, no per-inquiry fee</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-charcoal-600">Payments verified server-side before activation</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Repeat className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-charcoal-600">Manual renewal — no surprise auto-billing</p>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-charcoal-400">
        Questions about payment? Visit{" "}
        <a href="/help" className="font-medium text-brand-700">
          Help &amp; Support
        </a>
        .
      </p>
    </div>
  );
}
