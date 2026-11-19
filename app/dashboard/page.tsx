import { AlertTriangle, Eye, Heart, Home, MessageCircle, ImagePlus, Plus } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate, isAvailabilityStale } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Conversation } from "@/types/database";

export const metadata = { title: "Owner Dashboard" };

type InquiryRow = Conversation & {
  properties: { title: string } | null;
  renter_profile: { display_name: string } | null;
};

export default async function DashboardOverviewPage() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("listing_status, view_count, favourite_count, last_availability_confirmed_at, property_images(id)")
    .eq("owner_id", user.id);

  const { data: inquiries } = (await supabase
    .from("conversations")
    .select("*, properties(title), renter_profile:renter_id(display_name)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5)) as { data: InquiryRow[] | null };

  const total = properties?.length ?? 0;
  const published = properties?.filter((p) => p.listing_status === "published").length ?? 0;
  const drafts = properties?.filter((p) => p.listing_status === "draft").length ?? 0;
  const totalViews = properties?.reduce((sum, p) => sum + p.view_count, 0) ?? 0;
  const totalFavourites = properties?.reduce((sum, p) => sum + p.favourite_count, 0) ?? 0;
  // Published but photo-less is the most consequential state an owner can
  // be in and the easiest to miss: the listing looks finished everywhere
  // except to the renters deciding whether to open it.
  const noPhotoCount =
    properties?.filter((p) => p.listing_status === "published" && (p.property_images?.length ?? 0) === 0).length ?? 0;

  const staleCount =
    properties?.filter((p) => p.listing_status === "published" && isAvailabilityStale(p.last_availability_confirmed_at))
      .length ?? 0;

  /*
    Was five tiles: Published, Total properties, Draft, Views,
    Favourites. The first three are the same small number said three
    ways -- an owner with one listing read "1 / 1 / 0" across a third of
    the page. Total is dropped, and Draft appears only when there is
    one, which is also when it is worth acting on.
  */
  const stats = [
    { label: "Published", value: published, icon: Home, lead: true },
    ...(drafts > 0 ? [{ label: "Draft", value: drafts, icon: Home, lead: false }] : []),
    { label: "Views", value: totalViews, icon: Eye, lead: false },
    { label: "Saves", value: totalFavourites, icon: Heart, lead: false },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Dashboard</h1>
        {total > 0 && (
          <Link
            href="/dashboard/properties/new"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            List a property
          </Link>
        )}
      </div>

      {/*
        An owner with no properties previously saw five zeroes and a line
        about inquiries that cannot exist yet -- and no way to list
        anything, since the only route to the create page was a quiet
        "Manage your properties" link at the foot of the page. For a
        platform whose constraint is inventory, that was the single most
        important action missing from its own dashboard.
      */}
      {total === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <Home className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">You haven&apos;t listed a property yet.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Listing is free and always will be. Start with the essentials — you can add photos and
            rental terms before publishing.
          </p>
          <Link
            href="/dashboard/properties/new"
            className={cn(buttonVariants({ variant: "primary" }), "mt-1")}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            List your first property
          </Link>
        </Card>
      ) : (
      <>
      {noPhotoCount > 0 && (
        <Card className="mt-6 flex items-center gap-3 border-l-4 border-brand-600 bg-accent-soft p-4">
          <ImagePlus className="h-5 w-5 shrink-0 text-accent-on-soft" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal-700">
              {noPhotoCount} published {noPhotoCount === 1 ? "listing has" : "listings have"} no photos
            </p>
            <p className="text-xs text-charcoal-500">
              Renters scan photos first. A listing without any is far less likely to be opened at all.
            </p>
          </div>
          <Link href="/dashboard/properties" className="shrink-0 text-sm font-medium text-accent-text">
            Add photos →
          </Link>
        </Card>
      )}

      {staleCount > 0 && (
        <Card className="mt-6 flex items-center gap-3 border-l-4 border-warning-500 bg-warning-soft p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal-700">
              {staleCount} {staleCount === 1 ? "listing needs" : "listings need"} availability reconfirmed
            </p>
            <p className="text-xs text-charcoal-500">
              Renters trust listings more when availability was recently confirmed.
            </p>
          </div>
          <Link href="/dashboard/properties" className="shrink-0 text-sm font-medium text-accent-text">
            Review →
          </Link>
        </Card>
      )}

      <Card className="mt-6 grid grid-cols-1 divide-y divide-border sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-4">
            {/* Both branches of this were the same string, so "lead" did
                nothing to the icon. Only the lead stat carries the accent
                now; the rest are supporting figures. */}
            <s.icon
              className={cn("h-5 w-5 shrink-0", s.lead ? "text-accent-text" : "text-charcoal-400")}
              aria-hidden="true"
            />
            <div>
              <p
                className={cn(
                  "font-display text-2xl font-semibold",
                  s.lead ? "text-accent-text" : "text-charcoal-700",
                )}
              >
                {s.value}
              </p>
              <p className="text-xs text-charcoal-400">{s.label}</p>
            </div>
          </div>
        ))}
      </Card>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
            <MessageCircle className="h-4 w-4 text-accent-text" aria-hidden="true" />
            Recent inquiries
          </p>
          {inquiries && inquiries.length > 0 && (
            <Link href="/messages" className="text-xs font-medium text-accent-text">
              View all
            </Link>
          )}
        </div>

        {!inquiries || inquiries.length === 0 ? (
          <p className="mt-1 text-sm text-charcoal-500">
            Renter inquiries about your properties will show up here — replying is always free.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {inquiries.map((c) => {
              const unread = !c.owner_last_read_at || new Date(c.owner_last_read_at) < new Date(c.updated_at);
              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="focus-ring flex items-center gap-3 py-3 hover:bg-surface-muted"
                  >
                    <Avatar name={c.renter_profile?.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${unread ? "font-semibold text-charcoal-700" : "font-medium text-charcoal-600"}`}>
                        {c.renter_profile?.display_name ?? "Renter"}
                      </p>
                      <p className="truncate text-xs text-charcoal-400">{c.properties?.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {unread && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Unread" />}
                      <span className="text-xs text-charcoal-400">{formatRelativeDate(c.updated_at)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="mt-6">
        <Link href="/dashboard/properties" className="text-sm font-medium text-accent-text">
          Manage your properties →
        </Link>
      </div>
      </>
      )}
    </div>
  );
}
