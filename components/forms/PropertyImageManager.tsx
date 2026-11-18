"use client";

import { Star, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deletePropertyImageAction, setCoverImageAction } from "@/app/dashboard/properties/actions";
import { createClient } from "@/lib/supabase/client";
import { downscaleImage } from "@/lib/utils/downscale-image";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils/cn";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PropertyImageManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: { id: string; storage_path: string; is_cover: boolean }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(files: FileList) {
    setError(null);
    const supabase = createClient();
    const selected = Array.from(files);

    /*
      position and is_cover were read from the `images` prop inside this
      loop. A prop does not change while the loop runs, so selecting five
      photos for an empty listing wrote position 0 five times and marked
      every one of them is_cover -- the cover then being whichever row
      came back first. These counters advance per file instead.
    */
    let nextPosition = images.length;
    let needsCover = images.length === 0;
    const failed: string[] = [];

    setUploading(true);
    setProgress({ done: 0, total: selected.length });

    for (const original of selected) {
      if (!ACCEPTED_TYPES.includes(original.type)) {
        failed.push(`${original.name} (not a JPEG, PNG or WebP)`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }
      if (original.size > MAX_FILE_BYTES) {
        failed.push(`${original.name} (over 8MB)`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }

      const file = await downscaleImage(original);
      const ext = file.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg");
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("property-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

      if (uploadError) {
        failed.push(original.name);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }

      const { error: insertError } = await supabase.from("property_images").insert({
        property_id: propertyId,
        storage_path: path,
        position: nextPosition,
        is_cover: needsCover,
      });

      if (insertError) {
        // Do not leave the uploaded object orphaned in the bucket.
        await supabase.storage.from("property-images").remove([path]);
        failed.push(original.name);
      } else {
        nextPosition += 1;
        needsCover = false;
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setUploading(false);
    setProgress(null);
    if (failed.length > 0) {
      setError(
        failed.length === selected.length
          ? `Couldn't upload: ${failed.join(", ")}. Please try again.`
          : `Uploaded ${selected.length - failed.length} of ${selected.length}. Couldn't upload: ${failed.join(", ")}.`,
      );
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-surface-muted">
            <Image src={propertyImageUrl(img.storage_path)} alt="" fill sizes="200px" className="object-cover" />
            {img.is_cover && (
              <span className="absolute left-1.5 top-1.5 rounded-[var(--radius-sm)] bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-ivory-50">
                Cover
              </span>
            )}
            {/*
              These were revealed on hover only, which puts set-cover and
              delete out of reach on any touch device -- including the
              phones most owners list from.
            */}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-charcoal-900/40 p-1">
              {!img.is_cover && (
                <button
                  type="button"
                  aria-label="Set as cover photo"
                  disabled={pending}
                  onClick={() => startTransition(() => setCoverImageAction(propertyId, img.id))}
                  className="focus-ring rounded-full bg-surface p-1.5"
                >
                  <Star className="h-3.5 w-3.5 text-charcoal-700" />
                </button>
              )}
              <button
                type="button"
                aria-label="Delete photo"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Delete this photo? This can't be undone.")) return;
                  startTransition(() => deletePropertyImageAction(propertyId, img.id, img.storage_path));
                }}
                className="focus-ring rounded-full bg-surface p-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-error" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "focus-ring flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-border text-xs text-charcoal-400 hover:border-brand-500 hover:text-accent-text",
            uploading && "opacity-60",
          )}
        >
          <Upload className="h-5 w-5" />
          {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : uploading ? "Uploading…" : "Add photo"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <p className="text-xs text-charcoal-400">
        JPEG, PNG, or WebP. Up to 8MB each &mdash; large photos are shrunk on this device before
        upload, so they cost less data to send.
      </p>
    </div>
  );
}
