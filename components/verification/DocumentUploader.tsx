"use client";

import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function DocumentUploader({
  requestId,
  requestKind,
  documentCount,
}: {
  requestId: string;
  requestKind: "identity" | "property";
  documentCount: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPEG, PNG, or PDF files are allowed.");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError("Each file must be 10MB or smaller.");
        continue;
      }

      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in again.");
        setUploading(false);
        continue;
      }

      const ext = file.name.split(".").pop() ?? "dat";
      const path = `${user.id}/${requestId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(`Couldn't upload ${file.name}. Please try again.`);
        setUploading(false);
        continue;
      }

      const parentRef =
        requestKind === "identity" ? { identity_request_id: requestId } : { property_request_id: requestId };

      await supabase.from("private_verification_documents").insert({
        ...parentRef,
        storage_path: path,
        original_filename: file.name,
        content_type: file.type,
        file_size_bytes: file.size,
        uploaded_by: user.id,
      });
      setUploading(false);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="focus-ring flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-border px-4 py-3 text-sm text-charcoal-500 hover:border-brand-500 hover:text-brand-600 disabled:opacity-60"
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading…" : "Upload document"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p className="text-xs font-medium text-error-500">{error}</p>}
      <p className="flex items-center gap-1 text-xs text-charcoal-400">
        <FileText className="h-3 w-3" />
        {documentCount} document{documentCount === 1 ? "" : "s"} uploaded · JPEG, PNG, or PDF, up to 10MB
      </p>
    </div>
  );
}
