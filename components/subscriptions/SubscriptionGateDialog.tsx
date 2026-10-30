"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

export function SubscriptionGateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Unlock direct messaging">
      <div className="flex flex-col items-center gap-3 text-center">
        <MessageCircle className="h-10 w-10 text-brand-600" aria-hidden="true" />
        <p className="font-display text-lg font-semibold text-charcoal-700">
          {brand.subscriptionHeading}
        </p>
        <p className="text-sm text-charcoal-500">{brand.subscriptionSupportingCopy}</p>
        <p className="font-display text-3xl font-semibold text-brand-800">
          ${subscriptionPlan.priceUsd}{" "}
          <span className="text-base font-normal text-charcoal-400">
            / {subscriptionPlan.durationDays} days
          </span>
        </p>
        <Link href="/pricing" className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
          Get the {subscriptionPlan.name}
        </Link>
        <Button variant="ghost" onClick={onClose} className="w-full">
          Not now
        </Button>
      </div>
    </Dialog>
  );
}
