import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Badges change meaning in place -- a listing goes draft to published,
 * a verification goes pending to verified -- so the colour transitions
 * rather than cutting. The badge itself does not animate in: it almost
 * always arrives inside content that is already being revealed, and two
 * entrances on the same element read as a stutter.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--motion-base)] ease-standard",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-charcoal-700",
        brand: "bg-accent-soft text-accent-on-soft",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        error: "bg-error-soft text-error",
        info: "bg-info-soft text-info",
        clay: "bg-accent-soft text-accent-on-soft",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
