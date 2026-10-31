import { Home as HomeIcon, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ProcessSteps } from "@/components/marketing/ProcessSteps";
import { HeroSearch } from "@/components/properties/HeroSearch";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils/cn";
import type { PropertyWithCover } from "@/services/properties";

const howItWorks = [
  {
    icon: HomeIcon,
    title: "Browse for free",
    body: "Search apartments, houses, rooms, and commercial spaces across Liberia at no cost.",
  },
  {
    icon: MessageCircle,
    title: "Unlock direct messaging",
    body: `Get the ${subscriptionPlan.name} for $${subscriptionPlan.priceUsd} and message as many owners as you like for ${subscriptionPlan.durationDays} days.`,
  },
  {
    icon: ShieldCheck,
    title: "Know before you commit",
    body: "See disclosed rent, deposits, and move-in costs up front, plus owner verification status.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data }, { data: coverageRows }, { count: publishedCount }] = await Promise.all([
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

  const verifiedFlags = await Promise.all(
    recentProperties.map(async (property) => {
      const [{ data: ownerVerified }, { data: propertyVerified }] = await Promise.all([
        supabase.rpc("is_identity_verified", { target_user: property.owner_id }),
        supabase.rpc("is_property_verified", { target_property: property.id }),
      ]);
      return Boolean(ownerVerified || propertyVerified);
    }),
  );

  // Real, database-derived stats only — never fabricated (CLAUDE.md rule #9).
  // A stat with nothing behind it yet is hidden rather than shown as zero.
  const countiesCovered = new Set((coverageRows ?? []).map((r) => r.county)).size;
  const ownersListing = new Set((coverageRows ?? []).map((r) => r.owner_id)).size;
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
      <section className="relative overflow-hidden bg-brand-800 px-4 py-16 text-ivory-50 sm:px-6 lg:px-8 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {heroPhotos.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={propertyImageUrl(img.storage_path)}
              alt=""
              className={cn(
                "absolute hidden object-cover opacity-20 blur-md saturate-50 lg:block",
                i === 0 && "right-[-4rem] top-[-2rem] h-72 w-96 rotate-6 rounded-[var(--radius-2xl)]",
                i === 1 && "right-24 top-56 h-56 w-72 -rotate-3 rounded-[var(--radius-2xl)]",
                i === 2 && "right-[28rem] top-8 h-48 w-64 rotate-2 rounded-[var(--radius-2xl)]",
              )}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            {brand.heroHeading}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-sage-100">{brand.heroSupportingCopy}</p>

          <div className="mx-auto mt-8 max-w-2xl">
            <HeroSearch />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register?intent=owner"
              className={cn(
                buttonVariants({ variant: "secondary", size: "md" }),
                "bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/20",
              )}
            >
              {brand.secondaryCta}
            </Link>
            <p className="text-sm text-sage-200">
              Renters pay just ${subscriptionPlan.priceUsd} for {subscriptionPlan.durationDays} days of
              unlimited direct messaging.
            </p>
          </div>

          {stats.length > 0 && (
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-ivory-50/15 pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl font-semibold">{stat.value.toLocaleString()}+</p>
                  <p className="text-xs text-sage-200">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-charcoal-700">How it works</h2>
        </Reveal>
        <ProcessSteps steps={howItWorks} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-charcoal-700">
              Recently listed
            </h2>
            <Link href="/search" className="text-sm font-medium text-brand-700">
              View all
            </Link>
          </div>
        </Reveal>
        {recentProperties.length === 0 ? (
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
    </div>
  );
}
