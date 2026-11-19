"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/Popover";
import { PROPERTY_CATEGORIES } from "@/types/database";
import { formatCategory, formatUsd } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Segment = "where" | "type" | "budget" | "filters";

/**
 * The hero search was a single free-text box plus a bedrooms select,
 * while /search already supported county, city, category, price range,
 * bedrooms and furnished. Most of what a renter can filter by was simply
 * unreachable from the homepage.
 *
 * Each panel is defined once and rendered twice: inside a popover on
 * desktop, and stacked inside a sheet on a phone. One definition is what
 * stops the two from drifting apart as filters are added.
 *
 * Every value maps to a key `searchParamsSchema` already parses, so this
 * adds no backend surface -- it exposes filtering that existed.
 */
/** Collapse once the bar has been scrolled well clear of; expand again
 *  near the top. The gap between the two is hysteresis -- with a single
 *  threshold, a scroll that hovers on the boundary flips the bar open
 *  and shut on every wheel tick. */
const COLLAPSE_AT = 160;
const EXPAND_AT = 64;

export function SegmentedSearch({
  counties = [],
  communities = [],
  className,
  sticky = false,
}: {
  /** Counties with at least one published listing (real data, not the full enum). */
  counties?: string[];
  /** Communities/cities with published listings, for suggestions. */
  communities?: string[];
  className?: string;
  /** Stick below the header and shrink to a summary pill once scrolled. */
  sticky?: boolean;
}) {
  const router = useRouter();
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [county, setCounty] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [furnished, setFurnished] = useState(false);

  /**
   * Scrolled past the bar, so it should shrink out of the way. Starts
   * false, which is also what the server renders: the full bar is the
   * no-JavaScript state, and `position: sticky` needs no script, so a
   * visitor without JS still gets a search bar that follows them down
   * the page -- just one that never shrinks.
   */
  const [scrolledPast, setScrolledPast] = useState(false);
  /**
   * Set when someone opens the collapsed pill. Without it, the next
   * scroll event would shut the bar again while they were still typing
   * in it. Cleared once they return to the top, where the bar is
   * expanded anyway and the override has nothing left to override.
   */
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!sticky) return;

    function read() {
      frame.current = null;
      const y = window.scrollY;
      setScrolledPast((was) => (was ? y > EXPAND_AT : y > COLLAPSE_AT));
      if (y <= EXPAND_AT) setManuallyExpanded(false);
    }

    function onScroll() {
      // Scroll fires far more often than the screen repaints, and this
      // handler reads layout. Coalescing to one read per frame keeps a
      // fast scroll from turning into a queue of forced reflows.
      if (frame.current === null) frame.current = requestAnimationFrame(read);
    }

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [sticky]);

  // An open popover or sheet keeps the bar expanded whatever the scroll
  // position: collapsing the control a panel is anchored to would tear
  // the panel off its trigger mid-interaction.
  const collapsed = sticky && scrolledPast && !manuallyExpanded && !openSegment && !sheetOpen;

  function expandFromPill() {
    setManuallyExpanded(true);
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
    setSheetOpen(false);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearAll() {
    setCounty("");
    setPlace("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setFurnished(false);
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

  const activeSummary = [
    place.trim() || county,
    category ? formatCategory(category) : "",
    minPrice || maxPrice ? budgetLabel : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const whereContent = (
    <>
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
    </>
  );

  const typeContent = (
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
  );

  const budgetContent = (
    <>
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
        <p className="mt-2 text-xs font-medium text-error">The minimum is higher than the maximum.</p>
      )}
    </>
  );

  const filtersContent = (
    <>
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
    </>
  );

  return (
    <div
      className={cn(
        // `top-16` clears the 64px header, which is itself sticky at
        // z-40; this sits just under it so the two never fight. The
        // negative margin plus matching padding lets the blurred
        // backing run to the edges of the page gutter instead of
        // leaving listings visible in a strip beside the bar.
        sticky && "sticky top-16 z-30 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        sticky &&
          scrolledPast &&
          "bg-surface-base/85 backdrop-blur transition-colors duration-[var(--motion-base)] ease-standard motion-reduce:transition-none",
      )}
    >
      {/*
        Collapsed: one pill carrying the current search, which expands
        back on click. Desktop only -- a phone already shows a pill at
        every scroll position, so there is nothing to collapse there.
      */}
      {collapsed && (
        <button
          type="button"
          onClick={expandFromPill}
          aria-label="Expand search"
          data-search-pill=""
          className="focus-ring u-press animate-scale-in mx-auto hidden w-full max-w-xl items-center gap-3 rounded-full bg-surface-raised px-5 py-2.5 text-left shadow-[var(--shadow-raised)] transition-shadow duration-[var(--motion-fast)] hover:shadow-[var(--shadow-floating)] sm:flex"
        >
          <Search className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal-700">
            {activeSummary || "Search properties"}
          </span>
          <span className="shrink-0 text-xs text-charcoal-400">Change</span>
        </button>
      )}

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "hidden rounded-full bg-surface-raised p-1.5 shadow-[var(--shadow-clay-raised)] sm:flex sm:items-center",
          collapsed && "sm:hidden",
          className,
        )}
      >
        <Field
          label="Where"
          value={whereLabel}
          active={!!(place.trim() || county)}
          open={openSegment === "where"}
          onOpenChange={(next) => setOpenSegment(next ? "where" : null)}
          panelLabel="Choose a location"
          panelClassName="w-[min(22rem,calc(100vw-2rem))]"
        >
          {whereContent}
        </Field>

        <Divider />

        <Field
          label="Property type"
          value={typeLabel}
          active={!!category}
          open={openSegment === "type"}
          onOpenChange={(next) => setOpenSegment(next ? "type" : null)}
          panelLabel="Choose a property type"
          panelClassName="w-[min(20rem,calc(100vw-2rem))]"
        >
          {typeContent}
        </Field>

        <Divider />

        <Field
          label="Budget"
          value={budgetLabel}
          active={!!(minPrice || maxPrice)}
          open={openSegment === "budget"}
          onOpenChange={(next) => setOpenSegment(next ? "budget" : null)}
          panelLabel="Set a monthly budget"
          panelClassName="w-[min(22rem,calc(100vw-2rem))]"
        >
          {budgetContent}
        </Field>

        <Divider />

        <Field
          label="Filters"
          value={filtersLabel}
          active={extraCount > 0}
          open={openSegment === "filters"}
          onOpenChange={(next) => setOpenSegment(next ? "filters" : null)}
          panelLabel="More filters"
          panelClassName="w-[min(20rem,calc(100vw-2rem))]"
          align="end"
        >
          {filtersContent}
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
          className="focus-ring ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-ivory-50 transition-transform hover:bg-accent-hover active:translate-y-0.5 motion-reduce:transition-none"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>

      {/*
        On a phone the four segments stacked into a ~600px block that
        pushed every listing off the first screen -- the opposite of the
        point. The bar collapses to one control that opens a focused
        sheet, so what a visitor sees first is still properties.
      */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={cn(
          "focus-ring flex w-full items-center gap-3 rounded-full bg-surface-raised px-5 py-3 text-left shadow-[var(--shadow-clay-raised)] sm:hidden",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-charcoal-700">
            {activeSummary || "Search properties"}
          </span>
          <span className="block truncate text-xs text-charcoal-400">
            {activeSummary ? "Tap to change" : "Location, type, budget"}
          </span>
        </span>
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-charcoal-400" aria-hidden="true" />
      </button>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search properties"
          className="animate-dropdown-in fixed inset-0 z-50 flex flex-col bg-surface-base sm:hidden"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-charcoal-700">Search</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close search"
              className="focus-ring rounded-full p-2 hover:bg-surface-muted"
            >
              <X className="h-5 w-5 text-charcoal-700" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <SheetSection title="Where">{whereContent}</SheetSection>
            <SheetSection title="Property type">{typeContent}</SheetSection>
            <SheetSection title="Budget">{budgetContent}</SheetSection>
            <SheetSection title="More filters">{filtersContent}</SheetSection>
          </div>

          <div className="flex items-center gap-3 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={clearAll}
              className="focus-ring rounded-[var(--radius-sm)] px-2 py-2 text-sm font-medium text-charcoal-500 hover:text-accent-text"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={submit}
              className="focus-ring flex-1 rounded-full bg-accent px-5 py-3 text-sm font-medium text-ivory-50 hover:bg-accent-hover"
            >
              Show properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border py-5 last:border-b-0">
      <h3 className="mb-3 text-sm font-semibold text-charcoal-700">{title}</h3>
      {children}
    </section>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-8 w-px shrink-0 bg-border" />;
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
  label: string;
  value: string;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelLabel: string;
  panelClassName?: string;
  align?: "start" | "end";
  children: ReactNode;
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
  children: ReactNode;
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
