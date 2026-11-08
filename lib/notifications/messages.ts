import "server-only";
import { notifyUser } from "@/lib/admin/audit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Conversation } from "@/types/database";

type ConversationDetail = Conversation & {
  properties: { title: string } | null;
  renter_profile: { display_name: string } | null;
  owner_profile: { display_name: string } | null;
};

/**
 * Shared by web's sendMessageAction/startConversationAction
 * (app/messages/actions.ts) and mobile's authenticated
 * app/api/mobile/messages/notify/route.ts -- one place that decides who
 * the recipient is and what the notification says, so the two clients'
 * very different message-insert paths (a Server Action vs. mobile's own
 * anon-client insert) still produce identical notifications/pushes.
 * Uses the service-role client for this lookup regardless of which
 * client performed the actual insert -- notifying the other party is a
 * privileged side effect, not something either participant's own RLS
 * grant needs to cover.
 */
export async function notifyMessageRecipient(conversationId: string, senderId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: conversation } = (await admin
    .from("conversations")
    .select("renter_id, owner_id, properties(title), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)")
    .eq("id", conversationId)
    .maybeSingle()) as { data: ConversationDetail | null };
  if (!conversation) return;

  const isSenderRenter = conversation.renter_id === senderId;
  const recipientId = isSenderRenter ? conversation.owner_id : conversation.renter_id;
  const senderName = isSenderRenter ? conversation.renter_profile?.display_name : conversation.owner_profile?.display_name;
  const propertyTitle = conversation.properties?.title ?? "your listing";

  await notifyUser({
    userId: recipientId,
    type: "new_message",
    title: `New message from ${senderName ?? "someone"}`,
    body: `About ${propertyTitle}`,
    link: `/messages/${conversationId}`,
  });
}
