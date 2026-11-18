import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium",
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
