"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type ActionState, forgotPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const initialState: ActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Reset your password</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Enter your email and we&apos;ll send a link to reset your password.
        </p>
      </div>

      <Card className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email}
          />
          <Button type="submit" loading={pending} className="w-full">
            Send reset link
          </Button>
          <p className="text-xs text-charcoal-400">
            If an account exists for that email, a reset link is on its way.
          </p>
        </form>
      </Card>

      <p className="text-center text-sm text-charcoal-500">
        <Link href="/login" className="font-medium text-brand-700">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
