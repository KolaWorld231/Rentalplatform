import { BedDouble, Bath, Car, Droplets, MapPin, Ruler, ShieldCheck, Snowflake, Sparkles, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactOwnerForm, ContactOwnerGuestPrompt } from "@/components/properties/ContactOwnerForm";
import { FavouriteButton } from "@/components/properties/FavouriteButton";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { ReportListingButton } from "@/components/properties/ReportListingButton";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  formatCategory,
  formatRelativeDate,
  formatRentalFrequency,
  formatUsd,
  isRecentlyPublished,
} from "@/lib/utils/format";
import { hasActiveSearchFilters, searchParamsSchema } from "@/lib/validation/property";
import { getSimilarProperties, recordPropertyView, searchProperties, type PropertyWithImages } from "@/services/properties";

const NEW_LISTING_WINDOW_MS = 72 * 60 * 60 * 1000;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type PropertyDetail = PropertyWithImages & { profiles: { display_name: string } | null };

async function getProperty(slug: string): Promise<PropertyDetail | null> {
  const supabase = await createClient();
  const { data } = (await supabase
    .from("properties")
    .select("*, property_images(id, storage_path, is_cover, position), profiles:owner_id(display_name)")
    .eq("slug", slug)
    .maybeSingle()) as { data: PropertyDetail | null };
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: "Property not found" };
  return {
    title: property.title,
    description: property.description?.slice(0, 160),
  };
}

