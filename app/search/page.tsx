import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { ActiveFilterChips } from "@/components/properties/ActiveFilterChips";
import { SegmentedSearch } from "@/components/properties/SegmentedSearch";
import { CategoryNav } from "@/components/properties/CategoryNav";
import { SortSelect } from "@/components/properties/SortSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PropertyCardSkeleton } from "@/components/ui/Skeleton";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchFilterQueryString, searchParamsSchema } from "@/lib/validation/property";
import { searchProperties, verifiedFlagsFor } from "@/services/properties";

export const metadata = { title: "Search Properties" };

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const parsed = searchParamsSchema.safeParse(flatParams);
  const params = parsed.success ? parsed.data : searchParamsSchema.parse({});
  const searchQueryString = searchFilterQueryString(params);

  const supabase = await createClient();
  const [{ properties, total, page, pageSize }, user, { data: coverageRows }] = await Promise.all([
    searchProperties(supabase, params),
    getCurrentUser(),
    supabase.from("properties").select("county, city, community, category").eq("listing_status", "published"),
  ]);

  const counties = [...new Set((coverageRows ?? []).map((r) => r.county))].sort();
  const categoryCounts = Object.entries(
    (coverageRows ?? []).reduce<Record<string, number>>((acc, r) => {
      if (r.category) acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const communities = [
    ...new Set(
      (coverageRows ?? [])
        .flatMap((r) => [r.community, r.city])
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    ),
  ].sort();

  // Naming the place in the heading matters most when the result set is
  // empty: "No properties in Sinkor under $200" is a filter problem the
  // renter can act on, where a bare "no results" reads as "nothing exists".
  const placeLabel = params.city || (params.county ? `${params.county} County` : null);

  let favouritedIds = new Set<string>();
  if (user) {
    const { data } = await supabase.from("property_favourites").select("property_id").eq("user_id", user.id);
    favouritedIds = new Set((data ?? []).map((r) => r.property_id));
  }

  const verifiedFlags = await verifiedFlagsFor(supabase, properties);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <SegmentedSearch counties={counties} communities={communities} />
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-semibold text-charcoal-700">
            {total === 0
              ? "No properties match"
              : `${total} ${total === 1 ? "property" : "properties"}`}
            {placeLabel && <span className="text-charcoal-500"> in {placeLabel}</span>}
          </h1>
          {total > 0 && <SortSelect />}
        </div>
        <ActiveFilterChips params={params} />
      </div>

      <div className="mb-6">
        <CategoryNav categories={categoryCounts} active={params.category} />
      </div>

      {/*
        The sidebar was a third copy of the same filters -- the segmented
        search sets them, the chips show and remove them, and the sidebar
        repeated all of it again while squeezing the results into 60% of
        the width. On a 1280px screen that meant one card in a large empty
        area. The grid now takes the full width.
      */}
      <div>
        <div>
          {properties.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-12 text-center">
              <Home className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
              <p className="font-medium text-charcoal-700">Your next place hasn&apos;t appeared yet.</p>
              <p className="max-w-md text-sm text-charcoal-500">
                No properties matched your search. Try widening your price range, choosing a
                neighbouring city, or clearing some filters.
              </p>
              <Link href="/search">
                <Button variant="secondary">Clear filters</Button>
              </Link>
            </Card>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {properties.map((property, i) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isFavourited={favouritedIds.has(property.id)}
                    isVerified={verifiedFlags[i]}
                    searchQuery={searchQueryString}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
                  {(() => {
                    const prevParams = new URLSearchParams(flatParams as Record<string, string>);
                    prevParams.set("page", String(page - 1));
                    const nextParams = new URLSearchParams(flatParams as Record<string, string>);
                    nextParams.set("page", String(page + 1));
                    const prevDisabled = page <= 1;
                    const nextDisabled = page >= totalPages;

                    return (
                      <>
                        {prevDisabled ? (
                          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-charcoal-400 opacity-40">
                            <ChevronLeft className="h-4 w-4" />
                          </span>
                        ) : (
                          <Link
                            href={`/search?${prevParams.toString()}`}
                            aria-label="Previous page"
                            className="focus-ring flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface text-charcoal-600 shadow-[var(--shadow-subtle)] hover:text-accent-text"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Link>
                        )}

                        <p className="text-sm font-medium text-charcoal-600">
                          Page {page} of {totalPages}
                        </p>

                        {nextDisabled ? (
                          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-charcoal-400 opacity-40">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        ) : (
                          <Link
                            href={`/search?${nextParams.toString()}`}
                            aria-label="Next page"
                            className="focus-ring flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface text-charcoal-600 shadow-[var(--shadow-subtle)] hover:text-accent-text"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </>
                    );
                  })()}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
