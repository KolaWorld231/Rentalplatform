import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-ivory-50 shadow-[var(--shadow-raised)] hover:bg-brand-700 active:translate-y-px",
        secondary:
          "bg-surface text-charcoal-700 border border-border shadow-[var(--shadow-subtle)] hover:bg-sage-100 active:translate-y-px",
        clay: "bg-clay-500 text-ivory-50 shadow-[var(--shadow-raised)] hover:bg-clay-600 active:translate-y-px",
        ghost: "bg-transparent text-charcoal-700 hover:bg-sage-100",
        danger: "bg-error-500 text-ivory-50 hover:opacity-90",
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
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
