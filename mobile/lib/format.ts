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

/** For a date that hasn't happened yet (subscription expiry). */
export function formatExpiryDate(iso: string): string {
  const date = new Date(iso);
  const daysRemaining = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return "today";
  if (daysRemaining === 1) return "tomorrow";
  if (daysRemaining < 30) return `in ${daysRemaining} days`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
