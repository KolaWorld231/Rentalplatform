// Hand-ported subset of ../../lib/utils/format.ts -- same rules, kept in
// sync by hand (see mobile/README.md). Only the formatters browse/search
// needs so far; extend as later milestones need more.
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRentalFrequency(frequency: string): string {
  switch (frequency) {
    case "monthly":
      return "/ month";
    case "quarterly":
      return "/ quarter";
    case "yearly":
      return "/ year";
    case "nightly":
      return "/ night";
    default:
      return "";
  }
}

export function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function isRecentlyPublished(iso: string | null, withinMs: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < withinMs;
}

export const AVAILABILITY_STALE_AFTER_DAYS = 14;

export function isAvailabilityStale(lastConfirmed: string | null): boolean {
  if (!lastConfirmed) return true;
  const days = Math.floor((Date.now() - new Date(lastConfirmed).getTime()) / 86_400_000);
  return days >= AVAILABILITY_STALE_AFTER_DAYS;
}

/** For a date that already happened (message sent, listing created, etc). */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** For a date that hasn't happened yet (subscription expiry). */
export function formatExpiryDate(iso: string): string {
  const date = new Date(iso);
  const daysRemaining = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return "today";
  if (daysRemaining === 1) return "tomorrow";
  if (daysRemaining < 30) return `in ${daysRemaining} days`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Hand-mirrored from web's lib/utils/format.ts (no shared package between
 * web and mobile -- see mobile/README.md). Keep the two in sync.
 *
 * Day label for a message thread's date separators. Compares calendar
 * days in the viewer's local zone, not elapsed hours -- 11pm and 1am are
 * different days even though they are two hours apart.
 */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** True when the two timestamps fall on different calendar days locally. */
export function isNewDay(iso: string, prevIso: string | null | undefined): boolean {
  if (!prevIso) return true;
  const a = new Date(iso);
  const b = new Date(prevIso);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}
