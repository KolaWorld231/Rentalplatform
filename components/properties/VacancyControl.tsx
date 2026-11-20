"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { setVacancyAction } from "@/app/dashboard/properties/actions";
import { AvailabilityMarker } from "@/components/properties/AvailabilityMarker";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { ActionState } from "@/lib/auth/actions";
import type { AvailabilityStatus } from "@/types/database";

const initialState: ActionState = {};

/**
 * The owner's vacancy switch, with the date an occupied property frees
 * up.
 *
 * This replaced two buttons ("Available" / "Rented") that could not
 * express the most common situation an owner is actually in: the place
 * is taken, but the tenant leaves at the end of next month. A renter
 * seeing only "Rented" moves on from a property they could have had.
 *
 * The date field appears only while the switch is off, because a vacant
 * property has nothing to wait for -- and the server rejects the
 * combination rather than quietly dropping the date, so the two cannot
 * disagree.
 *
 * The marker shown here is the same component a renter sees, so the
 * owner is looking at their own listing's wording rather than a
 * different description of the same state.
 */
export function VacancyControl({
  propertyId,
  status,
  vacantFrom,
}: {
  propertyId: string;
  status: AvailabilityStatus;
  vacantFrom: string | null;
}) {
  const action = setVacancyAction.bind(null, propertyId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [vacant, setVacant] = useState(status === "available");

  /**
   * Re-assert the checkbox from React state after every render.
   *
   * The track is painted from `:checked`, and React's post-action form
   * reset clears that without changing the `checked` prop -- so after a
   * rejected save the switch rendered in the "off" position while its
   * own label, and the value actually submitted, both said "vacant". No
   * dependency array, because the reset happens outside React's view of
   * what changed.
   */
  const switchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (switchRef.current) switchRef.current.checked = vacant;
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {/*
        The submitted value comes from React state, not from the
        checkbox's DOM state.

        React resets the form after a Server Action. That flips the
        checkbox back in the DOM without changing the `checked` prop, so
        React sees no change and never re-applies it -- the control then
        looks "occupied" while silently submitting "vacant". It showed up
        as a save that appeared to work and changed nothing: the switch
        said occupied, the browser sent vacant, and the server rejected
        the contradiction against the date field.

        Keeping the switch purely presentational and submitting a hidden
        field removes the second source of truth entirely.
      */}
      <input type="hidden" name="vacant" value={vacant ? "on" : ""} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch
          ref={switchRef}
          checked={vacant}
          onChange={(e) => setVacant(e.target.checked)}
          label={vacant ? "Vacant — renters can move in" : "Occupied"}
        />
        <AvailabilityMarker status={status} vacantFrom={vacantFrom} />
      </div>

      {!vacant && (
        <label className="animate-fade-up flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
          Vacant from
          <input
            type="date"
            name="vacantFrom"
            defaultValue={vacantFrom ?? ""}
            className="focus-ring h-11 w-full max-w-xs rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm shadow-[var(--shadow-clay-inset)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-standard sm:w-auto"
          />
          <span className="text-xs font-normal text-charcoal-400">
            Optional. Leave empty if you don&apos;t know yet — renters will simply see it as
            occupied.
          </span>
        </label>
      )}

      {state.fieldErrors?.vacantFrom && (
        <p key={state.fieldErrors.vacantFrom} role="alert" className="animate-shake text-xs font-medium text-error">
          {state.fieldErrors.vacantFrom}
        </p>
      )}
      {state.error && (
        <p key={state.error} role="alert" className="animate-shake text-xs font-medium text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" size="sm" variant="secondary" loading={pending} className="self-start">
        Save availability
      </Button>
    </form>
  );
}
