"use client";

import { Star, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deletePropertyImageAction, setCoverImageAction } from "@/app/dashboard/properties/actions";
import { createClient } from "@/lib/supabase/client";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(files: FileList) {
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPEG, PNG, or WebP images are allowed.");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError("Each image must be 8MB or smaller.");
        continue;
      }

      setUploading(true);
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("property-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

      if (uploadError) {
        setError(`Couldn't upload ${file.name}. Please try again.`);
        setUploading(false);
        continue;
      }

      await supabase.from("property_images").insert({
        property_id: propertyId,
        storage_path: path,
        position: images.length,
        is_cover: images.length === 0,
      });
      setUploading(false);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-sage-200">
            <Image src={propertyImageUrl(img.storage_path)} alt="" fill sizes="200px" className="object-cover" />
            {img.is_cover && (
              <span className="absolute left-1.5 top-1.5 rounded-[var(--radius-sm)] bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-ivory-50">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-charcoal-900/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                onClick={() => startTransition(() => deletePropertyImageAction(propertyId, img.id, img.storage_path))}
                className="focus-ring rounded-full bg-surface p-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-error-500" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "focus-ring flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-border text-xs text-charcoal-400 hover:border-brand-500 hover:text-brand-600",
            uploading && "opacity-60",
          )}
        >
          <Upload className="h-5 w-5" />
          {uploading ? "Uploading…" : "Add photo"}
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

      {error && <p className="text-sm font-medium text-error-500">{error}</p>}
      <p className="text-xs text-charcoal-400">JPEG, PNG, or WebP. Up to 8MB each.</p>
    </div>
  );
}
