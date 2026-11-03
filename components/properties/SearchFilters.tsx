"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "@/types/database";
import { formatCategory } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function CategoryChips({ activeCategory }: { activeCategory: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleCategory(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeCategory === category) params.delete("category");
    else params.set("category", category);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PROPERTY_CATEGORIES.map((category) => {
        const active = activeCategory === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => toggleCategory(category)}
            aria-pressed={active}
            className={cn(
              "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-clay-500 bg-clay-500 text-ivory-50"
                : "border-border bg-surface text-charcoal-600 hover:border-clay-500/50",
            )}
          >
            {formatCategory(category)}
          </button>
        );
      })}
    </div>
  );
}

function FilterFields({
  defaults,
}: {
  defaults: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
        County
        <select
          name="county"
          defaultValue={defaults.county ?? ""}
          className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
        >
          <option value="">Any county</option>
          {LIBERIA_COUNTIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="City or community"
        name="city"
        defaultValue={defaults.city}
        placeholder="e.g. Monrovia or Sinkor"
      />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
        Property type
        <select
          name="category"
          defaultValue={defaults.category ?? ""}
          className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
        >
          <option value="">Any type</option>
          {PROPERTY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-charcoal-700">
        Bedrooms (min)
        <select
          name="bedrooms"
          defaultValue={defaults.bedrooms ?? ""}
          className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm shadow-[var(--shadow-clay-inset)]"
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </label>

      <Input label="Min price (USD)" name="minPrice" type="number" min={0} defaultValue={defaults.minPrice} />
      <Input label="Max price (USD)" name="maxPrice" type="number" min={0} defaultValue={defaults.maxPrice} />
    </div>
  );
}

export function SearchFilters({ resultCount }: { resultCount?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const defaults = Object.fromEntries(searchParams.entries());
  const activeCount = ["county", "city", "category", "bedrooms", "minPrice", "maxPrice", "furnished"].filter(
    (k) => defaults[k],
  ).length;

  function applyForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value);
    }
    router.push(`/search?${params.toString()}`);
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="mb-3">
        <CategoryChips activeCategory={defaults.category ?? ""} />
      </div>

      <div className="hidden rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-raised)] md:block">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyForm(e.currentTarget);
          }}
          className="flex flex-col gap-4"
        >
          <FilterFields defaults={defaults} />
          <div className="flex items-center justify-between">
            {resultCount !== undefined && (
              <p className="text-sm text-charcoal-500">{resultCount} properties found</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => router.push("/search")}>
                Clear filters
              </Button>
              <Button type="submit">Apply filters</Button>
            </div>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between md:hidden">
        <p className="text-sm text-charcoal-500">{resultCount !== undefined ? `${resultCount} results` : ""}</p>
        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyForm(e.currentTarget);
          }}
          className="flex flex-col gap-5"
        >
          <FilterFields defaults={defaults} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                router.push("/search");
                setDrawerOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button type="submit" className="flex-1">
              Show results
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
