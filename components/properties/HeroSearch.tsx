"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function HeroSearch({ counties = [] }: { counties?: string[] }) {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [county, setCounty] = useState("");

  return (
    <div className="flex flex-col gap-2.5">
      {counties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {counties.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCounty(c === county ? "" : c)}
              aria-pressed={c === county}
              className={cn(
                "focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                c === county
                  ? "border-clay-500 bg-clay-500 text-ivory-50"
                  : "border-ivory-50/40 bg-ivory-50/10 text-ivory-50 hover:border-ivory-50/70",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          if (city.trim()) params.set("city", city.trim());
          if (bedrooms) params.set("bedrooms", bedrooms);
          if (county) params.set("county", county);
          router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
        }}
        className="flex flex-col gap-2 rounded-[var(--radius-xl)] bg-ivory-50 p-2.5 shadow-[var(--shadow-clay-raised)] sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="h-5 w-5 shrink-0 text-charcoal-400" aria-hidden="true" />
          <label htmlFor="hero-city" className="sr-only">
            City or neighborhood
          </label>
          <input
            id="hero-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Where do you want to live? e.g. Sinkor, Paynesville..."
            className="focus-ring h-11 flex-1 bg-transparent text-sm text-charcoal-700 outline-none placeholder:text-charcoal-400"
          />
        </div>

        <label htmlFor="hero-bedrooms" className="sr-only">
          Minimum bedrooms
        </label>
        <select
          id="hero-bedrooms"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="focus-ring h-11 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)] sm:w-40"
        >
          <option value="">Any bedrooms</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ bedrooms
            </option>
          ))}
        </select>

        <button
          type="submit"
          className={cn(buttonVariants({ variant: "clay", size: "lg" }), "transition-transform active:translate-y-0.5")}
        >
          Search
        </button>
      </form>
    </div>
  );
}
