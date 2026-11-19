import { X } from "lucide-react";
import Link from "next/link";
import { formatCategory, formatUsd } from "@/lib/utils/format";
import type { SearchParamsInput } from "@/lib/validation/property";

type Chip = { key: string; label: string };

/**
 * Applied filters were visible only inside the sidebar's form controls,
 * which is collapsed on a phone. A renter could land on a result set
 * narrowed by four filters with nothing on screen saying so -- an empty
 * result then reads as "nothing exists here" rather than "your filters
 * are too tight".
 *
 * Each chip removes exactly its own key and preserves the rest, so
 * loosening a search one step at a time does not mean starting over.
 * Plain links, so this works without JavaScript like the rest of the
 * search page.
 */
export function ActiveFilterChips({ params }: { params: SearchParamsInput }) {
  const chips: Chip[] = [];

  if (params.q) chips.push({ key: "q", label: `“${params.q}”` });
  if (params.city) chips.push({ key: "city", label: params.city });
  if (params.county) chips.push({ key: "county", label: `${params.county} County` });
  if (params.category) chips.push({ key: "category", label: formatCategory(params.category) });
  if (params.bedrooms !== undefined) chips.push({ key: "bedrooms", label: `${params.bedrooms}+ bedrooms` });
  if (params.furnished !== undefined) {
    chips.push({ key: "furnished", label: params.furnished ? "Furnished" : "Unfurnished" });
  }

  // Price is one idea to a renter even though it is two keys, so it is one
  // chip -- and removing it clears both ends rather than leaving a stray
  // half-range behind.
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const label =
      params.minPrice !== undefined && params.maxPrice !== undefined
        ? `${formatUsd(params.minPrice)}–${formatUsd(params.maxPrice)}`
        : params.minPrice !== undefined
          ? `From ${formatUsd(params.minPrice)}`
          : `Up to ${formatUsd(params.maxPrice!)}`;
    chips.push({ key: "price", label });
  }

  if (chips.length === 0) return null;

  function hrefWithout(key: string): string {
    const next = new URLSearchParams();
    const keys: (keyof SearchParamsInput)[] = [
      "q",
      "county",
      "city",
      "category",
      "minPrice",
      "maxPrice",
      "bedrooms",
      "furnished",
    ];
    for (const k of keys) {
      if (key === k) continue;
      if (key === "price" && (k === "minPrice" || k === "maxPrice")) continue;
      const value = params[k];
      if (value !== undefined && value !== "") next.set(k, String(value));
    }
    // Sort is a preference, not a filter: it survives removing a chip.
    if (params.sort && params.sort !== "newest") next.set("sort", params.sort);
    return `/search${next.toString() ? `?${next.toString()}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/*
        Each chip is keyed on its value as well as its key, so narrowing
        a filter (Monrovia to Sinkor) replays the arrival rather than
        swapping the label in place -- the chip row is the only thing on
        a phone that says what the current search actually is.
      */}
      {chips.map((chip) => (
        <Link
          key={`${chip.key}:${chip.label}`}
          href={hrefWithout(chip.key)}
          aria-label={`Remove filter: ${chip.label}`}
          className="focus-ring u-press group animate-scale-in flex items-center gap-1.5 rounded-full border border-border bg-surface-raised py-1.5 pl-3 pr-2 text-xs font-medium text-charcoal-700 transition-[color,background-color,border-color,transform,box-shadow] duration-[var(--motion-fast)] ease-standard hover:border-charcoal-400 hover:bg-surface-muted motion-reduce:transition-none"
        >
          {chip.label}
          <X
            className="h-3.5 w-3.5 text-charcoal-400 transition-colors duration-[var(--motion-fast)] group-hover:rotate-90 group-hover:text-accent-text motion-safe:transition-[color,transform] motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      ))}

      {chips.length > 1 && (
        <Link
          href="/search"
          className="focus-ring animate-fade-in rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium text-charcoal-500 transition-colors duration-[var(--motion-fast)] hover:text-accent-text"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
