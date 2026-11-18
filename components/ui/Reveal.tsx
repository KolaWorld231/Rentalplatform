"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Fades + lifts children into view on scroll.
 *
 * Content is visible at rest. The hidden starting state is applied by the
 * same effect that later reveals it, so it only ever exists once
 * JavaScript is running and is guaranteed to be undone. Server-rendered
 * markup is fully visible, which matters here because this wraps the
 * homepage property grid: it previously shipped at `opacity: 0` and
 * stayed invisible until hydration finished and an IntersectionObserver
 * fired, so on a slow or failed JS load the main content of the page
 * never appeared at all.
 *
 * `armed` tracks whether we've taken over; until then no opacity or
 * transform class is applied, so there is nothing to un-hide.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Already on screen when we got here (above the fold, or hydration
    // finished after the user had scrolled): leave it visible rather
    // than hiding it just to animate it back in.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setArmed(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hidden = armed && !visible;

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
      className={cn(
        "transition-all duration-[var(--motion-reveal)] ease-entrance motion-reduce:transition-none",
        hidden && "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
