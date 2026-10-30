import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Property } from "@/types/database";
import { moderatePropertyAction } from "../actions";

export const metadata = { title: "Admin: Listings" };

export default async function AdminListingsPage() {
  const admin = createServiceRoleClient();

  const [{ data: pending }, { data: reported }] = await Promise.all([
    admin
      .from("properties")
      .select("*")
      .eq("listing_status", "pending_review")
      .order("created_at", { ascending: true }) as unknown as Promise<{ data: Property[] | null }>,
    admin
      .from("property_reports")
      .select("*, properties(*)")
      .eq("status", "open")
      .order("created_at", { ascending: true }) as unknown as Promise<{
      data: ({ id: string; reason: string; details: string | null; properties: Property | null })[] | null;
    }>,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Pending review</h1>
        <div className="mt-4 flex flex-col gap-3">
          {(pending ?? []).length === 0 && <p className="text-sm text-charcoal-400">Nothing pending review.</p>}
          {(pending ?? []).map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{p.title}</p>
                  <p className="text-xs text-charcoal-400">
                    {p.city}, {p.county} · {formatRentAmount(p.rent_amount)}
                  </p>
                </div>
                <Badge variant="neutral">{p.listing_status}</Badge>
              </div>
              <ModerationActions propertyId={p.id} approveStatus="published" />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">Reported listings</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(reported ?? []).length === 0 && <p className="text-sm text-charcoal-400">No open reports.</p>}
          {(reported ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{r.properties?.title ?? "Unknown listing"}</p>
                  <p className="text-xs text-charcoal-400">
                    Reason: {r.reason.replace(/_/g, " ")} {r.details && `— ${r.details}`}
                  </p>
                </div>
              </div>
              {r.properties && <ModerationActions propertyId={r.properties.id} approveStatus="published" />}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatRentAmount(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function ModerationActions({ propertyId, approveStatus }: { propertyId: string; approveStatus: "published" }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={async () => { "use server"; await moderatePropertyAction(propertyId, approveStatus, ""); }}>
        <Button type="submit" size="sm" variant="primary">
          Approve
        </Button>
      </form>
      <form
        action={async () => {
          "use server";
          await moderatePropertyAction(propertyId, "rejected", "Does not meet listing guidelines");
        }}
      >
        <Button type="submit" size="sm" variant="secondary">
          Reject
        </Button>
      </form>
      <form
        action={async () => {
          "use server";
          await moderatePropertyAction(propertyId, "suspended", "Suspended pending review");
        }}
      >
        <Button type="submit" size="sm" variant="danger">
          Suspend
        </Button>
      </form>
    </div>
  );
}
