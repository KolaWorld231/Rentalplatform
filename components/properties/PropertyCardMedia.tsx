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
      <div className="flex h-full items-center justify-center bg-sage-200 text-sm text-charcoal-400">
        No photo yet
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={startCycling}
      onMouseLeave={stopCycling}
      onFocus={startCycling}
      onBlur={stopCycling}
    >
      {paths.map((path, i) => (
        <Image
          key={path}
          src={propertyImageUrl(path)}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={cn(
            "object-cover transition-opacity duration-500 motion-reduce:transition-none",
            i === activeIndex ? "opacity-100" : "opacity-0",
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
