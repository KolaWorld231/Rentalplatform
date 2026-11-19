"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils/cn";

const MAX_CYCLE_IMAGES = 5;
const CYCLE_INTERVAL_MS = 900;

/**
 * Cover photo that cycles through a property's other photos while
 * hovered/focused, crossfading via stacked absolutely-positioned images
 * (no carousel library). Falls back to a single static image when there's
 * only one photo, or none at all.
 */
export function PropertyCardMedia({
  storagePaths,
  alt,
}: {
  storagePaths: string[];
  alt: string;
}) {
  const paths = storagePaths.slice(0, MAX_CYCLE_IMAGES);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Per-image decode state, and the reason it is three-valued rather
   * than a boolean.
   *
   * Absent means "nothing has told us anything", which is exactly the
   * server-rendered case: the image renders visible. Server markup must
   * never carry an `opacity-0` that only client JavaScript can clear --
   * this component draws the cover photo of every listing in the app,
   * so with JS slow, blocked or failed the whole marketplace would be
   * empty boxes. That bug has been shipped on this page before.
   *
   * The ref callback runs on the client only, never during SSR, so it
   * doubles as the hydration signal and no separate flag (or effect) is
   * needed. It also catches the cached case: an image can finish
   * decoding before React attaches `onLoad`, which would otherwise
   * leave it faded out forever on a repeat visit.
   */
  const [status, setStatus] = useState<Record<string, "loading" | "loaded">>({});

  function attach(node: HTMLImageElement | null, path: string) {
    if (!node) return;
    const next = node.complete ? "loaded" : "loading";
    setStatus((prev) => (prev[path] === next || prev[path] === "loaded" ? prev : { ...prev, [path]: next }));
  }

  function markLoaded(path: string) {
    setStatus((prev) => (prev[path] === "loaded" ? prev : { ...prev, [path]: "loaded" }));
  }

  function startCycling() {
    if (paths.length < 2 || timerRef.current) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % paths.length);
    }, CYCLE_INTERVAL_MS);
  }

  function stopCycling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveIndex(0);
  }

  if (paths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-muted text-sm text-charcoal-500">
        No photo yet
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full transition-transform duration-[var(--motion-base)] ease-standard group-hover:scale-[1.03] group-focus-within:scale-[1.03] motion-reduce:transition-none"
      onMouseEnter={startCycling}
      onMouseLeave={stopCycling}
      onFocus={startCycling}
      onBlur={stopCycling}
    >
      {/*
        A photo that snaps in at full opacity is the most visible jank on
        a slow connection, which is the normal case here, so each one
        fades up as it decodes. `loaded` is per path rather than one
        shared flag because the cycle images arrive at different times
        and a shared flag would fade a later photo in under the current
        one.
      */}
      {paths.map((path, i) => (
        <Image
          key={path}
          ref={(node) => attach(node, path)}
          src={propertyImageUrl(path)}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          onLoad={() => markLoaded(path)}
          className={cn(
            "object-cover transition-opacity duration-[var(--motion-base)] ease-standard motion-reduce:transition-none",
            i === activeIndex && status[path] !== "loading" ? "opacity-100" : "opacity-0",
          )}
          priority={i === 0}
        />
      ))}
      {paths.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden="true">
          {paths.map((path, i) => (
            <span
              key={path}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i === activeIndex ? "bg-ivory-50" : "bg-ivory-50/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
