"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/lib/auth/actions";
import { updateProfileAction } from "./actions";

const initialState: ActionState = {};

export function ProfileForm({
  displayName,
  phone,
}: {
  displayName: string;
  phone: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Full name"
        name="displayName"
        defaultValue={displayName}
        required
        error={state.fieldErrors?.displayName}
      />
      <Input
        label="Phone (optional)"
        name="phone"
        type="tel"
        defaultValue={phone ?? ""}
        error={state.fieldErrors?.phone}
      />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
