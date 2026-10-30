"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/lib/auth/actions";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES, type Property } from "@/types/database";
import { formatCategory } from "@/lib/utils/format";

const initialState: ActionState = {};

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean | null }) {
  return (
    <label className="flex items-center gap-2 text-sm text-charcoal-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked ?? false} className="h-4 w-4 rounded" />
      {label}
    </label>
  );
}

export function PropertyForm({
  action,
  property,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  property?: Property;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Basics</h2>
        <Input label="Title" name="title" required defaultValue={property?.title} maxLength={120} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
          Description
          <textarea
            name="description"
            rows={5}
            defaultValue={property?.description}
            className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface p-3 text-sm shadow-[var(--shadow-clay-inset)]"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
            Category
            <select
              name="category"
              required
              defaultValue={property?.category ?? ""}
              className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
            >
              <option value="" disabled>
                Select a category
              </option>
              {PROPERTY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
            Usage type
            <select
              name="usageType"
              required
              defaultValue={property?.usage_type ?? "residential"}
              className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="land">Land</option>
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Price</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Rent amount (USD)"
            name="rentAmount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={property?.rent_amount}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
            Rental frequency
            <select
              name="rentalFrequency"
              defaultValue={property?.rental_frequency ?? "monthly"}
              className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="nightly">Nightly</option>
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
            County
            <select
              name="county"
              required
              defaultValue={property?.county ?? ""}
              className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
            >
              <option value="" disabled>
                Select a county
              </option>
              {LIBERIA_COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input label="City / municipality" name="city" required defaultValue={property?.city} />
          <Input label="Community / neighbourhood" name="community" defaultValue={property?.community ?? ""} />
          <Input label="Landmark / directions" name="landmark" defaultValue={property?.landmark ?? ""} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Features</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Bedrooms" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? ""} />
          <Input label="Bathrooms" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? ""} />
          <Input
            label="Floor area (m²)"
            name="floorAreaSqm"
            type="number"
            min={0}
            defaultValue={property?.floor_area_sqm ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Checkbox name="furnished" label="Furnished" defaultChecked={property?.furnished} />
          <Checkbox name="hasElectricity" label="Electricity" defaultChecked={property?.has_electricity} />
          <Checkbox name="hasWater" label="Water supply" defaultChecked={property?.has_water} />
          <Checkbox name="hasAirConditioning" label="Air conditioning" defaultChecked={property?.has_air_conditioning} />
          <Checkbox name="hasParking" label="Parking" defaultChecked={property?.has_parking} />
          <Checkbox name="hasSecurity" label="Security" defaultChecked={property?.has_security} />
          <Checkbox name="roadAccessible" label="Road accessible" defaultChecked={property?.road_accessible} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Rental terms</h2>
        <p className="text-xs text-charcoal-400">
          Leave blank if not applicable — DomiLink shows these as &quot;not provided&quot; rather
          than guessing.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Advance rent (USD)"
            name="advanceRentAmount"
            type="number"
            min={0}
            defaultValue={property?.advance_rent_amount ?? ""}
          />
          <Input
            label="Security deposit (USD)"
            name="securityDepositAmount"
            type="number"
            min={0}
            defaultValue={property?.security_deposit_amount ?? ""}
          />
          <Input
            label="Other fees (USD)"
            name="otherFeesAmount"
            type="number"
            min={0}
            defaultValue={property?.other_fees_amount ?? ""}
          />
        </div>
        <Input
          label="Other fees description"
          name="otherFeesDescription"
          defaultValue={property?.other_fees_description ?? ""}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Lease duration (months)"
            name="leaseDurationMonths"
            type="number"
            min={0}
            defaultValue={property?.lease_duration_months ?? ""}
          />
          <Input
            label="Earliest move-in date"
            name="moveInDate"
            type="date"
            defaultValue={property?.move_in_date ?? ""}
          />
        </div>
      </section>

      {state.error && <p className="text-sm font-medium text-error-500">{state.error}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
