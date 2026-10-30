import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-raised)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardClay({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-ivory-100 shadow-[var(--shadow-clay-raised)]",
        className,
      )}
      {...props}
    />
  );
}
