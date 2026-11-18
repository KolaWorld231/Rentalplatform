import { Briefcase, Building2, DoorOpen, Home, LayoutGrid, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatCategory } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  apartment: Building2,
  house: Home,
  room: DoorOpen,
  studio: LayoutGrid,
  shop: Store,
  office: Briefcase,
};

/**
 * Category row under the search bar.
 *
 * Only categories that actually have published listings are shown. A
 * chip that leads to an empty result set is worse than no chip: it reads
 * as a dead end rather than as a filter, and this is the first thing a
 * visitor touches.
 */
export function CategoryNav({
  categories,
  active,
}: {
  categories: { category: string; count: number }[];
  active?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Property types" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Chip href="/search" active={!active} icon={LayoutGrid} label="All" />
      {categories.map(({ category, count }) => (
        <Chip
          key={category}
          href={`/search?category=${category}`}
          active={active === category}
          icon={ICONS[category] ?? Building2}
          label={formatCategory(category)}
          count={count}
        />
      ))}
    </nav>
  );
}

function Chip({
  href,
  active,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors motion-reduce:transition-none",
        active
          ? "border-brand-600 bg-accent-soft font-medium text-accent-on-soft"
          : "border-border text-charcoal-700 hover:border-charcoal-400",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
      {count !== undefined && <span className="text-xs text-charcoal-400">{count}</span>}
    </Link>
  );
}
