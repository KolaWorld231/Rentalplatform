import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/properties", label: "My Properties" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole("owner", "/dashboard");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Dashboard" className="mb-6 flex gap-2 overflow-x-auto">
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
