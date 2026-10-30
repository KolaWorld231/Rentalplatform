import { Home as HomeIcon, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { brand, subscriptionPlan } from "@/lib/config/brand";
import { createClient } from "@/lib/supabase/server";
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
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover)")
    .eq("listing_status", "published")
    .order("published_at", { ascending: false })
    .limit(8);
  const recentProperties = (data ?? []) as unknown as PropertyWithCover[];

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-800 px-4 py-16 text-ivory-50 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              {brand.heroHeading}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-sage-100">{brand.heroSupportingCopy}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className={cn(buttonVariants({ variant: "clay", size: "lg" }))}>
                {brand.primaryCta}
              </Link>
              <Link
                href="/register?intent=owner"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/20",
                )}
              >
                {brand.secondaryCta}
              </Link>
            </div>
          </div>
          <Card className="rounded-[var(--radius-2xl)] bg-ivory-50 p-6 text-charcoal-700">
            <p className="text-sm font-medium text-charcoal-400">No payment per property inquiry</p>
            <p className="mt-2 font-display text-3xl font-semibold text-brand-800">
              ${subscriptionPlan.priceUsd} / {subscriptionPlan.durationDays} days
            </p>
            <p className="mt-2 text-sm text-charcoal-500">
              One {subscriptionPlan.name.toLowerCase()} lets you contact every owner you want —
              listing and browsing stay free.
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">How it works</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {howItWorks.map((step) => (
            <Card key={step.title} className="p-6">
              <step.icon className="h-8 w-8 text-brand-600" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-charcoal-700">{step.title}</h3>
              <p className="mt-2 text-sm text-charcoal-500">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-charcoal-700">
            Recently listed
          </h2>
          <Link href="/search" className="text-sm font-medium text-brand-700">
            View all
          </Link>
        </div>
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
            {recentProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
