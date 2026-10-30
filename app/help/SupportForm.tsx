"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/lib/auth/actions";
import { submitSupportTicketAction } from "./actions";

const initialState: ActionState = {};

export function SupportForm() {
  const [state, formAction, pending] = useActionState(submitSupportTicketAction, initialState);
  const submitted = !pending && !state.error && !state.fieldErrors && state !== initialState;

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-success-500" aria-hidden="true" />
        <p className="font-medium text-charcoal-700">Request received</p>
        <p className="text-sm text-charcoal-500">Our team will follow up by email.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Subject" name="subject" required error={state.fieldErrors?.subject} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
        What do you need help with?
        <textarea
          name="message"
          rows={5}
          required
          className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
        />
        {state.fieldErrors?.message && (
          <span className="text-xs font-medium text-error-500">{state.fieldErrors.message}</span>
        )}
      </label>
      {state.error && <p className="text-sm font-medium text-error-500">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">
        Submit request
      </Button>
    </form>
  );
}
