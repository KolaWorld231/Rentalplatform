import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { subscriptionPlan } from "@/lib/config/brand";
import { simulatePaymentAction } from "./actions";

export const metadata = { title: "Mock Checkout (Development Only)" };

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ txn?: string; ref?: string; amount?: string }>;
}) {
  const { txn, ref, amount } = await searchParams;

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-charcoal-500">This development-only page is disabled in production.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6">
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-warning-100 p-3 text-xs text-warning-500">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Development-only simulator. No real money moves. This exercises the exact same
          webhook-verification and activation code a real payment provider would trigger.
        </div>
        <h1 className="font-display text-xl font-semibold text-charcoal-700">
          {subscriptionPlan.name} — ${amount}
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">Simulate the outcome of this payment.</p>

        <form action={simulatePaymentAction} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="txn" value={txn} />
          <input type="hidden" name="ref" value={ref} />
          <input type="hidden" name="amount" value={amount} />
          <Button type="submit" name="outcome" value="success" className="w-full">
            Simulate successful payment
          </Button>
          <Button type="submit" name="outcome" value="fail" variant="secondary" className="w-full">
            Simulate failed payment
          </Button>
        </form>
      </Card>
    </div>
  );
}
