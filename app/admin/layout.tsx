import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/session";

export const metadata = { robots: { index: false, follow: false } };

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["admin", "moderator"], "/admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Admin" className="mb-6 flex gap-2 overflow-x-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="focus-ring whitespace-nowrap rounded-[var(--radius-md)] bg-surface px-4 py-2 text-sm font-medium text-charcoal-700 shadow-[var(--shadow-subtle)] hover:bg-sage-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
