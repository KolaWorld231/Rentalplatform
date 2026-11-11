"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel, Input } from "@/components/ui/Input";
import { ScoutPhoneVerify } from "@/components/scouts/ScoutPhoneVerify";
import { scoutProgram } from "@/lib/config/brand";
import { submitScoutApplicationAction, type ScoutArea, type ScoutSubmitActionState } from "@/lib/scouts/actions";
import { SCOUT_CODE_OF_CONDUCT_VERSION } from "@/lib/validation/scouts";

const initialState: ScoutSubmitActionState = {};

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "employer", label: "Employer" },
  { value: "community_leader", label: "Community leader" },
  { value: "other", label: "Other" },
] as const;

interface ReferenceDraft {
  fullName: string;
  relationship: string;
  phone: string;
}

const emptyReference: ReferenceDraft = { fullName: "", relationship: "family", phone: "" };

function Textarea({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={props.id}>{label}</FieldLabel>
      <textarea
        {...props}
        className="focus-ring min-h-24 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 py-2.5 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)] outline-none transition-colors duration-150 placeholder:text-charcoal-400 focus:border-brand-500"
      />
      {hint && !error && <p className="text-xs text-charcoal-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-error-500">
          {error}
        </p>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="flex items-start gap-2 text-sm text-charcoal-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded"
        />
        {children}
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-error-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function ScoutApplyForm({ areas }: { areas: ScoutArea[] }) {
  const [state, formAction, pending] = useActionState(submitScoutApplicationAction, initialState);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [areaKnowledge, setAreaKnowledge] = useState("");
  const [experience, setExperience] = useState("");
  const [smartphoneModel, setSmartphoneModel] = useState("");
  const [hasDataAccess, setHasDataAccess] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [references, setReferences] = useState<ReferenceDraft[]>([{ ...emptyReference }, { ...emptyReference }]);
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);
  const [verificationConsent, setVerificationConsent] = useState(false);

  function updateReference(index: number, patch: Partial<ReferenceDraft>) {
    setReferences((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  if (state.submitted) {
    return (
      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold text-charcoal-700">Application received</h2>
        <p className="mt-2 text-sm text-charcoal-600">
          Your reference number is <span className="font-semibold text-charcoal-700">{state.referenceCode}</span>.
          {state.status === "waitlisted"
            ? " Your area is currently full — you've been added to the waitlist for it."
            : " Your area currently has open seats."}
        </p>
        <p className="mt-3 text-sm text-charcoal-500">
          Applications are reviewed in the order received. Seats are limited by area.
        </p>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="fullName" value={fullName} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="ageConfirmed" value={String(ageConfirmed)} />
      <input type="hidden" name="areaId" value={areaId} />
      <input type="hidden" name="areaKnowledge" value={areaKnowledge} />
      <input type="hidden" name="experience" value={experience} />
      <input type="hidden" name="smartphoneModel" value={smartphoneModel} />
      <input type="hidden" name="hasDataAccess" value={String(hasDataAccess)} />
      <input type="hidden" name="motivation" value={motivation} />
      <input type="hidden" name="references" value={JSON.stringify(references)} />
      <input type="hidden" name="codeOfConductAccepted" value={String(codeOfConductAccepted)} />
      <input type="hidden" name="verificationConsent" value={String(verificationConsent)} />

      <Card className="flex flex-col gap-4 p-6">
        <Input
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={state.fieldErrors?.fullName}
        />

        <div className="flex flex-col gap-2">
          <Input
            label="Phone number"
            type="tel"
            placeholder="+231 77 000 0000"
            hint="Include your country code, e.g. +231 for Liberia."
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneVerified(false);
            }}
            error={state.fieldErrors?.phone}
          />
          <ScoutPhoneVerify phone={phone} verified={phoneVerified} onVerified={() => setPhoneVerified(true)} />
        </div>

        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state.fieldErrors?.email}
        />

        <Checkbox checked={ageConfirmed} onChange={setAgeConfirmed} error={state.fieldErrors?.ageConfirmed}>
          I confirm I am 18 years old or older.
        </Checkbox>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="scout-area">County / neighbourhood you know</FieldLabel>
          <select
            id="scout-area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)] outline-none focus:border-brand-500"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.county} — {a.neighborhood}
              </option>
            ))}
          </select>
          {state.fieldErrors?.areaId && <p className="text-xs font-medium text-error-500">{state.fieldErrors.areaId}</p>}
        </div>

        <Textarea
          id="scout-area-knowledge"
          label="How well do you know this area?"
          maxLength={500}
          value={areaKnowledge}
          onChange={(e) => setAreaKnowledge(e.target.value)}
          error={state.fieldErrors?.areaKnowledge}
        />

        <Textarea
          id="scout-experience"
          label="Relevant experience (optional)"
          maxLength={500}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          error={state.fieldErrors?.experience}
        />

        <Input
          label="Smartphone model"
          hint="So we know you can use the scout tools."
          required
          value={smartphoneModel}
          onChange={(e) => setSmartphoneModel(e.target.value)}
          error={state.fieldErrors?.smartphoneModel}
        />

        <Checkbox checked={hasDataAccess} onChange={setHasDataAccess} error={state.fieldErrors?.hasDataAccess}>
          I confirm I have regular access to mobile data.
        </Checkbox>

        <Textarea
          id="scout-motivation"
          label="Why do you want to be a scout?"
          maxLength={500}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          error={state.fieldErrors?.motivation}
        />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-sm font-semibold text-charcoal-700">Two references</h2>
        {references.map((ref, i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
            <Input label={`Reference ${i + 1} name`} required value={ref.fullName} onChange={(e) => updateReference(i, { fullName: e.target.value })} />
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor={`scout-ref-relationship-${i}`}>Relationship</FieldLabel>
              <select
                id={`scout-ref-relationship-${i}`}
                value={ref.relationship}
                onChange={(e) => updateReference(i, { relationship: e.target.value })}
                className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)] outline-none focus:border-brand-500"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Phone"
              type="tel"
              placeholder="+231 77 000 0000"
              required
              value={ref.phone}
              onChange={(e) => updateReference(i, { phone: e.target.value })}
            />
          </div>
        ))}
        {state.fieldErrors?.references && <p className="text-xs font-medium text-error-500">{state.fieldErrors.references}</p>}
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <Checkbox checked={codeOfConductAccepted} onChange={setCodeOfConductAccepted} error={state.fieldErrors?.codeOfConductAccepted}>
          I agree to the {scoutProgram.name} Code of Conduct (version {SCOUT_CODE_OF_CONDUCT_VERSION}).
        </Checkbox>
        <Checkbox checked={verificationConsent} onChange={setVerificationConsent} error={state.fieldErrors?.verificationConsent}>
          I consent to reference checks and other verification steps as part of my application.
        </Checkbox>
      </Card>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-error-500">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} disabled={!phoneVerified} className="w-full">
        Submit application
      </Button>
      {!phoneVerified && <p className="text-center text-xs text-charcoal-400">Verify your phone number above before submitting.</p>}
    </form>
  );
}
