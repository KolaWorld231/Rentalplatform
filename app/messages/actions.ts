"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { notifyMessageRecipient } from "@/lib/notifications/messages";
import { createClient } from "@/lib/supabase/server";
import { reportMessageSchema, sendMessageSchema, startConversationSchema } from "@/lib/validation/messaging";
import { checkRateLimit, markConversationRead, startOrContinueConversation } from "@/services/messaging";
import type { ActionState } from "@/lib/auth/actions";

export interface StartConversationState extends ActionState {
  gateReason?: "subscription_required" | "own_property" | "not_found" | "unknown";
}

export async function startConversationAction(
  _prev: StartConversationState,
  formData: FormData,
): Promise<StartConversationState> {
  const user = await requireUser();

  const parsed = startConversationSchema.safeParse({
    propertyId: formData.get("propertyId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: "Please write a message." };
  }

  const supabase = await createClient();
  const result = await startOrContinueConversation(supabase, {
    propertyId: parsed.data.propertyId,
    renterId: user.id,
    firstMessage: parsed.data.body,
  });

  if (!result.ok) {
    if (result.reason === "subscription_required") {
      return { gateReason: "subscription_required" };
    }
    if (result.reason === "own_property") {
      return { error: "You can't start a conversation about your own listing." };
    }
    return { error: "Couldn't send your message. Please try again." };
  }

  await notifyMessageRecipient(result.conversationId, user.id);
  revalidatePath("/messages");
  redirect(`/messages/${result.conversationId}`);
}

export async function sendMessageAction(
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = sendMessageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: "Write a message before sending." };
  }

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id);
  if (!rateLimit.allowed) {
    return { error: "You're sending messages too quickly. Please wait a moment and try again." };
  }

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: parsed.data.body });

  if (error) {
    return { error: "Couldn't send your message. Please try again." };
  }

  await notifyMessageRecipient(conversationId, user.id);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}

export async function markConversationReadAction(conversationId: string, role: "renter" | "owner") {
  const supabase = await createClient();
  await markConversationRead(supabase, conversationId, role);
}

export async function reportMessageAction(
  messageId: string,
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reportMessageSchema.safeParse({
    reason: formData.get("reason"),
    details: formData.get("details"),
  });
  if (!parsed.success) {
    return { error: "Please choose a reason for this report." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("message_reports").insert({
    message_id: messageId,
    conversation_id: conversationId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    return { error: "Couldn't submit your report." };
  }

  return {};
}
