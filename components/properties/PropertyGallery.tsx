"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils/cn";

export function PropertyGallery({
  images,
  title,
}: {
  images: { id: string; storage_path: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (lightboxOpen && !el.open) el.showModal();
    if (!lightboxOpen && el.open) el.close();
  }, [lightboxOpen]);

  function next() {
    setActive((i) => (i + 1) % images.length);
  }
  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-xl)] bg-sage-200 text-sm text-charcoal-400">
        No photos yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Open full-screen photo ${active + 1} of ${images.length}`}
        className="focus-ring group relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] bg-sage-200"
      >
        <Image
          src={propertyImageUrl(images[active].storage_path)}
          alt={`${title} — photo ${active + 1} of ${images.length}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-end justify-end bg-charcoal-900/0 p-3 transition-colors group-hover:bg-charcoal-900/10">
          <span className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-charcoal-900/70 px-2.5 py-1 text-xs font-medium text-ivory-50 opacity-0 transition-opacity group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" aria-hidden="true" />
            View full screen
          </span>
        </div>
        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-charcoal-900/70 px-2 py-0.5 text-xs font-medium text-ivory-50">
            {active + 1} / {images.length}
          </span>
        )}
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "focus-ring relative h-16 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 transition-transform hover:scale-105",
                i === active ? "border-brand-600" : "border-transparent",
              )}
            >
              <Image src={propertyImageUrl(img.storage_path)} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setLightboxOpen(false)}
        onCancel={() => setLightboxOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") next();
          if (e.key === "ArrowLeft") prev();
        }}
        aria-label={`${title} photos`}
        className="m-auto h-[100dvh] max-h-none w-screen max-w-none bg-charcoal-900/95 p-0 backdrop:bg-charcoal-900/90"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close full-screen view"
            className="focus-ring absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/20"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="focus-ring absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/20 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="focus-ring absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/20 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="relative h-[80vh] w-[90vw]">
            {lightboxOpen && (
              <Image
                src={propertyImageUrl(images[active].storage_path)}
                alt={`${title} — photo ${active + 1} of ${images.length}`}
                fill
                sizes="90vw"
                className="object-contain"
              />
            )}
          </div>

          {images.length > 1 && (
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[var(--radius-sm)] bg-ivory-50/10 px-3 py-1 text-sm font-medium text-ivory-50">
              {active + 1} / {images.length}
            </span>
          )}
        </div>
      </dialog>
    </div>
  );
}
