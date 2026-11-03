"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { startConversationAction, type StartConversationState } from "@/app/messages/actions";
import { SubscriptionGateDialog } from "@/components/subscriptions/SubscriptionGateDialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const initialState: StartConversationState = {};

export function ContactOwnerForm({
  propertyId,
  isOwnListing,
  propertyTitle,
  ownerName,
}: {
  propertyId: string;
  isOwnListing: boolean;
  propertyTitle: string;
  ownerName: string;
}) {
  const [state, formAction, pending] = useActionState(startConversationAction, initialState);
  const [dismissed, setDismissed] = useState(false);
  const [lastGateReason, setLastGateReason] = useState(state.gateReason);
  // Controlled, not uncontrolled: a Server Action re-render can remount the
  // form, which would otherwise silently wipe whatever the renter typed —
  // caught live, where the gated flow cleared a drafted message on "Not now".
  const [draft, setDraft] = useState("");
  if (state.gateReason !== lastGateReason) {
    setLastGateReason(state.gateReason);
    if (state.gateReason === "subscription_required") setDismissed(false);
  }
  const gateOpen = state.gateReason === "subscription_required" && !dismissed;

  if (isOwnListing) return null;

  return (
    <div className="rounded-[var(--radius-lg)] bg-sage-100 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
        <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Contact the owner
      </p>

      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="propertyId" value={propertyId} />
        <textarea
          name="body"
          rows={3}
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Hi, I'm interested in this property. Is it still available?"
          className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
        />
        {state.error && <p className="text-sm font-medium text-error-500">{state.error}</p>}
        <Button
          type="submit"
          variant="clay"
          loading={pending}
          className="w-full transition-transform active:translate-y-0.5"
        >
          Send message
        </Button>
      </form>
      <p className="mt-2 text-xs text-charcoal-400">
        Subscribe once, message unlimited owners. No per-property fee.
      </p>

      <SubscriptionGateDialog
        open={gateOpen}
        onClose={() => setDismissed(true)}
        propertyTitle={propertyTitle}
        ownerName={ownerName}
      />
    </div>
  );
}

export function ContactOwnerGuestPrompt() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-sage-100 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
        <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Contact the owner
      </p>
      <p className="mt-1 text-sm text-charcoal-500">Log in to message this property&apos;s owner directly.</p>
      <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }), "mt-3 w-full")}>
        Log in
      </Link>
    </div>
  );
}
