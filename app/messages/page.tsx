import { MessageCircle } from "lucide-react";
import { ConversationList, getConversationsForUser } from "@/components/messaging/ConversationList";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getConversationsForUser();

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-5xl px-0 sm:px-6">
      <aside className="flex w-full flex-col overflow-y-auto border-border lg:w-[340px] lg:shrink-0 lg:border-r">
        <h1 className="px-4 pt-6 font-display text-xl font-semibold text-charcoal-700">Messages</h1>
        <div className="mt-2 flex-1 overflow-y-auto">
          <ConversationList conversations={conversations} currentUserId={user.id} />
        </div>
      </aside>

      <div className="hidden flex-1 flex-col items-center justify-center gap-2 text-center lg:flex">
        <MessageCircle className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
        <p className="text-sm text-charcoal-500">Select a conversation to read and reply.</p>
      </div>
    </div>
  );
}
