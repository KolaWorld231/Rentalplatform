"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  startScoutApplicationOtpAction,
  verifyScoutApplicationOtpAction,
  type ScoutOtpActionState,
} from "@/lib/scouts/actions";

const initialState: ScoutOtpActionState = {};

export function ScoutPhoneVerify({
  phone,
  verified,
  onVerified,
}: {
  phone: string;
  verified: boolean;
  onVerified: () => void;
}) {
  const [startState, startFormAction, startPending] = useActionState(startScoutApplicationOtpAction, initialState);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyScoutApplicationOtpAction, initialState);
  const [resetToPhone, setResetToPhone] = useState(false);

  useEffect(() => {
    if (verifyState.verified) onVerified();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyState.verified]);

  if (verified) {
    return <p className="text-sm font-medium text-success-500">Phone number verified.</p>;
  }

  const step: "phone" | "otp" = startState.otpSent && !resetToPhone ? "otp" : "phone";

  if (step === "phone") {
    return (
      <form action={startFormAction} onSubmit={() => setResetToPhone(false)} className="flex flex-col gap-2">
        <input type="hidden" name="phone" value={phone} />
        {startState.error && (
          <p role="alert" className="text-sm font-medium text-error-500">
            {startState.error}
          </p>
        )}
        <Button type="submit" variant="secondary" loading={startPending} disabled={!phone.trim()}>
          Send verification code
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyFormAction} className="flex flex-col gap-2">
      <input type="hidden" name="phone" value={phone} />
      <p className="text-sm text-charcoal-500">We sent a 6-digit code to {phone}.</p>
      <Input
        label="Verification code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        error={verifyState.fieldErrors?.code}
      />
      {verifyState.error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {verifyState.error}
        </p>
      )}
      <Button type="submit" loading={verifyPending}>
        Verify
      </Button>
      <button
        type="button"
        onClick={() => setResetToPhone(true)}
        className="focus-ring text-left text-xs font-medium text-charcoal-500 hover:text-brand-700"
      >
        Use a different number
      </button>
    </form>
  );
}
