import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-sage-200", className)}
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
