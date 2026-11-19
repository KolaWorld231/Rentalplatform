import { cn } from "@/lib/utils/cn";

/**
 * A sweep of light rather than a pulse. A pulsing block fades toward
 * the page background, which at a glance is indistinguishable from a
 * disabled control; a sweep only ever means "something is coming".
 *
 * The sweep is a pseudo-element (`.u-shimmer`, app/globals.css) so the
 * block keeps a solid token background, and it is clipped to the shape,
 * so rounded corners stay rounded.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("u-shimmer rounded-[var(--radius-md)] bg-surface-muted", className)}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-raised)]">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
