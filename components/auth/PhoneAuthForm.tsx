"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  startPhoneLoginAction,
  startPhoneSignupAction,
  verifyPhoneOtpAction,
  type PhoneActionState,
} from "@/lib/auth/phone-actions";

const initialState: PhoneActionState = {};

export function PhoneAuthForm({
  mode,
  displayName,
  intent,
}: {
  mode: "signup" | "login";
  /** Required for mode="signup" -- shared with the passkey signup path on the register page. */
  displayName?: string;
  intent?: "renter" | "owner";
}) {
  const startAction = mode === "signup" ? startPhoneSignupAction : startPhoneLoginAction;
  const [startState, startFormAction, startPending] = useActionState(startAction, initialState);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyPhoneOtpAction, initialState);
  // Derived, not its own effect-driven state: showing the code-entry step
  // just means "a code was sent and the visitor hasn't asked to change
  // the number" -- resetToPhone exists only for that one explicit escape
  // hatch, not as a general step tracker.
  const [resetToPhone, setResetToPhone] = useState(false);
  const step: "phone" | "otp" = startState.otpSent && !resetToPhone ? "otp" : "phone";

  if (step === "phone") {
    const disabled = mode === "signup" && !displayName?.trim();
    return (
      <form action={startFormAction} onSubmit={() => setResetToPhone(false)} className="flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <input type="hidden" name="displayName" value={displayName} />
            <input type="hidden" name="intent" value={intent} />
          </>
        )}
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+231 77 000 0000"
          required
          hint="Include your country code, e.g. +231 for Liberia."
          error={startState.fieldErrors?.phone}
        />
        {startState.error && (
          <p role="alert" className="text-sm font-medium text-error-500">
            {startState.error}
          </p>
        )}
        <Button type="submit" loading={startPending} disabled={disabled} className="w-full">
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyFormAction} className="flex flex-col gap-3">
      <input type="hidden" name="phone" value={startState.phone} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-sm text-charcoal-500">We sent a 6-digit code to {startState.phone}.</p>
      <Input
        label="Verification code"
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        error={verifyState.fieldErrors?.token}
      />
      {verifyState.error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {verifyState.error}
        </p>
      )}
      <Button type="submit" loading={verifyPending} className="w-full">
        Verify &amp; continue
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
