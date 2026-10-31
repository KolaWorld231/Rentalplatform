import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/types/database";

export function MessageThread({
  messages,
  currentUserId,
  counterpartName,
}: {
  messages: Message[];
  currentUserId: string;
  counterpartName: string | null;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageCircle className="h-8 w-8 text-charcoal-400" aria-hidden="true" />
        <p className="text-sm font-medium text-charcoal-700">No messages yet.</p>
        <p className="text-sm text-charcoal-400">Say hello and ask about the property.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {messages.map((m, i) => {
        const isMine = m.sender_id === currentUserId;
        const prev = messages[i - 1];
        const isGroupedWithPrev = prev && prev.sender_id === m.sender_id;

        return (
          <div
            key={m.id}
            className={cn("flex items-end gap-2", isMine ? "justify-end" : "justify-start", isGroupedWithPrev ? "mt-0.5" : "mt-3")}
          >
            {!isMine && (
              <div className={cn("w-7", isGroupedWithPrev && "invisible")}>
                <Avatar name={counterpartName} size="sm" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm",
                isMine ? "bg-brand-600 text-ivory-50" : "bg-sage-100 text-charcoal-700",
              )}
            >
              <p className="whitespace-pre-line">{m.body}</p>
              <p className={cn("mt-1 text-[10px]", isMine ? "text-ivory-50/70" : "text-charcoal-400")}>
                {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
