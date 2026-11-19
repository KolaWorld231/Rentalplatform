import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * `interactive` is opt-in rather than the default. A card that lifts
 * under the pointer is promising that clicking it does something; a
 * static panel that moves is just noise, and on a page of six panels it
 * is six competing invitations. Pass it only where the whole card is a
 * link or a button.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-raised)]",
        interactive && "u-lift motion-reduce:transition-none motion-reduce:hover:transform-none",
        className,
      )}
      {...props}
    />
  );
}

export function CardClay({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-surface-overlay shadow-[var(--shadow-clay-raised)]",
        interactive && "u-lift motion-reduce:transition-none motion-reduce:hover:transform-none",
        className,
      )}
      {...props}
    />
  );
}
