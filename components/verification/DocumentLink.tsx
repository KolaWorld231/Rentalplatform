"use client";

import { FileText } from "lucide-react";
import { useState, useTransition } from "react";
import { getSignedDocumentUrlAction } from "@/app/dashboard/verification/actions";

export function DocumentLink({ documentId, filename }: { documentId: string; filename: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await getSignedDocumentUrlAction(documentId);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          window.open(result.url, "_blank", "noopener,noreferrer");
        })
      }
      className="focus-ring flex items-center gap-1.5 text-sm text-brand-700 hover:underline disabled:opacity-60"
    >
      <FileText className="h-4 w-4" />
      {pending ? "Opening…" : (filename ?? "View document")}
      {error && <span className="text-xs text-error-500">({error})</span>}
    </button>
  );
}
