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
    <form className="mt-3 flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-charcoal-500">
        Reason (shown to the owner for reject/suspend; optional for approve)
        <textarea
          name="reason"
          rows={2}
          className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)]"
          placeholder="e.g. Photos don't match the description"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary" formAction={moderatePropertyAction.bind(null, propertyId, approveStatus)}>
          Approve
        </Button>
        <Button type="submit" size="sm" variant="secondary" formAction={moderatePropertyAction.bind(null, propertyId, "rejected")}>
          Reject
        </Button>
        <Button type="submit" size="sm" variant="danger" formAction={moderatePropertyAction.bind(null, propertyId, "suspended")}>
          Suspend
        </Button>
      </div>
    </form>
  );
}
