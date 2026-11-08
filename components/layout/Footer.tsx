import Link from "next/link";
import { brand } from "@/lib/config/brand";

const columns = [
  {
    heading: "Renters",
    links: [
      { href: "/search", label: "Browse Properties" },
      { href: "/pricing", label: "Direct Access Pass" },
      { href: "/safety", label: "Safety Guidance" },
    ],
  },
  {
    heading: "Owners",
    links: [
      { href: "/how-it-works#owners", label: "List Your Property" },
      { href: "/how-it-works#owners", label: "Verification" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/help", label: "Help & Support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/subscription-terms", label: "Subscription Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-sage-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-1">
          <p className="font-display text-lg font-semibold text-brand-800">{brand.name}</p>
          <p className="mt-2 text-sm text-charcoal-500">{brand.tagline}</p>
        </div>
        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-charcoal-700">{col.heading}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-charcoal-500 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-charcoal-400 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} {brand.legalEntityName}. {brand.name} does not verify that every
        advertiser is the legal owner of a property and does not guarantee rental outcomes.
      </div>
    </footer>
  );
}
