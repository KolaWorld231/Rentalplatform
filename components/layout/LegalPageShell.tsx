import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Wraps every /legal/* page with a visible "draft, pending legal review"
 * banner — these documents must never be presented as final without a
 * lawyer reviewing them for the business's actual jurisdiction and
 * registration status. See lib/config/brand.ts for the placeholder
 * business identity fields referenced throughout.
 */
export function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-start gap-2 rounded-[var(--radius-md)] bg-warning-100 p-3 text-xs text-warning-500">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Draft — this document has not been reviewed by a lawyer and must not be treated as final
          before launch.
        </span>
      </div>
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">{title}</h1>
      <div className="prose-sm mt-4 flex flex-col gap-4 text-sm leading-relaxed text-charcoal-600">
        {children}
      </div>
    </div>
  );
}
