import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const RATE_LIMIT_MAX_MESSAGES = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; reason: "subscription_required" | "own_property" | "not_found" | "unknown" };

/**
 * Creates a new conversation (or finds the existing one for this
 * property/renter pair) and sends the opening message. The subscription
 * gate itself is enforced by RLS on the `conversations` INSERT
 * (`conversations_insert_renter` — see the M5 migration); this function's
 * job is to translate the resulting Postgres error into a UI-friendly
 * reason and to handle the "conversation already exists, just send into
 * it" case so a renter can message an owner about a second property
 * without hitting the unique constraint as an error.
 */
export async function startOrContinueConversation(
  supabase: SupabaseClient<Database>,
  params: { propertyId: string; renterId: string; firstMessage: string },
): Promise<StartConversationResult> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("property_id", params.propertyId)
    .eq("renter_id", params.renterId)
    .maybeSingle();

  let conversationId = existing?.id;

  if (!conversationId) {
    // owner_id is a required NOT NULL column but is always overwritten by
    // the enforce_conversation_owner trigger (see the M5 migration) before
    // the row is stored — the real owner_id is derived server-side from
    // the property, never trusted from here.
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ property_id: params.propertyId, renter_id: params.renterId, owner_id: params.renterId })
      .select("id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, reason: "subscription_required" };
      if (error.message.includes("own property")) return { ok: false, reason: "own_property" };
      if (error.message.includes("not found")) return { ok: false, reason: "not_found" };
      return { ok: false, reason: "unknown" };
    }
    conversationId = created.id;
  }

  const rateLimit = await checkRateLimit(supabase, params.renterId);
  if (!rateLimit.allowed) return { ok: false, reason: "unknown" };

  const { error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: params.renterId, body: params.firstMessage });
  if (msgError) return { ok: false, reason: "unknown" };

  return { ok: true, conversationId };
}

export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  senderId: string,
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", senderId)
    .gte("sent_at", since);

  return { allowed: (count ?? 0) < RATE_LIMIT_MAX_MESSAGES };
}

export async function markConversationRead(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  role: "renter" | "owner",
) {
  const now = new Date().toISOString();
  const update = role === "renter" ? { renter_last_read_at: now } : { owner_last_read_at: now };
  await supabase.from("conversations").update(update).eq("id", conversationId);
}
