import { vacancyState, type VacancyTone } from "@/lib/properties/availability";
import type { AvailabilityStatus } from "@/types/database";
import { cn } from "@/lib/utils/cn";

const DOT: Record<VacancyTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  neutral: "bg-charcoal-400",
};

const TEXT: Record<VacancyTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  neutral: "text-charcoal-500",
};

/**
 * Where a property stands on vacancy, as a coloured dot and a few words.
 *
 * A dot rather than a badge, and in the card's facts rather than on the
 * photo, for a reason worth keeping: the photo corner is reserved for
 * exceptions, and this marker is on *every* card. Previously only the
 * exception states were shown, precisely so that a chip reading
 * "Available" would not sit identically on every listing and crowd out
 * the signals that carry information. A dot states the same thing at a
 * fraction of the weight, which is what lets it be shown everywhere.
 *
 * Colour is never the only carrier -- each state has its own words, so
 * it survives greyscale and colour blindness.
 */
export function AvailabilityMarker({
  status,
  vacantFrom,
  className,
  size = "sm",
}: {
  status: AvailabilityStatus;
  vacantFrom?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const state = vacancyState(status, vacantFrom);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        TEXT[state.tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("inline-block shrink-0 rounded-full", DOT[state.tone], size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")}
      />
      {state.label}
    </span>
  );
}
