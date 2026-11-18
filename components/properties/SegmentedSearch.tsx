"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { PROPERTY_CATEGORIES } from "@/types/database";
import { formatCategory, formatUsd } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Segment = "where" | "type" | "budget" | "filters";

/**
 * The hero search was a single free-text box plus a bedrooms select,
 * while the search page already supported county, city, category, price
 * range, bedrooms and furnished. Most of what a renter can filter by was
 * simply unreachable from the homepage.
 *
 * Every value here maps to a key `searchParamsSchema` already parses, so
 * this adds no backend surface -- it exposes filtering that existed.
 */
export function SegmentedSearch({
  counties = [],
  communities = [],
  className,
}: {
  /** Counties with at least one published listing (real data, not the full enum). */
  counties?: string[];
  /** Communities/cities with published listings, for suggestions. */
  communities?: string[];
  className?: string;
}) {
  const router = useRouter();
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);

  const [county, setCounty] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [furnished, setFurnished] = useState(false);

  function toggle(segment: Segment) {
    return (next: boolean) => setOpenSegment(next ? segment : null);
  }

  function submit() {
    const params = new URLSearchParams();
    if (place.trim()) params.set("city", place.trim());
    if (county) params.set("county", county);
    if (category) params.set("category", category);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (furnished) params.set("furnished", "true");
    setOpenSegment(null);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const whereLabel = place.trim() || county || "Anywhere in Liberia";
  const typeLabel = category ? formatCategory(category) : "Any type";
  const budgetLabel =
    minPrice && maxPrice
      ? `${formatUsd(Number(minPrice))}–${formatUsd(Number(maxPrice))}`
      : minPrice
        ? `From ${formatUsd(Number(minPrice))}`
        : maxPrice
          ? `Up to ${formatUsd(Number(maxPrice))}`
          : "Any budget";
  const extraCount = (bedrooms ? 1 : 0) + (furnished ? 1 : 0);
  const filtersLabel = extraCount > 0 ? `${extraCount} filter${extraCount > 1 ? "s" : ""}` : "More filters";

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "flex flex-col gap-1 rounded-[var(--radius-xl)] bg-surface-raised p-2 shadow-[var(--shadow-clay-raised)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:p-1.5",
        className,
      )}
    >
      <Field
        segment="where"
        label="Where"
        value={whereLabel}
        active={!!(place.trim() || county)}
        open={openSegment === "where"}
        onOpenChange={toggle("where")}
        panelLabel="Choose a location"
        panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      >
        <label className="block text-xs font-medium text-charcoal-500" htmlFor="seg-place">
          City or community
        </label>
        <input
          id="seg-place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="e.g. Sinkor, Paynesville"
          className="focus-ring mt-1 h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-charcoal-700"
        />
        {communities.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium text-charcoal-500">Where listings are now</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {communities.slice(0, 8).map((c) => (
                <Chip key={c} active={place === c} onClick={() => setPlace(place === c ? "" : c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </>
        )}
        {counties.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium text-charcoal-500">County</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {counties.map((c) => (
                <Chip key={c} active={county === c} onClick={() => setCounty(county === c ? "" : c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </>
        )}
      </Field>

      <Divider />

      <Field
        segment="type"
        label="Property type"
        value={typeLabel}
        active={!!category}
        open={openSegment === "type"}
        onOpenChange={toggle("type")}
        panelLabel="Choose a property type"
        panelClassName="w-[min(20rem,calc(100vw-2rem))]"
      >
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!category} onClick={() => setCategory("")}>
            Any type
          </Chip>
          {PROPERTY_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? "" : c)}>
              {formatCategory(c)}
            </Chip>
          ))}
        </div>
      </Field>

      <Divider />

      <Field
        segment="budget"
        label="Budget"
        value={budgetLabel}
        active={!!(minPrice || maxPrice)}
        open={openSegment === "budget"}
        onOpenChange={toggle("budget")}
        panelLabel="Set a monthly budget"
        panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      >
        <p className="text-xs text-charcoal-500">Monthly rent, in US dollars.</p>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-charcoal-500" htmlFor="seg-min">
              Minimum
            </label>
            <input
              id="seg-min"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="focus-ring mt-1 h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-charcoal-700"
            />
          </div>
          <span className="pb-3 text-charcoal-400">–</span>
          <div className="flex-1">
            <label className="block text-xs font-medium text-charcoal-500" htmlFor="seg-max">
              Maximum
            </label>
            <input
              id="seg-max"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="Any"
              className="focus-ring mt-1 h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-charcoal-700"
            />
          </div>
        </div>
        {minPrice && maxPrice && Number(minPrice) > Number(maxPrice) && (
          <p className="mt-2 text-xs font-medium text-error">
            The minimum is higher than the maximum.
          </p>
        )}
      </Field>

      <Divider />

      <Field
        segment="filters"
        label="Filters"
        value={filtersLabel}
        active={extraCount > 0}
        open={openSegment === "filters"}
        onOpenChange={toggle("filters")}
        panelLabel="More filters"
        panelClassName="w-[min(20rem,calc(100vw-2rem))]"
        align="end"
      >
        <p className="text-xs font-medium text-charcoal-500">Bedrooms</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip active={!bedrooms} onClick={() => setBedrooms("")}>
            Any
          </Chip>
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} active={bedrooms === String(n)} onClick={() => setBedrooms(String(n))}>
              {n}+
            </Chip>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-charcoal-700">
          <input
            type="checkbox"
            checked={furnished}
            onChange={(e) => setFurnished(e.target.checked)}
            className="focus-ring h-4 w-4 rounded border-border accent-[var(--accent-fill)]"
          />
          Furnished only
        </label>

        {extraCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setBedrooms("");
              setFurnished(false);
            }}
            className="focus-ring mt-4 flex items-center gap-1 text-xs font-medium text-charcoal-500 hover:text-accent-text"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Clear these filters
          </button>
        )}
      </Field>

      <button
        type="submit"
        aria-label="Search properties"
        className="focus-ring mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-ivory-50 transition-transform hover:bg-accent-hover active:translate-y-0.5 motion-reduce:transition-none sm:ml-1 sm:mt-0 sm:h-12 sm:w-12 sm:px-0"
      >
        <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="sm:sr-only">Search</span>
      </button>
    </form>
  );
}

function Divider() {
  return <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-border sm:block" />;
}

function Field({
  label,
  value,
  active,
  open,
  onOpenChange,
  panelLabel,
  panelClassName,
  align,
  children,
}: {
  segment: Segment;
  label: string;
  value: string;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelLabel: string;
  panelClassName?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        label={panelLabel}
        align={align}
        panelClassName={panelClassName}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className={cn(
              "focus-ring w-full rounded-full px-4 py-2 text-left transition-colors hover:bg-surface-muted motion-reduce:transition-none",
              open && "bg-surface-muted",
            )}
          >
            <span className="block text-xs font-medium text-charcoal-500">{label}</span>
            <span
              className={cn(
                "block truncate text-sm",
                active ? "font-medium text-charcoal-700" : "text-charcoal-400",
              )}
            >
              {value}
            </span>
          </button>
        )}
      >
        {children}
      </Popover>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none",
        active
          ? "border-brand-600 bg-accent-soft text-accent-on-soft"
          : "border-border text-charcoal-700 hover:border-charcoal-400",
      )}
    >
      {children}
    </button>
  );
}
