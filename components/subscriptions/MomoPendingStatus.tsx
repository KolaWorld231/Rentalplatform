"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { checkMomoPaymentStatusAction } from "@/app/checkout/momo/actions";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

export function MomoPendingStatus({ reference }: { reference: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attempt >= MAX_POLLS) return;

    const timer = setTimeout(async () => {
      const result = await checkMomoPaymentStatusAction(reference);
      if (result.status === "confirmed") {
        router.replace("/pricing?payment=success");
        return;
      }
      if (result.status === "failed") {
        router.replace("/pricing?payment=failed");
        return;
      }
      if (result.status === "error") {
        setError(result.error ?? "Something went wrong checking your payment.");
        return;
      }
      setAttempt((a) => a + 1);
    }, attempt === 0 ? 0 : POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempt, reference, router]);

  if (error) {
    return <p className="text-sm font-medium text-error-500">{error}</p>;
  }

  if (attempt >= MAX_POLLS) {
    return (
      <p className="text-sm text-charcoal-500">
        This is taking longer than expected. If you approved the payment on your phone, check back on{" "}
        <a href="/pricing" className="font-medium text-brand-700">
          the pricing page
        </a>{" "}
        in a minute.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm text-charcoal-500">Waiting for you to approve the payment on your phone…</p>
    </div>
  );
}
