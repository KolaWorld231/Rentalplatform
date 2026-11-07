// Hand-ported from ../../../lib/subscriptions/service.ts -- same shapes
// and the same "only a server-verified payment activates a subscription"
// rule, kept in sync by hand (see mobile/README.md).
//
// startMobileCheckout() is mobile's equivalent of the web's
// startCheckout() Server Action. `subscriptions` has no client INSERT
// policy at all, so the actual row-creation happens inside the
// start_mobile_checkout() SECURITY DEFINER RPC (see
// supabase/migrations/20261107000200_mobile_checkout_rpc.sql) -- this
// function then builds the exact same checkout handoff URL the web
// MockPaymentProvider.createCheckout() builds, and the mobile app opens
// it in an in-app browser. Everything after that (the checkout page,
// webhook verification, confirm_payment_and_activate_subscription) is
// the web app's existing, already-tested code -- nothing is duplicated
// there, only the "create a pending checkout for myself" write.
import { supabase } from "../supabase";
import type { Subscription } from "../database.types";

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
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

export async function getSubscriptionHistory(userId: string): Promise<Subscription[]> {
  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * The web app's own deployed origin -- the mock checkout page and the
 * payments webhook it posts to both live there (mobile has no server of
 * its own). Set EXPO_PUBLIC_APP_URL to the deployed web app's URL; only
 * falls back to localhost for local development against `npm run dev`.
 */
function webAppOrigin(): string {
  return process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function startMobileCheckout(): Promise<{ checkoutUrl: string }> {
  const { data, error } = await supabase.rpc("start_mobile_checkout");
  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? "Couldn't start checkout.");
  }
  const row = data[0];

  const url = new URL("/checkout/mock", webAppOrigin());
  url.searchParams.set("txn", row.transaction_id);
  url.searchParams.set("ref", row.internal_reference);
  url.searchParams.set("amount", row.amount.toFixed(2));
  return { checkoutUrl: url.toString() };
}
