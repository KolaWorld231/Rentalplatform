"use client";

import {
  BadgeCheck,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Plus,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Popover } from "@/components/ui/Popover";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };

/**
 * The header previously offered a single icon linking straight to
 * /account, so every other destination an authenticated person has --
 * saved properties, their listings, verification, the pass -- was
 * reachable only by knowing the URL or hunting through the footer.
 *
 * Items are filtered by role rather than hidden with CSS: an owner-only
 * destination is not rendered for a renter at all. This mirrors, and
 * does not replace, the server-side checks -- `requireRole` still guards
 * every one of these routes, so a hand-typed URL is refused regardless
 * of what this menu shows.
 */
export function AccountMenu({
  isAuthenticated,
  isOwner,
  isAdmin,
  displayName,
}: {
  isAuthenticated: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  displayName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // The pass is not listed here while it cannot be bought. It stays
  // reachable for anyone who already has one, or is mid-flow, through
  // Account -> Direct Access Pass, which shows status, expiry and
  // payment history. See the note on navLinks in Header.tsx.
  const renterItems: Item[] = [
    { href: "/favourites", label: "Saved properties", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageCircle },
  ];

  const ownerItems: Item[] = isOwner
    ? [
        { href: "/dashboard", label: "Owner dashboard", icon: LayoutDashboard },
        { href: "/dashboard/properties", label: "My listings", icon: LayoutDashboard },
        { href: "/dashboard/properties/new", label: "List a property", icon: Plus },
        { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
      ]
    : [{ href: "/register?intent=owner", label: "List a property — free", icon: Plus }];

  const adminItems: Item[] = isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : [];

  const supportItems: Item[] = [
    { href: "/help", label: "Help & support", icon: LifeBuoy },
    { href: "/safety", label: "Safety guidance", icon: HelpCircle },
  ];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      label="Account menu"
      panelClassName="w-[min(17rem,calc(100vw-2rem))] p-2"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={isAuthenticated ? "Account menu" : "Menu"}
          className="focus-ring flex items-center gap-2 rounded-full border border-border p-1.5 pl-3 transition-shadow hover:shadow-[var(--shadow-subtle)] motion-reduce:transition-none"
        >
          <span className="hidden text-xs font-medium text-charcoal-500 sm:block">Menu</span>
          {isAuthenticated ? (
            <Avatar name={displayName} size="sm" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted">
              <User className="h-4 w-4 text-charcoal-500" aria-hidden="true" />
            </span>
          )}
        </button>
      )}
    >
      {isAuthenticated ? (
        <div className="flex flex-col">
          <Link
            href="/account"
            onClick={close}
            className="focus-ring flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-surface-muted"
          >
            <User className="h-4 w-4 shrink-0 text-charcoal-500" aria-hidden="true" />
            <span className="truncate">{displayName?.trim() || "My account"}</span>
          </Link>

          <Group items={renterItems} onNavigate={close} />
          <Group items={ownerItems} onNavigate={close} />
          {adminItems.length > 0 && <Group items={adminItems} onNavigate={close} />}
          <Group items={supportItems} onNavigate={close} />

          <Separator />
          <form action={logoutAction}>
            <button
              type="submit"
              className="focus-ring flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm text-charcoal-700 hover:bg-surface-muted"
            >
              <LogOut className="h-4 w-4 shrink-0 text-charcoal-500" aria-hidden="true" />
              Log out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col">
          <Link
            href="/login"
            onClick={close}
            className="focus-ring rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-surface-muted"
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={close}
            className="focus-ring rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-charcoal-700 hover:bg-surface-muted"
          >
            Create an account
          </Link>
          <Separator />
          <Group
            items={[
              { href: "/register?intent=owner", label: "List a property — free", icon: Plus },
              ...supportItems,
            ]}
            onNavigate={close}
          />
        </div>
      )}
    </Popover>
  );
}

function Group({ items, onNavigate }: { items: Item[]; onNavigate: () => void }) {
  if (items.length === 0) return null;
  return (
    <>
      <Separator />
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="focus-ring flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm text-charcoal-700 hover:bg-surface-muted"
        >
          <item.icon className="h-4 w-4 shrink-0 text-charcoal-500" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </>
  );
}

function Separator() {
  return <span aria-hidden="true" className="my-1 block h-px bg-border" />;
}
