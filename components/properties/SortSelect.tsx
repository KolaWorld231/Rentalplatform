"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSort = searchParams.get("sort") ?? "newest";

  function changeSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "newest") params.delete("sort");
    else params.set("sort", sort);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-charcoal-600">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={activeSort}
        onChange={(e) => changeSort(e.target.value)}
        aria-label="Sort properties"
        className="focus-ring h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-sm shadow-[var(--shadow-subtle)]"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
