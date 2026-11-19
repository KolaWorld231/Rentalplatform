import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * `u-press` carries the shared press behaviour -- sink and tighten, the
 * clay vocabulary -- so every variant answers the pointer the same way
 * instead of each one hand-rolling `active:translate-y-px`. Raised
 * variants additionally lift on hover; `ghost` does not, because an
 * element with no elevation at rest cannot gain any without looking
 * like a different component.
 */
export const buttonVariants = cva(
  "focus-ring u-press inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-[var(--motion-fast)] ease-standard disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-ivory-50 shadow-[var(--shadow-raised)] hover:bg-brand-700 hover:shadow-[var(--shadow-floating)] hover:-translate-y-px",
        secondary:
          "bg-surface text-charcoal-700 border border-border shadow-[var(--shadow-subtle)] hover:bg-surface-muted hover:shadow-[var(--shadow-raised)]",
        clay: "bg-clay-500 text-ivory-50 shadow-[var(--shadow-raised)] hover:bg-clay-600 hover:shadow-[var(--shadow-floating)] hover:-translate-y-px",
        ghost: "bg-transparent text-charcoal-700 hover:bg-surface-muted",
        danger: "bg-error-500 text-ivory-50 hover:opacity-90 hover:shadow-[var(--shadow-raised)]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/*
          The spinner scales in rather than appearing, so a slow action
          reads as the button changing state instead of its label
          jumping sideways. `shrink-0` keeps it from being squeezed when
          the label is long.
        */}
        {loading && (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
