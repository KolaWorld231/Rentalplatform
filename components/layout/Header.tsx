"use client";

import { Heart, Home, Menu, MessageCircle, Search, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { IntentChoiceDialog } from "@/components/auth/IntentChoiceDialog";
import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/search", label: "Browse Properties" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/safety", label: "Safety" },
];

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur transition-shadow duration-200",
        scrolled && "shadow-[var(--shadow-subtle)]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-brand-800">
          <BrandMark className="h-7 w-7" />
          {brand.name}
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navLinks.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring relative rounded-[var(--radius-sm)] pb-1 text-sm font-medium transition-colors",
                  active ? "text-brand-700" : "text-charcoal-500 hover:text-brand-700",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-brand-600 transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/messages"
            aria-label="Messages"
            aria-current={isActivePath(pathname, "/messages") ? "page" : undefined}
            className={cn(
              "focus-ring rounded-full p-2 hover:bg-sage-100",
              isActivePath(pathname, "/messages") && "bg-sage-100 text-brand-700",
            )}
          >
            <MessageCircle className="h-5 w-5 text-charcoal-500" />
          </Link>
          <Link
            href="/favourites"
            aria-label="Saved properties"
            aria-current={isActivePath(pathname, "/favourites") ? "page" : undefined}
            className={cn(
              "focus-ring rounded-full p-2 hover:bg-sage-100",
              isActivePath(pathname, "/favourites") && "bg-sage-100 text-brand-700",
            )}
          >
            <Heart className="h-5 w-5 text-charcoal-500" />
          </Link>
          {isAuthenticated ? (
            <Link
              href="/account"
              aria-label="Account"
              className="focus-ring rounded-full p-2 hover:bg-sage-100"
            >
              <User className="h-5 w-5 text-charcoal-500" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Log in
              </Link>
              <IntentChoiceDialog className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
                Get started
              </IntentChoiceDialog>
            </>
          )}
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
        <nav
          className="animate-dropdown-in border-t border-border bg-surface px-4 py-4 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-3">
            {navLinks.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block py-1.5 text-sm font-medium",
                      active ? "text-brand-700" : "text-charcoal-700",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}
                >
                  Account
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
                    Log in
                  </Link>
                  <IntentChoiceDialog className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
                    Get started
                  </IntentChoiceDialog>
                </>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/favourites", label: "Saved", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageCircle },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface py-2 shadow-[var(--shadow-floating)] md:hidden"
    >
      {tabs.map((tab) => {
        const active = isActivePath(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
              active ? "font-semibold text-brand-700" : "text-charcoal-500",
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
