"use client";

import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, Home, KeyRound, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { type ActionState, registerAction } from "@/lib/auth/actions";
import { startPasskeySignupAction, verifyPasskeySignupAction } from "@/lib/auth/webauthn-actions";
import { usePasskeySupport } from "@/lib/auth/use-passkey-support";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { useSearchParams } from "next/navigation";

const initialState: ActionState = {};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultIntent = searchParams.get("intent") === "owner" ? "owner" : "renter";
  const [intent, setIntent] = useState<"renter" | "owner">(defaultIntent);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const passkeySupported = usePasskeySupport();
  const [method, setMethod] = useState<"password" | "passkey">("password");
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  async function handlePasskeySignup() {
    setPasskeyPending(true);
    setPasskeyError(null);
    try {
      const formData = new FormData();
      formData.set("displayName", displayName);
      formData.set("email", email);
      formData.set("intent", intent);
      const start = await startPasskeySignupAction({}, formData);
      if (start.error || !start.optionsJSON || !start.challengeId) {
        setPasskeyError(start.error ?? "Could not start passkey sign-up.");
        return;
      }

      const attestation = await startRegistration({
        optionsJSON: start.optionsJSON as PublicKeyCredentialCreationOptionsJSON,
      });

      const result = await verifyPasskeySignupAction(start.challengeId, attestation);
      if (result?.error) {
        setPasskeyError(result.error);
      }
    } catch {
      setPasskeyError(null);
    } finally {
      setPasskeyPending(false);
    }
  }

  const sharedFieldsValid = displayName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Create your account</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Browsing is always free. Tell us what you&apos;re here for.
        </p>
      </div>

      <Card className="p-6">
        <fieldset className="grid grid-cols-2 gap-3" aria-label="I want to">
          <button
            type="button"
            onClick={() => setIntent("renter")}
            aria-pressed={intent === "renter"}
            className={cn(
              "focus-ring flex flex-col items-start gap-1.5 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all",
              intent === "renter"
                ? "border-brand-600 bg-brand-100 shadow-[var(--shadow-clay-raised)]"
                : "border-border bg-surface hover:border-brand-600/40",
            )}
          >
            <Search className={cn("h-5 w-5", intent === "renter" ? "text-brand-700" : "text-charcoal-400")} aria-hidden="true" />
            <span className={cn("text-sm font-semibold", intent === "renter" ? "text-brand-800" : "text-charcoal-700")}>
              Find a property
            </span>
            <span className="text-xs text-charcoal-500">Browse and message owners</span>
          </button>
          <button
            type="button"
            onClick={() => setIntent("owner")}
            aria-pressed={intent === "owner"}
            className={cn(
              "focus-ring flex flex-col items-start gap-1.5 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all",
              intent === "owner"
                ? "border-clay-500 bg-clay-400/10 shadow-[var(--shadow-clay-raised)]"
                : "border-border bg-surface hover:border-clay-500/40",
            )}
          >
            <Home className={cn("h-5 w-5", intent === "owner" ? "text-clay-600" : "text-charcoal-400")} aria-hidden="true" />
            <span className={cn("text-sm font-semibold", intent === "owner" ? "text-clay-600" : "text-charcoal-700")}>
              List a property
            </span>
            <span className="text-xs text-charcoal-500">Free, always</span>
          </button>
        </fieldset>

        <Input
          label="Full name"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={state.fieldErrors?.displayName}
          className="mt-4"
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state.fieldErrors?.email}
          className="mt-4"
        />

        {passkeySupported && (
          <fieldset className="mt-4 grid grid-cols-2 gap-2" aria-label="How to sign up">
            <button
              type="button"
              onClick={() => setMethod("passkey")}
              aria-pressed={method === "passkey"}
              className={cn(
                "focus-ring flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border py-2 text-sm font-medium transition-colors",
                method === "passkey" ? "border-brand-600 bg-brand-100 text-brand-800" : "border-border text-charcoal-500",
              )}
            >
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Passkey
            </button>
            <button
              type="button"
              onClick={() => setMethod("password")}
              aria-pressed={method === "password"}
              className={cn(
                "focus-ring flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border py-2 text-sm font-medium transition-colors",
                method === "password" ? "border-brand-600 bg-brand-100 text-brand-800" : "border-border text-charcoal-500",
              )}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Password
            </button>
          </fieldset>
        )}

        {passkeySupported && method === "passkey" ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-charcoal-500">
              Use your device&apos;s fingerprint, face, or screen lock instead of a password.
            </p>
            {passkeyError && (
              <p role="alert" className="text-sm font-medium text-error-500">
                {passkeyError}
              </p>
            )}
            <Button
              type="button"
              loading={passkeyPending}
              disabled={!sharedFieldsValid}
              onClick={handlePasskeySignup}
              className="w-full"
            >
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Continue with a passkey
            </Button>
          </div>
        ) : (
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="intent" value={intent} />
            <input type="hidden" name="displayName" value={displayName} />
            <input type="hidden" name="email" value={email} />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              hint="At least 8 characters."
              error={state.fieldErrors?.password}
            />

            {state.error && (
              <p role="alert" className="text-sm font-medium text-error-500">
                {state.error}
              </p>
            )}

            <Button type="submit" loading={pending} disabled={!sharedFieldsValid} className="w-full">
              Create account
            </Button>
          </form>
        )}
      </Card>

      <p className="text-center text-sm text-charcoal-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
