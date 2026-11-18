"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Anchored floating surface: the search segments and the account menu
 * both need identical dismissal and focus behaviour, so they share one
 * implementation rather than each growing their own.
 *
 * Open state is controlled by the caller. That is what lets a row of
 * segments behave as one control -- opening Budget closes Location,
 * because a single piece of parent state names whichever is open.
 *
 * Behaviour: click or focus outside closes; Escape closes and returns
 * focus to the trigger, so keyboard users are never stranded inside a
 * dismissed panel; focus moves to the first focusable element on open.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  panelClassName,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "dialog";
    "aria-controls": string;
  }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  panelClassName?: string;
  label: string;
}) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onOpenChange(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    // Defer so the panel exists before we reach into it.
    const frame = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div className="relative">
      {trigger({
        ref: triggerRef,
        onClick: () => onOpenChange(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": panelId,
      })}

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            "animate-popover-in absolute top-[calc(100%+0.5rem)] z-50 rounded-[var(--radius-lg)] border border-border bg-surface-overlay p-4 shadow-[var(--shadow-modal)]",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
