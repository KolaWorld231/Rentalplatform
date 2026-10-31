import { Eye, Heart, Home, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/utils/format";
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
    .select("listing_status, view_count, favourite_count")
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

  const stats = [
    { label: "Total properties", value: total, icon: Home },
    { label: "Published", value: published, icon: Home },
    { label: "Draft", value: drafts, icon: Home },
    { label: "Total views", value: totalViews, icon: Eye },
    { label: "Total favourites", value: totalFavourites, icon: Heart },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <p className="mt-2 font-display text-2xl font-semibold text-charcoal-700">{s.value}</p>
            <p className="text-xs text-charcoal-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
            <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Recent inquiries
          </p>
          {inquiries && inquiries.length > 0 && (
            <Link href="/messages" className="text-xs font-medium text-brand-700">
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
                    className="focus-ring flex items-center justify-between gap-3 py-3 hover:bg-sage-100"
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${unread ? "font-semibold text-charcoal-700" : "font-medium text-charcoal-600"}`}>
                        {c.renter_profile?.display_name ?? "Renter"}
                      </p>
                      <p className="truncate text-xs text-charcoal-400">{c.properties?.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {unread && <span className="h-2 w-2 rounded-full bg-clay-500" aria-label="Unread" />}
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
        <Link href="/dashboard/properties" className="text-sm font-medium text-brand-700">
          Manage your properties →
        </Link>
      </div>
    </div>
  );
}
