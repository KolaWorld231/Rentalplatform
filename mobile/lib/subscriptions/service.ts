// Hand-ported from ../../../lib/subscriptions/service.ts -- same shapes
// and the same "only a server-verified payment activates a subscription"
// rule, kept in sync by hand (see mobile/README.md).
//
// startMobileCheckout() calls the web app's own authenticated
// /api/mobile/checkout route rather than doing the work itself: a real
// payment provider's createCheckout (MTN MoMo's RequestToPay) needs a
// secret subscription key that must never reach a client bundle, so
// mobile has no way to call it directly -- this is the exact gap mobile
// has no service-role layer for. That route reuses the web's own
// startCheckout() business logic (lib/subscriptions/service.ts)
// unchanged; nothing about checkout initiation is duplicated here. This
// superseded the Foundation-era start_mobile_checkout() RPC, which only
// ever worked for the mock provider (hardcoded provider = 'mock') -- see
// docs/IMPLEMENTATION_STATUS.md.
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
 * The web app's own deployed origin -- its API routes and the mock
 * checkout page both live there (mobile has no server of its own). Set
 * EXPO_PUBLIC_APP_URL to the deployed web app's URL; only falls back to
 * localhost for local development against `npm run dev`.
 */
function webAppOrigin(): string {
  return process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export type MobileCheckoutResult = { kind: "redirect"; redirectUrl: string } | { kind: "pending"; reference: string };

export async function startMobileCheckout(accessToken: string, payerPhone?: string): Promise<MobileCheckoutResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ payerPhone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't start checkout.");
  return data as MobileCheckoutResult;
}

export type MobilePollResult = { status: "pending" | "confirmed" | "failed" | "error"; error?: string };

/**
 * Mobile's equivalent of the web pending page's polling (see
 * components/subscriptions/MomoPendingStatus.tsx) -- MTN's sandbox
 * callbacks are known unreliable, so this is how a push payment (MoMo)
 * actually resolves on mobile too.
 */
export async function checkMobileMomoStatus(accessToken: string, reference: string): Promise<MobilePollResult> {
  const res = await fetch(`${webAppOrigin()}/api/mobile/checkout/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reference }),
  });
  const data = await res.json();
  if (!res.ok) return { status: "error", error: data.error ?? "Couldn't check payment status." };
  return data as MobilePollResult;
}