const AMENITIES: { key: keyof NonNullable<Awaited<ReturnType<typeof getProperty>>>; label: string; icon: typeof Zap }[] = [
  { key: "has_electricity", label: "Electricity", icon: Zap },
  { key: "has_water", label: "Water supply", icon: Droplets },
  { key: "has_air_conditioning", label: "Air conditioning", icon: Snowflake },
  { key: "has_parking", label: "Parking", icon: Car },
  { key: "has_security", label: "Security", icon: ShieldCheck },
];

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const user = await getCurrentUser();
  const supabase = await createClient();

  if (property.listing_status === "published") {
    // Analytics must not sit in front of the page. This was awaited inline,
    // so every visitor paid a write round-trip before any HTML was sent.
    // `after` runs it once the response is done.
    after(() =>
      recordPropertyView(supabase, property.id, { userId: user?.id, fingerprint: user ? undefined : "anon" }),
    );
  }

  let isFavourited = false;
  if (user) {
    const { data } = await supabase
      .from("property_favourites")
      .select("property_id")
      .eq("user_id", user.id)
      .eq("property_id", property.id)
      .maybeSingle();
    isFavourited = !!data;
  }

  const rawSearchParams = await searchParams;
  const flatSearchParams = Object.fromEntries(
    Object.entries(rawSearchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const parsedSearch = searchParamsSchema.safeParse(flatSearchParams);
  const fromSearch = parsedSearch.success && hasActiveSearchFilters(parsedSearch.data);

  const similarTitle = fromSearch ? "More from your search" : "Similar properties";
  const similar = fromSearch
    ? (await searchProperties(supabase, { ...parsedSearch.data, page: 1 })).properties
        .filter((p) => p.id !== property.id)
        .slice(0, 4)
    : await getSimilarProperties(supabase, property);
  const images = [...property.property_images].sort((a, b) => a.position - b.position);

  const upfrontItems = [
    { label: "Advance rent", value: property.advance_rent_amount },
    { label: "Security deposit", value: property.security_deposit_amount },
    { label: "Other fees", value: property.other_fees_amount },
  ].filter((i) => i.value !== null);
  const totalUpfront = upfrontItems.reduce((sum, i) => sum + (i.value ?? 0), 0) + property.rent_amount;

  const ownerName = property.profiles?.display_name ?? "Property owner";

  const [{ data: identityVerified }, { data: propertyVerified }] = await Promise.all([
    supabase.rpc("is_identity_verified", { target_user: property.owner_id }),
    supabase.rpc("is_property_verified", { target_property: property.id }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <PropertyGallery images={images} title={property.title} />

          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/*
                The title was text-2xl -- smaller than the price beside it,
                and barely above the section headings below. It is what the
                page is about, so it takes the display scale.
              */}
              <h1 className="text-balance font-display text-display-sm font-semibold text-charcoal-700">
                {property.title}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-500">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {[property.community, property.city, property.county].filter(Boolean).join(", ")}
              </p>
            </div>
            <FavouriteButton propertyId={property.id} initialFavourited={isFavourited} />
          </div>

          {/*
            Bedrooms and bathrooms used to appear here as badges AND again
            under "Details & amenities" a few lines down -- the same two
            facts stated twice on one screen. They now live only in the
            details list, which has the icons and the full labels, leaving
            this row for the attributes that appear nowhere else.
          */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="brand">{formatCategory(property.category)}</Badge>
            {property.furnished !== null && <Badge>{property.furnished ? "Furnished" : "Unfurnished"}</Badge>}
            {isRecentlyPublished(property.published_at, NEW_LISTING_WINDOW_MS) && (
              <Badge variant="clay" className="gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                New
              </Badge>
            )}
          </div>

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-charcoal-700">About this property</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal-600">
              {property.description || "No description provided yet."}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-charcoal-700">Details & amenities</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {property.floor_area_sqm !== null && (
                <div className="flex items-center gap-2 text-charcoal-600">
                  <Ruler className="h-4 w-4 text-accent-text" aria-hidden="true" /> {property.floor_area_sqm} m²
                </div>
              )}
              {property.bedrooms !== null && (
                <div className="flex items-center gap-2 text-charcoal-600">
                  <BedDouble className="h-4 w-4 text-accent-text" aria-hidden="true" /> {property.bedrooms} bedrooms
                </div>
              )}
              {property.bathrooms !== null && (
                <div className="flex items-center gap-2 text-charcoal-600">
                  <Bath className="h-4 w-4 text-accent-text" aria-hidden="true" /> {property.bathrooms} bathrooms
                </div>
              )}
              {AMENITIES.filter((a) => property[a.key] === true).map((a) => (
                <div key={String(a.key)} className="flex items-center gap-2 text-charcoal-600">
                  <a.icon className="h-4 w-4 text-accent-text" aria-hidden="true" /> {a.label}
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6">
            <ReportListingButton propertyId={property.id} />
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5 shadow-[var(--shadow-clay-raised)]">
            <p className="font-display text-display-sm font-semibold text-accent-text">
              {formatUsd(property.rent_amount)}{" "}
              <span className="text-base font-normal text-charcoal-400">
                {formatRentalFrequency(property.rental_frequency)}
              </span>
            </p>
            {property.last_availability_confirmed_at && (
              <p className="mt-1 text-xs font-medium text-success">
                Availability reconfirmed {formatRelativeDate(property.last_availability_confirmed_at)}
              </p>
            )}

            {upfrontItems.length > 0 && (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <p className="font-medium text-charcoal-700">Disclosed move-in costs</p>
                <dl className="mt-2 flex flex-col gap-1">
                  <div className="flex justify-between text-charcoal-500">
                    <dt>First {formatRentalFrequency(property.rental_frequency).replace("/ ", "")} rent</dt>
                    <dd>{formatUsd(property.rent_amount)}</dd>
                  </div>
                  {upfrontItems.map((i) => (
                    <div key={i.label} className="flex justify-between text-charcoal-500">
                      <dt>{i.label}</dt>
                      <dd>{formatUsd(i.value ?? 0)}</dd>
                    </div>
                  ))}
                  {/*
                    The total is the number that decides whether someone
                    can afford this at all, and it read at the same weight
                    as the line items that make it up.
                  */}
                  <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2 font-semibold text-charcoal-700">
                    <dt>Total upfront</dt>
                    <dd className="text-base">{formatUsd(totalUpfront)}</dd>
                  </div>
                </dl>
                {property.other_fees_description && (
                  <p className="mt-2 text-xs text-charcoal-400">{property.other_fees_description}</p>
                )}
              </div>
            )}
            {upfrontItems.length === 0 && (
              <p className="mt-3 text-xs text-charcoal-400">
                The owner hasn&apos;t disclosed advance rent, deposit, or other fees yet.
              </p>
            )}

            {/*
              The owner was a grey line of 14px text at the foot of the
              card. They are the person the renter is about to message,
              and verification is a claim about THEM -- it was floating
              above the price, competing with it, where it read as
              decoration rather than as something attached to a party.
              Both now sit together, directly above the contact form.
            */}
            <div className="mt-4 flex items-start gap-3 border-t border-border pt-4">
              <Avatar name={ownerName} />
              <div className="min-w-0">
                <p className="text-xs text-charcoal-400">Listed by</p>
                <p className="truncate text-sm font-medium text-charcoal-700">{ownerName}</p>
                {(identityVerified || propertyVerified) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {identityVerified && <VerificationBadge kind="identity" />}
                    {propertyVerified && <VerificationBadge kind="property" />}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {user ? (
            <ContactOwnerForm
              propertyId={property.id}
              isOwnListing={property.owner_id === user.id}
              propertyTitle={property.title}
              ownerName={ownerName}
            />
          ) : (
            <ContactOwnerGuestPrompt />
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-charcoal-700">{similarTitle}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      {/*
        This was 12px of the lowest-contrast grey on the page -- the
        smallest text on a screen whose entire subject is avoiding being
        defrauded over a rental. In a market where the product exists
        because renters get exploited, it is not a footnote.
      */}
      <Card className="mt-12 flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-charcoal-700">Before you commit</p>
          <p className="mt-1 text-sm text-charcoal-500">
            A listing does not by itself prove ownership. Verify the property and the person
            offering it, inspect before committing, and get written terms. Read our{" "}
            <Link href="/safety" className="font-medium text-accent-text underline underline-offset-2">
              safety guidance
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
