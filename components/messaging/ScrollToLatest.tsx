"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the thread pinned to the newest message.
 *
 * The thread renders oldest-first inside an `overflow-y-auto` container
 * and nothing ever scrolled it, so opening a conversation put you at the
 * very first message -- on anything longer than a screen, the reply you
 * came to read was below the fold every single time.
 *
 * The first run jumps instantly (an animated scroll on page load reads as
 * a glitch); later runs, which happen when Realtime refreshes the tree
 * after a new message, animate so the arrival is visible.
 */
export function ScrollToLatest({ messageId }: { messageId: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      behavior: hasScrolled.current && !reduced ? "smooth" : "auto",
      block: "end",
    });
    hasScrolled.current = true;
  }, [messageId]);

  return <div ref={ref} aria-hidden="true" />;
}
