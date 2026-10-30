import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageThread } from "@/components/messaging/MessageThread";
import { RealtimeMessageListener } from "@/components/messaging/RealtimeMessageListener";
import { ReportConversationButton } from "@/components/messaging/ReportConversationButton";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/types/database";
import { markConversationReadAction } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

type ConversationDetail = Conversation & {
  properties: { title: string; slug: string } | null;
  renter_profile: { display_name: string } | null;
  owner_profile: { display_name: string } | null;
};

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const supabase = await createClient();

  const { data: conversation } = (await supabase
    .from("conversations")
    .select(
      "*, properties(title, slug), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)",
    )
    .eq("id", id)
    .maybeSingle()) as { data: ConversationDetail | null };

  if (!conversation) notFound();
  const isRenter = conversation.renter_id === user.id;
  if (!isRenter && conversation.owner_id !== user.id) notFound();

  const { data: messages } = (await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true })) as { data: Message[] | null };

  await markConversationReadAction(id, isRenter ? "renter" : "owner");

  const counterpart = isRenter ? conversation.owner_profile?.display_name : conversation.renter_profile?.display_name;
  const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col px-4 sm:px-6">
      <RealtimeMessageListener conversationId={id} />
      <div className="flex items-center justify-between gap-3 border-b border-border py-4">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="focus-ring rounded-full p-1.5 hover:bg-sage-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-charcoal-700">{counterpart ?? "Unknown user"}</p>
            {conversation.properties && (
              <Link
                href={`/properties/${conversation.properties.slug}`}
                className="text-xs text-charcoal-400 hover:text-brand-700"
              >
                {conversation.properties.title}
              </Link>
            )}
          </div>
        </div>
        <ReportConversationButton conversationId={id} latestMessageId={lastMessage?.id ?? null} />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <MessageThread messages={messages ?? []} currentUserId={user.id} />
      </div>

      <MessageComposer conversationId={id} />
    </div>
  );
}
