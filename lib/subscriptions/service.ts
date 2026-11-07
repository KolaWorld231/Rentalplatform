import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPaymentProvider } from "@/lib/payments";
import type { Database, PaymentTransaction, Subscription } from "@/types/database";

export async function getActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export type SubscriptionWithTransactions = Subscription & {
  payment_transactions: Pick<PaymentTransaction, "amount" | "currency" | "status" | "created_at">[];
};

export async function getSubscriptionHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SubscriptionWithTransactions[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*, payment_transactions(amount, currency, status, created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as SubscriptionWithTransactions[];
}

/**
 * Starts a checkout: creates a `pending_payment` subscription row and an
 * `initiated` payment transaction row (both via the service-role client,
 * since `subscriptions` has no client-writable INSERT policy at all —
 * see the M4 migration), then asks the configured payment provider to
 * start the payment. The result is either a redirect URL (card-style
 * providers, the mock provider) or a `pending` reference (MTN MoMo's
 * push-payment flow — see `app/checkout/momo/pending/page.tsx`). Nothing
 * here marks anything as paid; that only happens after independent
 * verification, via the webhook handler or `checkMomoPaymentStatusAction`'s
 * poll, both of which funnel through `processVerifiedPaymentEvent`.
 */
export async function startCheckout(userId: string, returnUrl: string, payerPhone?: string) {
  const admin = createServiceRoleClient();
  const provider = getPaymentProvider();

  if (provider.requiresPayerPhone && !payerPhone) {
    throw new Error("A mobile money phone number is required for this payment method.");
  }

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (planError || !plan) throw new Error("No active subscription plan is configured.");

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .insert({ user_id: userId, plan_id: plan.id, status: "pending_payment" })
    .select("id")
    .single();
  if (subError || !subscription) throw new Error("Couldn't start checkout.");

  const { data: transaction, error: txnError } = await admin
    .from("payment_transactions")
    .insert({
      user_id: userId,
      subscription_id: subscription.id,
      provider: provider.name,
      amount: plan.price_usd,
      currency: "USD",
      status: "initiated",
    })
    .select("id, internal_reference")
    .single();
  if (txnError || !transaction) throw new Error("Couldn't start checkout.");

  const checkout = await provider.createCheckout({
    transactionId: transaction.id,
    internalReference: transaction.internal_reference,
    amountUsd: Number(plan.price_usd),
    userId,
    returnUrl,
    payerPhone,
  });

  return checkout;
}
