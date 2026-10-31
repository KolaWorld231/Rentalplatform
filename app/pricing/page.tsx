import { CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SavingsCalculator } from "@/components/subscriptions/SavingsCalculator";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { formatExpiryDate, formatUsd } from "@/lib/utils/format";
import { startCheckoutAction } from "../checkout/actions";

export const metadata = { title: "Pricing" };

const agentColumn = [
  "$30–40 charged per property viewing",
  "Pay again for every new property",
  "No guarantee the viewing leads anywhere",
  "Access ends the moment the agent decides",
];

const passColumn = [
  `$${subscriptionPlan.priceUsd} once, for ${subscriptionPlan.durationDays} days`,
  "Message as many owners as you like — no extra fee",
  "Payments verified server-side before activation",
  "Conversations stay visible even after it expires",
  "Manual renewal — no surprise auto-billing",
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

      {!active && (
        <div className="mt-8">
          <SavingsCalculator passPriceUsd={subscriptionPlan.priceUsd} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-semibold text-charcoal-400">Paying an agent per viewing</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {agentColumn.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-charcoal-500">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-error-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="relative overflow-hidden border-2 border-brand-600 p-6 shadow-[var(--shadow-clay-raised)]">
          <Badge variant="brand" className="absolute right-4 top-4">
            Best value
          </Badge>
          <p className="text-sm font-semibold text-brand-700">{subscriptionPlan.name}</p>
          <p className="mt-2 font-display text-4xl font-semibold text-brand-800">
            {formatUsd(subscriptionPlan.priceUsd)}
            <span className="text-base font-normal text-charcoal-400"> / {subscriptionPlan.durationDays} days</span>
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {passColumn.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-charcoal-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 p-8 text-center">
        {active ? (
          <div>
            <Badge variant="success">Active</Badge>
            <p className="mt-2 text-sm text-charcoal-500">
              Your pass is active until {active.expires_at && formatExpiryDate(active.expires_at)}.
            </p>
          </div>
        ) : (
          <form action={startCheckoutAction}>
            <Button
              type="submit"
              variant="clay"
              size="lg"
              className="w-full transition-transform active:translate-y-0.5 sm:w-auto"
            >
              Subscribe for {formatUsd(subscriptionPlan.priceUsd)}
            </Button>
          </form>
        )}
        <p className="mt-3 text-xs text-charcoal-400">
          One-time charge, not a recurring subscription. Renew manually anytime.
        </p>
      </Card>

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
