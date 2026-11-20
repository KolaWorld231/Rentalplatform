import type { AvailabilityStatus } from "@/types/database";

export type VacancyTone = "success" | "warning" | "error" | "neutral";

export interface VacancyState {
  kind: "vacant" | "vacant-soon" | "occupied" | "pending" | "unavailable";
  /** Short enough for a property card's meta row. */
  label: string;
  tone: VacancyTone;
  /** Whole days until the property frees up; null unless `vacant-soon`. */
  daysAway: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date-only comparison. A property free from today is free today, and a
 *  timestamp a few hours either side of midnight must not change that. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseDateOnly(value: string): Date | null {
  // `move_in_date` is a Postgres `date`, so it arrives as YYYY-MM-DD.
  // `new Date("2026-03-15")` parses as UTC midnight, which is the
  // previous day in any negative offset -- hence the explicit parts.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * What a renter should be told about when they could move in.
 *
 * The owner's switch is the authority on whether a property is free now.
 * `vacantFrom` only ever adds a *future* date to an occupied property --
 * a date that has passed says nothing, so it is ignored rather than
 * allowed to advertise a vacancy that never got reconfirmed. An owner
 * who set "vacant from 1 January" and then forgot about it should not
 * still be claiming availability in March.
 */
export function vacancyState(
  status: AvailabilityStatus,
  vacantFrom: string | null | undefined,
  now: Date = new Date(),
): VacancyState {
  if (status === "available") {
    return { kind: "vacant", label: "Vacant now", tone: "success", daysAway: 0 };
  }

  if (status === "pending_rental") {
    return { kind: "pending", label: "Rental pending", tone: "warning", daysAway: null };
  }

  if (status === "temporarily_unavailable") {
    return { kind: "unavailable", label: "Unavailable", tone: "neutral", daysAway: null };
  }

  // Occupied. A future date is the one thing that makes this listing
  // still worth a renter's attention.
  const from = vacantFrom ? parseDateOnly(vacantFrom) : null;
  if (from) {
    const days = Math.round((startOfDay(from) - startOfDay(now)) / DAY_MS);
    if (days > 0) {
      return {
        kind: "vacant-soon",
        label: `Vacant from ${formatShort(from)}`,
        tone: "warning",
        daysAway: days,
      };
    }
  }

  return { kind: "occupied", label: "Occupied", tone: "error", daysAway: null };
}
