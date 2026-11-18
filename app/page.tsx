import { CloudOff, Home as HomeIcon, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ProcessSteps } from "@/components/marketing/ProcessSteps";
import { HeroSearch } from "@/components/properties/HeroSearch";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils/cn";
import { verifiedFlagsFor, type PropertyWithCover } from "@/services/properties";

const howItWorks = [
  {
    icon: HomeIcon,
    title: "Browse for free",
    body: "Search apartments, houses, rooms, and commercial spaces across Liberia at no cost.",
  },
  {
    icon: MessageCircle,
    title: "Unlock direct messaging",
    body: `Subscribe to the ${subscriptionPlan.name} and message as many owners as you like for ${subscriptionPlan.durationDays} days.`,
  },
  {
    icon: ShieldCheck,
    title: "Know before you commit",
    body: "See disclosed rent, deposits, and move-in costs up front, plus owner verification status.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data, error: recentError }, { data: coverageRows }, { count: publishedCount }] = await Promise.all([
    supabase
      .from("properties")
      .select("*, property_images(id, storage_path, is_cover)")
      .eq("listing_status", "published")
      .order("published_at", { ascending: false })
      .limit(8),
    supabase.from("properties").select("county, owner_id").eq("listing_status", "published"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("listing_status", "published"),
  ]);
  const recentProperties = (data ?? []) as unknown as PropertyWithCover[];

  const verifiedFlags = await verifiedFlagsFor(supabase, recentProperties);

  // Real, database-derived stats only — never fabricated (CLAUDE.md rule #9).
  // A stat with nothing behind it yet is hidden rather than shown as zero.
  const countiesCovered = new Set((coverageRows ?? []).map((r) => r.county)).size;
  const ownersListing = new Set((coverageRows ?? []).map((r) => r.owner_id)).size;
  const counties = [...new Set((coverageRows ?? []).map((r) => r.county))].sort();
  const stats = [
    { value: publishedCount ?? 0, label: "Active listings" },
    { value: ownersListing, label: "Property owners" },
    { value: countiesCovered, label: "Counties covered" },
  ].filter((s) => s.value > 0);

  const heroPhotos = recentProperties
    .map((p) => p.property_images.find((img) => img.is_cover) ?? p.property_images[0])
    .filter((img): img is NonNullable<typeof img> => !!img)
    .slice(0, 3);

  return (
    <div>
      {/*
        The hero used to be a full-bleed wall of brand red with centred
        text. Two problems with that: it made red roughly half the first
        screen, so red could no longer signal anything (the primary
        Search button sat red-on-red and disappeared), and it was the one
        region that ignored the theme entirely -- hardcoded dark in both
        light and dark mode.

        It now sits on the same warm ground as the rest of the page and
        spends red only where red means something: the search action and
        the live stat figures.
      */}
      <section className="relative overflow-hidden border-b border-border bg-surface-base px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {heroPhotos.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={propertyImageUrl(img.storage_path)}
              alt=""
              className={cn(
                "absolute hidden object-cover opacity-[0.14] blur-xl saturate-50 lg:block animate-hero-drift motion-reduce:animate-none",
                i === 0 && "right-[-4rem] top-[-2rem] h-72 w-96 rotate-6 rounded-[var(--radius-2xl)]",
                i === 1 && "right-24 top-56 h-56 w-72 -rotate-3 rounded-[var(--radius-2xl)]",
                i === 2 && "right-[28rem] top-8 h-48 w-64 rotate-2 rounded-[var(--radius-2xl)]",
              )}
            />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="max-w-3xl text-balance font-display text-display-xl font-semibold text-charcoal-700">
              {brand.heroHeading}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-charcoal-500">{brand.heroSupportingCopy}</p>

            <div className="mt-8 max-w-3xl">
              <HeroSearch counties={counties} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register?intent=owner"
                className={cn(buttonVariants({ variant: "secondary", size: "md" }))}
              >
                {brand.secondaryCta}
              </Link>
              <p className="text-sm text-charcoal-500">
                Renters subscribe for {subscriptionPlan.durationDays} days of unlimited direct
                messaging.
              </p>
            </div>
          </div>

          {stats.length > 0 && (
            <dl className="flex shrink-0 gap-8 border-t border-border pt-6 lg:flex-col lg:gap-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs uppercase tracking-wide text-charcoal-400">
                    {stat.label}
                  </dt>
                  <dd className="font-display text-display-sm font-semibold text-accent-text">
                    <CountUp value={stat.value} />+
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-charcoal-700">
              Recently listed
            </h2>
            <Link href="/search" className="text-sm font-medium text-accent-text">
              View all
            </Link>
          </div>
        </Reveal>
        {recentError ? (
          <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
            <CloudOff className="h-10 w-10 text-charcoal-500" aria-hidden="true" />
            <p className="font-medium text-charcoal-700">We couldn&apos;t load listings just now.</p>
            <p className="max-w-md text-sm text-charcoal-500">
              This is a problem on our side, not a sign that there is nothing to rent. Please try
              again in a moment.
            </p>
            <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
              Try again
            </Link>
          </Card>
        ) : recentProperties.length === 0 ? (
          <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
            <HomeIcon className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
            <p className="font-medium text-charcoal-700">Your next place hasn&apos;t appeared yet.</p>
            <p className="max-w-md text-sm text-charcoal-500">
              No properties are listed yet. Are you a property owner? Listing is free and takes a
              few minutes.
            </p>
            <Link href="/register?intent=owner" className={cn(buttonVariants({ variant: "primary" }))}>
              List Your Property — Free
            </Link>
          </Card>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recentProperties.map((property, i) => (
              <Reveal key={property.id} delayMs={(i % 4) * 75}>
                <PropertyCard property={property} isVerified={verifiedFlags[i]} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-charcoal-700">How it works</h2>
        </Reveal>
        <ProcessSteps steps={howItWorks} />
      </section>
    </div>
  );
}
