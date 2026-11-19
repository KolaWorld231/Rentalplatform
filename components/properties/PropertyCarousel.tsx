"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Horizontal collection row.
 *
 * Scrolling is native overflow rather than a transform track, so touch,
 * trackpad and shift+wheel all work without being reimplemented, and the
 * row stays usable if JavaScript never runs -- the arrows are the only
 * part that needs it, and they are hidden until they can function.
 *
 * The scrollbar is hidden visually but the container keeps
 * `tabindex="0"` and a focus ring, so a keyboard user can still reach
 * the row and scroll it with arrow keys; hiding the bar without that
 * would strip the only non-pointer way to move it.
 */
export function PropertyCarousel({
  title,
  subtitle,
  viewAllHref,
  children,
  itemCount,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  children: ReactNode;
  itemCount: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // A row that fits entirely has max 0: both ends are true, so both
    // arrows render disabled rather than teasing a scroll that cannot
    // happen.
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, itemCount]);

  function page(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.8),
      behavior: reduced ? "auto" : "smooth",
    });
  }

  const scrollable = !(atStart && atEnd);

  return (
    <section className="mt-10 first:mt-0">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-charcoal-700">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-charcoal-500">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="focus-ring rounded-[var(--radius-sm)] text-sm font-medium text-accent-text"
            >
              View all
            </Link>
          )}
          {scrollable && (
            <div className="hidden items-center gap-1 sm:flex">
              <ArrowButton label={`Scroll ${title} backwards`} disabled={atStart} onClick={() => page(-1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </ArrowButton>
              <ArrowButton label={`Scroll ${title} forwards`} disabled={atEnd} onClick={() => page(1)}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </ArrowButton>
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={sync}
        tabIndex={0}
        role="group"
        aria-label={title}
        className="focus-ring scrollbar-none mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 motion-reduce:scroll-auto"
      >
        {children}
      </div>
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring u-press flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-raised text-charcoal-700 transition-[transform,box-shadow,opacity,border-color] duration-[var(--motion-fast)] ease-standard hover:border-charcoal-400 hover:shadow-[var(--shadow-raised)] motion-reduce:transition-none",
        // Fading rather than unmounting at the ends: an arrow that
        // disappears shifts the pair sideways and moves the other arrow
        // out from under the pointer mid-scroll.
        disabled && "cursor-not-allowed opacity-40 hover:border-border hover:shadow-none",
      )}
    >
      {children}
    </button>
  );
}
