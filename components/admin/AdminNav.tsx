"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface AdminNavLink {
  href: string;
  label: string;
  count?: number;
}

function isActivePath(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ links }: { links: AdminNavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="mb-6 flex gap-2 overflow-x-auto">
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-ivory-50 shadow-[var(--shadow-raised)]"
                : "bg-surface text-charcoal-700 shadow-[var(--shadow-subtle)] hover:bg-sage-100",
            )}
          >
            {link.label}
            {!!link.count && link.count > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold",
                  active ? "bg-ivory-50/20 text-ivory-50" : "bg-clay-500 text-ivory-50",
                )}
              >
                {link.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
