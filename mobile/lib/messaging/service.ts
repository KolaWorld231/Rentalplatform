// Hand-ported from ../../../services/messaging.ts and
// ../../../components/messaging/ConversationList.tsx -- same RLS-enforced
// subscription gate (conversations_insert_renter, see
// supabase/migrations/20260104000100_messaging.sql), kept in sync by hand
// (see mobile/README.md). No new RPC needed here: the gate is a plain
// INSERT policy, so it's exactly as trustworthy called from the anon
// client as from a Server Action -- Postgres evaluates it either way.
import { supabase } from "../supabase";
import type { Conversation, Message } from "../database.types";

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; reason: "subscription_required" | "own_property" | "not_found" | "unknown" };

export async function startOrContinueConversation(params: {
  propertyId: string;
  renterId: string;
  firstMessage: string;
}): Promise<StartConversationResult> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("property_id", params.propertyId)
    .eq("renter_id", params.renterId)
    .maybeSingle();

  let conversationId = existing?.id;

  if (!conversationId) {
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

  const { error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: params.renterId, body: params.firstMessage });
  if (msgError) return { ok: false, reason: "unknown" };

  return { ok: true, conversationId };
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, body });
  return error ? { error: error.message } : {};
}

export async function markConversationRead(conversationId: string, role: "renter" | "owner") {
  const now = new Date().toISOString();
  const update = role === "renter" ? { renter_last_read_at: now } : { owner_last_read_at: now };
  await supabase.from("conversations").update(update).eq("id", conversationId);
}

export type ConversationRow = Conversation & {
  properties: { title: string; slug: string; property_images: { storage_path: string; is_cover: boolean }[] } | null;
  renter_profile: { display_name: string } | null;
  owner_profile: { display_name: string } | null;
};

export async function getConversationsForUser(): Promise<ConversationRow[]> {
  const { data } = await supabase
    .from("conversations")
    .select(
      "*, properties(title, slug, property_images(storage_path, is_cover)), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)",
    )
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as ConversationRow[];
}

export async function getConversationDetail(id: string): Promise<ConversationRow | null> {
  const { data } = await supabase
    .from("conversations")
    .select(
      "*, properties(title, slug, property_images(storage_path, is_cover)), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)",
    )
    .eq("id", id)
    .maybeSingle();
  return data as unknown as ConversationRow | null;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("sent_at", { ascending: true });
  return data ?? [];
}
