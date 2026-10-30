"use client";

import Image from "next/image";
import { useState } from "react";
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

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-xl)] bg-sage-200 text-sm text-charcoal-400">
        No photos yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] bg-sage-200">
        <Image
          src={propertyImageUrl(images[active].storage_path)}
          alt={`${title} — photo ${active + 1} of ${images.length}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "focus-ring relative h-16 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2",
                i === active ? "border-brand-600" : "border-transparent",
              )}
            >
              <Image src={propertyImageUrl(img.storage_path)} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
