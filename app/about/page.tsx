import { brand } from "@/lib/config/brand";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">About {brand.name}</h1>
      <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-charcoal-600">
        <p>
          Finding a place to rent in Liberia often means going through an agent who charges
          roughly US$30–40 just to arrange a viewing — with no guarantee you&apos;ll find
          something suitable, and no refund if you don&apos;t. {brand.name} exists to make that
          process more direct and more affordable.
        </p>
        <p>
          Property owners list for free. Renters browse and search for free. To message an owner
          directly, a renter unlocks a 30-day Direct Access Pass for $5 — one flat cost to contact
          as many owners as they need, instead of paying per viewing.
        </p>
        <p>
          We don&apos;t claim to verify every listing or guarantee every advertiser is a legitimate
          property owner — see our{" "}
          <a href="/safety" className="text-brand-700">
            safety guidance
          </a>{" "}
          for what to check before you commit to anything. What we do is remove the agent fee from
          the first step of the search.
        </p>
        <p className="text-xs text-charcoal-400">
          {brand.name} is a provisional development name and {brand.legalEntityName} is a
          placeholder pending real business registration — this page will be updated once that
          process is complete.
        </p>
      </div>
    </div>
  );
}
