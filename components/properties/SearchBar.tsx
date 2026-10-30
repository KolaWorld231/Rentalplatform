"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (q.trim()) params.set("q", q.trim());
        else params.delete("q");
        params.delete("page");
        router.push(`/search?${params.toString()}`);
      }}
      className="flex items-center gap-2 rounded-[var(--radius-xl)] bg-surface p-2 shadow-[var(--shadow-floating)]"
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-charcoal-400" aria-hidden="true" />
      <label htmlFor="search-q" className="sr-only">
        Search properties
      </label>
      <input
        id="search-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by neighborhood, property title..."
        className="focus-ring h-10 flex-1 bg-transparent text-sm text-charcoal-700 outline-none placeholder:text-charcoal-400"
      />
      <Button type="submit" size="sm">
        Search
      </Button>
    </form>
  );
}
