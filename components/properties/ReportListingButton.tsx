"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";
import { reportPropertyAction } from "@/app/properties/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ActionState } from "@/lib/auth/actions";

const REASONS: { value: string; label: string }[] = [
  { value: "fake_listing", label: "This looks like a fake listing" },
  { value: "misleading_price", label: "The price is misleading" },
  { value: "already_rented", label: "This property is already rented" },
  { value: "unauthorized_representative", label: "The poster may not be authorized" },
  { value: "impersonation", label: "Impersonation" },
  { value: "harassment", label: "Harassment" },
  { value: "fraudulent_payment_request", label: "Fraudulent payment request" },
  { value: "suspicious_message", label: "Suspicious message" },
  { value: "other", label: "Other" },
];

const initialState: ActionState = {};

export function ReportListingButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const action = reportPropertyAction.bind(null, propertyId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        Report listing
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Report this listing">
        {submitted ? (
          <p className="text-sm text-charcoal-700">
            Thanks — your report has been sent to our moderation team for review.
          </p>
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
            <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
              Additional details (optional)
              <textarea
                name="details"
                rows={3}
                className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
              />
            </label>
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
