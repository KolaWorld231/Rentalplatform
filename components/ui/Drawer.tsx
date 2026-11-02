"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "bottom" | "right";
}

/**
 * Mobile-first bottom sheet (used for search filters) that becomes a
 * right-hand drawer on larger screens. Built on <dialog> for focus
 * trapping and Escape-to-close.
 */
export function Drawer({ open, onClose, title, children, side = "bottom" }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="drawer-title"
      data-drawer-side={side}
      className={cn(
        "m-0 max-h-[85vh] w-full bg-surface p-0 shadow-[var(--shadow-modal)] backdrop:bg-charcoal-900/40",
        side === "bottom"
          ? "fixed inset-x-0 bottom-0 rounded-t-[var(--radius-xl)]"
          : "fixed inset-y-0 right-0 h-full w-[min(24rem,90vw)] rounded-l-[var(--radius-xl)] sm:left-auto",
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 id="drawer-title" className="text-lg font-semibold text-charcoal-700">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring rounded-full p-1.5 hover:bg-sage-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
