"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  startWhatsAppLoginAction,
  startWhatsAppSignupAction,
  verifyWhatsAppOtpAction,
  type WhatsAppActionState,
} from "@/lib/auth/whatsapp-actions";

const initialState: WhatsAppActionState = {};

export function WhatsAppAuthForm({
  mode,
  displayName,
  intent,
}: {
  mode: "signup" | "login";
  /** Required for mode="signup" -- shared with the passkey/phone signup paths on the register page. */
  displayName?: string;
  intent?: "renter" | "owner";
}) {
  const startAction = mode === "signup" ? startWhatsAppSignupAction : startWhatsAppLoginAction;
  const [startState, startFormAction, startPending] = useActionState(startAction, initialState);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyWhatsAppOtpAction, initialState);
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
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              hint="Used once to set up your account -- you'll only sign in with your WhatsApp number after this."
              error={startState.fieldErrors?.email}
            />
          </>
        )}
        <Input
          label="WhatsApp number"
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
          Send code on WhatsApp
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyFormAction} className="flex flex-col gap-3">
      <input type="hidden" name="phone" value={startState.phone} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-sm text-charcoal-500">We sent a 6-digit code to {startState.phone} on WhatsApp.</p>
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
