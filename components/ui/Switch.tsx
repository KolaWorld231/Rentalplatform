import { type InputHTMLAttributes, type ReactNode, type Ref } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> {
  label?: ReactNode;
  /**
   * The track is painted from the input's `:checked` state, so a caller
   * that needs the visuals to survive a React form reset -- which clears
   * the DOM checkbox without changing the `checked` prop, leaving the
   * track showing the wrong position -- needs a handle on the input to
   * re-assert it.
   */
  ref?: Ref<HTMLInputElement>;
}

export function Switch({ label, ref, ...inputProps }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3">
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input ref={ref} type="checkbox" className="peer sr-only" {...inputProps} />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-surface-muted shadow-[var(--shadow-clay-inset)] transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
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
