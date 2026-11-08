"use client";

import { KeyRound, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type ActionState, loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { IntentChoiceDialog } from "@/components/auth/IntentChoiceDialog";
import { PasskeyLoginButton } from "@/components/auth/PasskeyLoginButton";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { WhatsAppAuthForm } from "@/components/auth/WhatsAppAuthForm";
import { usePasskeySupport } from "@/lib/auth/use-passkey-support";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = {};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const resetSuccess = searchParams.get("reset") === "success";
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const passkeySupported = usePasskeySupport();
  const [method, setMethod] = useState<"password" | "phone" | "whatsapp">("password");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Log in</h1>
        <p className="mt-1 text-sm text-charcoal-500">Welcome back to DomiLink.</p>
      </div>

      <Card className="p-6">
        {resetSuccess && (
          <p className="mb-4 rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-sm text-success-500">
            Password updated. Log in with your new password.
          </p>
        )}

        {passkeySupported && (
          <>
            <PasskeyLoginButton />
            <div className="my-4 flex items-center gap-3 text-xs font-medium text-charcoal-400">
              <span className="h-px flex-1 bg-border" />
              or with your password
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <fieldset className="grid grid-cols-3 gap-2" aria-label="How to log in">
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
          <button
            type="button"
            onClick={() => setMethod("phone")}
            aria-pressed={method === "phone"}
            className={cn(
              "focus-ring flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border py-2 text-sm font-medium transition-colors",
              method === "phone" ? "border-brand-600 bg-brand-100 text-brand-800" : "border-border text-charcoal-500",
            )}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Phone
          </button>
          <button
            type="button"
            onClick={() => setMethod("whatsapp")}
            aria-pressed={method === "whatsapp"}
            className={cn(
              "focus-ring flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border py-2 text-sm font-medium transition-colors",
              method === "whatsapp" ? "border-brand-600 bg-brand-100 text-brand-800" : "border-border text-charcoal-500",
            )}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </button>
        </fieldset>

        {method === "phone" ? (
          <div className="mt-4">
            <PhoneAuthForm mode="login" />
          </div>
        ) : method === "whatsapp" ? (
          <div className="mt-4">
            <WhatsAppAuthForm mode="login" />
          </div>
        ) : (
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <Input label="Email" name="email" type="email" autoComplete="email" required />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="text-right text-sm">
              <Link href="/forgot-password" className="font-medium text-brand-700">
                Forgot password?
              </Link>
            </div>

            {state.error && (
              <p role="alert" className="text-sm font-medium text-error-500">
                {state.error}
              </p>
            )}

            <Button type="submit" loading={pending} className="w-full">
              Log in
            </Button>
          </form>
        )}
      </Card>

      <p className="text-center text-sm text-charcoal-500">
        New to DomiLink?{" "}
        <IntentChoiceDialog className="font-medium text-brand-700">Create an account</IntentChoiceDialog>
      </p>
    </div>
  );
}
