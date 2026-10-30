import { cn } from "@/lib/utils/cn";
import type { Message } from "@/types/database";

export function MessageThread({ messages, currentUserId }: { messages: Message[]; currentUserId: string }) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-charcoal-400">No messages yet. Say hello.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => {
        const isMine = m.sender_id === currentUserId;
        return (
          <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
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
