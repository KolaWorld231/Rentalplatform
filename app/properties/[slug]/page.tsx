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
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  formatCategory,
  formatRelativeDate,
  formatRentalFrequency,
  formatUsd,
  isRecentlyPublished,
} from "@/lib/utils/format";
import { getSimilarProperties, recordPropertyView, type PropertyWithImages } from "@/services/properties";

const NEW_LISTING_WINDOW_MS = 72 * 60 * 60 * 1000;

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const user = await getCurrentUser();
  const supabase = await createClient();

  if (property.listing_status === "published") {
    await recordPropertyView(supabase, property.id, { userId: user?.id, fingerprint: user ? undefined : "anon" });
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

  const similar = await getSimilarProperties(supabase, property);
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
            <div>
              <h1 className="font-display text-2xl font-semibold text-charcoal-700">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-charcoal-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {[property.community, property.city, property.county].filter(Boolean).join(", ")}
              </p>
            </div>
            <FavouriteButton propertyId={property.id} initialFavourited={isFavourited} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="brand">{formatCategory(property.category)}</Badge>
            {property.bedrooms !== null && <Badge>{property.bedrooms} bed</Badge>}
            {property.bathrooms !== null && <Badge>{property.bathrooms} bath</Badge>}
            {property.furnished !== null && <Badge>{property.furnished ? "Furnished" : "Unfurnished"}</Badge>}
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
                  <Ruler className="h-4 w-4 text-brand-600" aria-hidden="true" /> {property.floor_area_sqm} m²
                </div>
              )}
              {property.bedrooms !== null && (
                <div className="flex items-center gap-2 text-charcoal-600">
                  <BedDouble className="h-4 w-4 text-brand-600" aria-hidden="true" /> {property.bedrooms} bedrooms
                </div>
              )}
              {property.bathrooms !== null && (
                <div className="flex items-center gap-2 text-charcoal-600">
                  <Bath className="h-4 w-4 text-brand-600" aria-hidden="true" /> {property.bathrooms} bathrooms
                </div>
              )}
              {AMENITIES.filter((a) => property[a.key] === true).map((a) => (
                <div key={String(a.key)} className="flex items-center gap-2 text-charcoal-600">
                  <a.icon className="h-4 w-4 text-brand-600" aria-hidden="true" /> {a.label}
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6">
            <ReportListingButton propertyId={property.id} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="p-5 shadow-[var(--shadow-clay-raised)]">
            {(identityVerified || propertyVerified || isRecentlyPublished(property.published_at, NEW_LISTING_WINDOW_MS)) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {identityVerified && <VerificationBadge kind="identity" />}
                {propertyVerified && <VerificationBadge kind="property" />}
                {isRecentlyPublished(property.published_at, NEW_LISTING_WINDOW_MS) && (
                  <Badge variant="clay" className="gap-1">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    New
                  </Badge>
                )}
              </div>
            )}

            <p className="font-display text-3xl font-semibold text-brand-800">
              {formatUsd(property.rent_amount)}{" "}
              <span className="text-base font-normal text-charcoal-400">
                {formatRentalFrequency(property.rental_frequency)}
              </span>
            </p>
            {property.last_availability_confirmed_at && (
              <p className="mt-1 text-xs font-medium text-success-500">
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
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium text-charcoal-700">
                    <dt>Total upfront</dt>
                    <dd>{formatUsd(totalUpfront)}</dd>
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

            <div className="mt-4 border-t border-border pt-4 text-sm text-charcoal-500">
              <p>Listed by {ownerName}</p>
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
          <h2 className="font-display text-xl font-semibold text-charcoal-700">Similar properties</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-xs text-charcoal-400">
        A listing does not by itself prove ownership. Verify the property and the person offering
        it, inspect before committing, and get written terms. Read our{" "}
        <Link href="/safety" className="font-medium text-brand-700">
          safety guidance
        </Link>
        .
      </p>
    </div>
  );
}
