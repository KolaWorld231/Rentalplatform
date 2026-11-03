"use client";

import { Home, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils/cn";

/**
 * Entry point for every generic "sign up" trigger (header, mobile menu,
 * login page) that doesn't already know the visitor's intent. Links that
 * already say "List Your Property" etc. keep going straight to
 * `/register?intent=owner` and skip this -- it's only for the ambiguous
 * ones, so the actual registration form always opens with intent already
 * chosen, never asking the question twice.
 */
export function IntentChoiceDialog({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="What brings you to DomiLink?">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/register?intent=renter"
            onClick={() => setOpen(false)}
            className={cn(
              "focus-ring flex flex-col items-start gap-1.5 rounded-[var(--radius-lg)] border-2 border-border bg-surface p-4 text-left transition-all hover:border-brand-600/40",
            )}
          >
            <Search className="h-5 w-5 text-charcoal-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-charcoal-700">Find a property</span>
            <span className="text-xs text-charcoal-500">Browse and message owners</span>
          </Link>
          <Link
            href="/register?intent=owner"
            onClick={() => setOpen(false)}
            className={cn(
              "focus-ring flex flex-col items-start gap-1.5 rounded-[var(--radius-lg)] border-2 border-border bg-surface p-4 text-left transition-all hover:border-clay-500/40",
            )}
          >
            <Home className="h-5 w-5 text-charcoal-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-charcoal-700">List a property</span>
            <span className="text-xs text-charcoal-500">Free, always</span>
          </Link>
        </div>
      </Dialog>
    </>
  );
}
