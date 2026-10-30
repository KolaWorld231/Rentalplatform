"use client";

import { Send } from "lucide-react";
import { useActionState, useRef } from "react";
import { sendMessageAction } from "@/app/messages/actions";
import { Button } from "@/components/ui/Button";
import type { ActionState } from "@/lib/auth/actions";

const initialState: ActionState = {};

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const action = sendMessageAction.bind(null, conversationId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 border-t border-border p-4"
    >
      <div className="flex gap-2">
        <label htmlFor="message-body" className="sr-only">
          Message
        </label>
        <textarea
          id="message-body"
          name="body"
          rows={2}
          required
          placeholder="Write a reply…"
          className="focus-ring flex-1 rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
        />
        <Button type="submit" loading={pending} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {state.error && <p className="text-sm font-medium text-error-500">{state.error}</p>}
    </form>
  );
}
