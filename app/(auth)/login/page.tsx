"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { type ActionState, loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasskeyLoginButton } from "@/components/auth/PasskeyLoginButton";
import { usePasskeySupport } from "@/lib/auth/use-passkey-support";

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

        <form action={formAction} className="flex flex-col gap-4">
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
      </Card>

      <p className="text-center text-sm text-charcoal-500">
        New to DomiLink?{" "}
        <Link href="/register" className="font-medium text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
