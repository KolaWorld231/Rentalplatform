"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";
import { reportMessageAction } from "@/app/messages/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ActionState } from "@/lib/auth/actions";

const REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "Harassment" },
  { value: "suspicious_message", label: "Suspicious message" },
  { value: "fraudulent_payment_request", label: "Fraudulent payment request" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

const initialState: ActionState = {};

export function ReportConversationButton({
  conversationId,
  latestMessageId,
}: {
  conversationId: string;
  latestMessageId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const action = reportMessageAction.bind(null, latestMessageId ?? "", conversationId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!latestMessageId) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        Report
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Report this conversation">
        {submitted ? (
          <p className="text-sm text-charcoal-700">Thanks — a moderator will review this.</p>
        ) : (
          <form
            action={async (formData) => {
              await formAction(formData);
              setSubmitted(true);
            }}
            className="flex flex-col gap-4"
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-charcoal-700">Reason</legend>
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-charcoal-700">
                  <input type="radio" name="reason" value={r.value} required className="h-4 w-4" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <textarea
              name="details"
              rows={3}
              placeholder="Additional details (optional)"
              className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
            />
            {state.error && <p className="text-sm font-medium text-error-500">{state.error}</p>}
            <Button type="submit" loading={pending} className="w-full">
              Submit report
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
