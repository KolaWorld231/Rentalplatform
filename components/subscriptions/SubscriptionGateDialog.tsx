"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { subscriptionPlan } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

const benefits = [
  "Message as many owners as you like — no extra fee",
  "30 days of unlimited direct messaging",
  "Payments verified server-side before activation",
];

export function SubscriptionGateDialog({
  open,
  onClose,
  propertyTitle,
  ownerName,
}: {
  open: boolean;
  onClose: () => void;
  propertyTitle: string;
  ownerName: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Unlock direct messaging">
      <div className="flex flex-col items-center gap-3 text-center">
        <MessageCircle className="h-10 w-10 text-brand-600" aria-hidden="true" />
        <p className="font-display text-lg font-semibold text-charcoal-700">
          Message {ownerName} about &ldquo;{propertyTitle}&rdquo;
        </p>
        <p className="text-sm text-charcoal-500">
          Your message is saved — get the Direct Access Pass and it sends right away.
        </p>

        <div className="w-full rounded-[var(--radius-lg)] bg-ivory-100 p-5 shadow-[var(--shadow-clay-raised)]">
          <p className="font-display text-2xl font-semibold text-brand-800">
            Unlimited messaging
            <span className="block text-base font-normal text-charcoal-400">
              for {subscriptionPlan.durationDays} days
            </span>
          </p>
          <p className="mt-1 text-xs text-charcoal-400">
            One subscription — cheaper than paying per viewing through an agent, for every owner
            you contact.
          </p>
          <ul className="mx-auto mt-4 flex max-w-xs flex-col gap-1.5 text-left">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-charcoal-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/pricing"
          className={cn(
            buttonVariants({ variant: "clay", size: "lg" }),
            "w-full transition-transform active:translate-y-0.5",
          )}
        >
          Get the {subscriptionPlan.name}
        </Link>
        <Button variant="ghost" onClick={onClose} className="w-full">
          Not now — keep my message
        </Button>
      </div>
    </Dialog>
  );
}
