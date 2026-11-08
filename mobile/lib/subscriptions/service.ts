// Hand-ported from ../../../lib/subscriptions/service.ts -- same shapes
// and the same "only a server-verified payment activates a subscription"
// rule, kept in sync by hand (see mobile/README.md).
//
// Deliberately read-only: mobile never initiates a Direct Access Pass
// purchase -- see app/pricing.tsx's doc comment for why (the App Store/
// Play Store in-app-purchase policy decision, recorded in
// docs/IMPLEMENTATION_STATUS.md). This file only reads subscription
// state; web's own lib/subscriptions/service.ts keeps the full
// checkout flow, since that rule doesn't apply to a website.
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
