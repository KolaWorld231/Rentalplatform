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

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
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

/**
 * For a date that hasn't happened yet (subscription expiry). Using
 * formatRelativeDate here would misreport "Today" for any date up to 30
 * days in the future, since it only accounts for elapsed, not remaining,
 * time — caught against a live subscription whose expires_at was
 * genuinely ~30 days out.
 */
export function formatExpiryDate(iso: string): string {
  const date = new Date(iso);
  const daysRemaining = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return "today";
  if (daysRemaining === 1) return "tomorrow";
  if (daysRemaining < 30) return `in ${daysRemaining} days`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
