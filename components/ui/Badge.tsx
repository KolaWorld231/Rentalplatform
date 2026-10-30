import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-sage-100 text-charcoal-700",
        brand: "bg-brand-100 text-brand-800",
        success: "bg-success-100 text-success-500",
        warning: "bg-warning-100 text-warning-500",
        error: "bg-error-100 text-error-500",
        info: "bg-info-100 text-info-500",
        clay: "bg-clay-400/20 text-clay-600",
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
