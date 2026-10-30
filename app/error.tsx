"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Internal stack traces never reach the user — only a generic
    // message does. A real error-monitoring integration (ERROR_MONITORING_DSN,
    // see .env.example) would also forward `error` here.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <Card className="flex w-full flex-col items-center gap-3 p-10">
        <AlertTriangle className="h-10 w-10 text-error-500" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold text-charcoal-700">Something went wrong</h1>
        <p className="text-sm text-charcoal-500">
          We hit an unexpected error. Please try again — if it keeps happening, contact{" "}
          <a href="/help" className="font-medium text-brand-700">
            support
          </a>
          .
        </p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}
