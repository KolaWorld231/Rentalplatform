"use client";

import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { type ActionState, registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Create your account</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Browsing is always free. Tell us what you&apos;re here for.
        </p>
      </div>

      <Card className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="intent" value={intent} />

          <fieldset className="grid grid-cols-2 gap-2" aria-label="I want to">
            <button
              type="button"
              onClick={() => setIntent("renter")}
              aria-pressed={intent === "renter"}
              className={`focus-ring rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-colors ${
                intent === "renter"
                  ? "border-brand-600 bg-brand-100 text-brand-800"
                  : "border-border bg-surface text-charcoal-500"
              }`}
            >
              Find a property
            </button>
            <button
              type="button"
              onClick={() => setIntent("owner")}
              aria-pressed={intent === "owner"}
              className={`focus-ring rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-colors ${
                intent === "owner"
                  ? "border-brand-600 bg-brand-100 text-brand-800"
                  : "border-border bg-surface text-charcoal-500"
              }`}
            >
              List a property
            </button>
          </fieldset>

          <Input
            label="Full name"
            name="displayName"
            autoComplete="name"
            required
            error={state.fieldErrors?.displayName}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email}
          />
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

          <Button type="submit" loading={pending} className="mt-2 w-full">
            Create account
          </Button>
        </form>
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
