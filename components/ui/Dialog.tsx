"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element: it owns focus
 * trapping, Escape-to-close, and the backdrop for free.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
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
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(32rem,90vw)] rounded-[var(--radius-xl)] bg-surface p-0 shadow-[var(--shadow-modal)] backdrop:bg-charcoal-900/40",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 id="dialog-title" className="text-lg font-semibold text-charcoal-700">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="focus-ring rounded-full p-1.5 hover:bg-sage-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
