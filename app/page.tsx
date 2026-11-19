import { CloudOff, Home as HomeIcon } from "lucide-react";
import Link from "next/link";
import { CategoryNav } from "@/components/properties/CategoryNav";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyCarousel } from "@/components/properties/PropertyCarousel";
import { SegmentedSearch } from "@/components/properties/SegmentedSearch";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { buildCollections, verifiedFlagsFor, type PropertyWithCover } from "@/services/properties";

/*
  The homepage used to open with a full-screen headline: a visitor saw a
  tagline, a search bar and nothing to rent until they scrolled. Someone
  arriving here is looking for somewhere to live, so the page now leads
  with the search and puts real listings in the first viewport, and the
  positioning line lives in the header and the footer where it belongs.
*/
export default async function HomePage() {
  const supabase = await createClient();
  const [{ data, error: recentError }, { data: coverageRows }] = await Promise.all([
    supabase
      .from("properties")
      .select("*, property_images(id, storage_path, is_cover)")
      .eq("listing_status", "published")
      .order("published_at", { ascending: false })
      .limit(48),
    supabase.from("properties").select("county, city, community, category").eq("listing_status", "published"),
  ]);

  const properties = (data ?? []) as unknown as PropertyWithCover[];
  const verifiedFlags = await verifiedFlagsFor(supabase, properties);
  const verifiedById = new Map(properties.map((p, i) => [p.id, verifiedFlags[i]]));

  const counties = [...new Set((coverageRows ?? []).map((r) => r.county))].sort();
  // Suggestions come from where listings actually are, so the panel never
  // offers a place with nothing in it.
  const communities = [
    ...new Set(
      (coverageRows ?? [])
        .flatMap((r) => [r.community, r.city])
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    ),
  ].sort();

  const categoryCounts = Object.entries(
    (coverageRows ?? []).reduce<Record<string, number>>((acc, r) => {
      if (r.category) acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const recent = properties.slice(0, 12);
  const collections = buildCollections(properties, recent.map((p) => p.id));

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* The width cap moves onto the bar itself rather than a wrapper:
          the sticky band needs to span the page so its blurred backing
          covers the listings scrolling under it, instead of leaving them
          visible in a strip either side. */}
      <SegmentedSearch
        counties={counties}
        communities={communities}
        sticky
        className="mx-auto max-w-4xl"
      />

      <div className="mt-6">
        <CategoryNav categories={categoryCounts} />
      </div>

      <div className="mt-8">
        {recentError ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
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
        ) : properties.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
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
          <>
            <PropertyCarousel title="Recently listed" viewAllHref="/search" itemCount={recent.length}>
              {recent.map((property) => (
                <CarouselItem key={property.id}>
                  <PropertyCard property={property} isVerified={verifiedById.get(property.id)} />
                </CarouselItem>
              ))}
            </PropertyCarousel>

            {collections.map((collection) => (
              <PropertyCarousel
                key={collection.key}
                title={collection.title}
                subtitle={collection.subtitle}
                viewAllHref={collection.viewAllHref}
                itemCount={collection.properties.length}
              >
                {collection.properties.map((property) => (
                  <CarouselItem key={property.id}>
                    <PropertyCard property={property} isVerified={verifiedById.get(property.id)} />
                  </CarouselItem>
                ))}
              </PropertyCarousel>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Card width is fixed per breakpoint rather than a fraction of the row,
 * so cards stay a consistent size whether a collection holds three or
 * thirty -- a row of four stretched cards and a row of twelve narrow
 * ones would read as two different components.
 */
function CarouselItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[70vw] shrink-0 snap-start sm:w-[clamp(15rem,24vw,19rem)]">{children}</div>
  );
}
