import { type InputHTMLAttributes, type LabelHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-charcoal-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={cn(errorId, hintId) || undefined}
          className={cn(
            "focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)] outline-none transition-colors duration-150 placeholder:text-charcoal-400 focus:border-brand-500",
            error && "border-error-500 focus:border-error-500",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-charcoal-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-error-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-sm font-medium text-charcoal-700" {...props} />;
}
