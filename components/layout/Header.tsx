"use client";

import { Heart, Home, Menu, MessageCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/search", label: "Browse Properties" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/safety", label: "Safety" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ivory-100/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-brand-800">
          <Home className="h-6 w-6 text-brand-600" aria-hidden="true" />
          {brand.name}
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-[var(--radius-sm)] text-sm font-medium text-charcoal-500 hover:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/messages" aria-label="Messages" className="focus-ring rounded-full p-2 hover:bg-sage-100">
            <MessageCircle className="h-5 w-5 text-charcoal-500" />
          </Link>
          <Link href="/favourites" aria-label="Saved properties" className="focus-ring rounded-full p-2 hover:bg-sage-100">
            <Heart className="h-5 w-5 text-charcoal-500" />
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
            Get started
          </Link>
        </div>

        <button
          className="focus-ring rounded-[var(--radius-sm)] p-2 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-ivory-100 px-4 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-1.5 text-sm font-medium text-charcoal-700" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex gap-2 pt-2">
              <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
                Log in
              </Link>
              <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
                Get started
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface py-2 shadow-[var(--shadow-floating)] md:hidden"
    >
      <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-charcoal-500">
        <Home className="h-5 w-5" />
        Home
      </Link>
      <Link href="/search" className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-charcoal-500">
        <Search className="h-5 w-5" />
        Search
      </Link>
      <Link href="/favourites" className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-charcoal-500">
        <Heart className="h-5 w-5" />
        Saved
      </Link>
      <Link href="/messages" className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-charcoal-500">
        <MessageCircle className="h-5 w-5" />
        Messages
      </Link>
    </nav>
  );
}
