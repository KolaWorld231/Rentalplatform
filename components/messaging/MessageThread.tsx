import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDayLabel, isNewDay } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Message } from "@/types/database";

export function MessageThread({
  messages,
  currentUserId,
  counterpartName,
  propertyTitle,
}: {
  messages: Message[];
  currentUserId: string;
  counterpartName: string | null;
  propertyTitle?: string | null;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageCircle className="h-8 w-8 text-charcoal-400" aria-hidden="true" />
        <p className="text-sm font-medium text-charcoal-700">No messages yet.</p>
        <p className="max-w-xs text-sm text-charcoal-500">
          {propertyTitle
            ? `Ask whether ${propertyTitle} is still available, and what the move-in costs include.`
            : "Say hello and ask about the property."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {messages.map((m, i) => {
        const isMine = m.sender_id === currentUserId;
        const prev = messages[i - 1];
        const startsNewDay = isNewDay(m.sent_at, prev?.sent_at);
        // A day break always restarts grouping -- otherwise the first
        // message after a separator loses its avatar and reads as a
        // continuation of something said days earlier.
        const isGroupedWithPrev = !startsNewDay && prev && prev.sender_id === m.sender_id;

        return (
          <div key={m.id}>
            {/*
              Messages only ever showed a clock time, so a thread spanning
              weeks looked like one conversation: there was no way to tell
              whether the owner answered an hour ago or last month, which
              is exactly what "is this still available?" turns on.
            */}
            {startsNewDay && (
              <div className="my-4 flex items-center gap-3" role="separator">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-charcoal-400">
                  {formatDayLabel(m.sent_at)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            <div
              className={cn(
                "flex items-end gap-2",
                isMine ? "justify-end" : "justify-start",
                isGroupedWithPrev ? "mt-0.5" : "mt-3",
              )}
            >
              {!isMine && (
                <div className={cn("w-7 shrink-0", isGroupedWithPrev && "invisible")}>
                  <Avatar name={counterpartName} size="sm" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm",
                  // Own messages were a solid saturated accent fill. Over a
                  // real conversation that makes half the thread a wall of
                  // red -- which both drowns out the places red is meant to
                  // signal something, and reads as "error" in a messaging
                  // context. The soft accent keeps the sender distinction
                  // and the brand, without shouting.
                  isMine
                    ? "bg-accent-soft text-accent-on-soft"
                    : "bg-surface-muted text-charcoal-700",
                )}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                {/* This was text-[10px] at 70% white on the accent fill:
                    3.03:1, under AA, and off the type scale entirely. */}
                <p className={cn("mt-1 text-xs", isMine ? "text-accent-on-soft/80" : "text-charcoal-500")}>
                  <time dateTime={m.sent_at}>
                    {new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
