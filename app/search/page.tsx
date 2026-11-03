import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { SearchBar } from "@/components/properties/SearchBar";
import { SearchFilters } from "@/components/properties/SearchFilters";
import { SortSelect } from "@/components/properties/SortSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PropertyCardSkeleton } from "@/components/ui/Skeleton";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchFilterQueryString, searchParamsSchema } from "@/lib/validation/property";
import { searchProperties } from "@/services/properties";

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
  const [{ properties, total, page, pageSize }, user] = await Promise.all([
    searchProperties(supabase, params),
    getCurrentUser(),
  ]);

  let favouritedIds = new Set<string>();
  if (user) {
    const { data } = await supabase.from("property_favourites").select("property_id").eq("user_id", user.id);
    favouritedIds = new Set((data ?? []).map((r) => r.property_id));
  }

  const verifiedFlags = await Promise.all(
    properties.map(async (property) => {
      const [{ data: ownerVerified }, { data: propertyVerified }] = await Promise.all([
        supabase.rpc("is_identity_verified", { target_user: property.owner_id }),
        supabase.rpc("is_property_verified", { target_property: property.id }),
      ]);
      return Boolean(ownerVerified || propertyVerified);
    }),
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <SearchBar />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchFilters resultCount={total} />
        </aside>

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
              <div className="mb-4 flex items-center justify-end">
                <SortSelect />
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                            className="focus-ring flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface text-charcoal-600 shadow-[var(--shadow-subtle)] hover:text-brand-700"
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
                            className="focus-ring flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface text-charcoal-600 shadow-[var(--shadow-subtle)] hover:text-brand-700"
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
