import { type InputHTMLAttributes, type ReactNode } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> {
  label?: ReactNode;
}

export function Switch({ label, ...inputProps }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3">
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" className="peer sr-only" {...inputProps} />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-sage-200 shadow-[var(--shadow-clay-inset)] transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-5 w-5 rounded-full bg-ivory-50 shadow-[var(--shadow-subtle)] transition-transform peer-checked:translate-x-5"
        />
      </span>
      {label && <span className="text-sm text-charcoal-700">{label}</span>}
    </label>
  );
}
