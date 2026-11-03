"use client";

import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePasskeySupport } from "@/lib/auth/use-passkey-support";
import {
  deletePasskeyAction,
  listPasskeysAction,
  startPasskeyRegistrationAction,
  verifyPasskeyRegistrationAction,
} from "@/lib/auth/webauthn-actions";
import { formatRelativeDate } from "@/lib/utils/format";

type Passkey = {
  id: string;
  label: string;
  device_type: string;
  created_at: string;
  last_used_at: string | null;
};

export function PasskeyManager({ initialPasskeys }: { initialPasskeys: Passkey[] }) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passkeySupported = usePasskeySupport();

  async function handleAdd() {
    setPending(true);
    setError(null);
    try {
      const start = await startPasskeyRegistrationAction();
      if (start.error || !start.optionsJSON || !start.challengeId) {
        setError(start.error ?? "Could not start passkey setup.");
        return;
      }

      const attestation = await startRegistration({
        optionsJSON: start.optionsJSON as PublicKeyCredentialCreationOptionsJSON,
      });

      const result = await verifyPasskeyRegistrationAction(start.challengeId, attestation, "Passkey");
      if (result?.error) {
        setError(result.error);
        return;
      }

      setPasskeys(await listPasskeysAction());
    } catch {
      // Cancelled the browser prompt -- not an error worth surfacing.
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    setPasskeys((prev) => prev.filter((p) => p.id !== id));
    await deletePasskeyAction(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {passkeys.length === 0 ? (
        <p className="text-sm text-charcoal-500">
          No passkeys yet. Add one to sign in with your fingerprint, face, or screen lock instead of a password.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{p.label}</p>
                  <p className="text-xs text-charcoal-400">
                    Added {formatRelativeDate(p.created_at)}
                    {p.last_used_at && ` · last used ${formatRelativeDate(p.last_used_at)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                aria-label={`Remove ${p.label}`}
                className="focus-ring rounded-[var(--radius-sm)] p-1.5 text-charcoal-400 hover:text-error-500"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {error}
        </p>
      )}

      {passkeySupported && (
        <Button type="button" variant="secondary" size="sm" loading={pending} onClick={handleAdd} className="self-start">
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          Add a passkey
        </Button>
      )}
    </div>
  );
}
