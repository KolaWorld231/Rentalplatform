"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { startPasskeyLoginAction, verifyPasskeyLoginAction } from "@/lib/auth/webauthn-actions";

export function PasskeyLoginButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const start = await startPasskeyLoginAction();
      if (start.error || !start.optionsJSON || !start.challengeId) {
        setError(start.error ?? "Could not start passkey sign-in.");
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: start.optionsJSON as PublicKeyCredentialRequestOptionsJSON,
      });

      const result = await verifyPasskeyLoginAction(start.challengeId, assertion);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // The user cancelled the browser's passkey prompt, or the device
      // has no passkey for this site -- not a real error to surface loudly.
      setError(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" loading={pending} onClick={handleClick} className="w-full">
        <Fingerprint className="h-4 w-4" aria-hidden="true" />
        Sign in with a passkey
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {error}
        </p>
      )}
    </div>
  );
}
