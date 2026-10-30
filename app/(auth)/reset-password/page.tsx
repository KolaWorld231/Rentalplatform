"use client";

import { useActionState } from "react";
import { type ActionState, resetPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const initialState: ActionState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Set a new password</h1>
      </div>

      <Card className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label="New password"
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
          <Button type="submit" loading={pending} className="w-full">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
