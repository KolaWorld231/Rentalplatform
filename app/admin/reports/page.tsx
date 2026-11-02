import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { MessageReport, PropertyReport } from "@/types/database";
import { resolveMessageReportAction, resolvePropertyReportAction } from "../actions";

export const metadata = { title: "Admin: Reports" };

type PropertyReportRow = PropertyReport & { properties: { title: string } | null };

export default async function AdminReportsPage() {
  const admin = createServiceRoleClient();

  const { data: propertyReports } = (await admin
    .from("property_reports")
    .select("*, properties(title)")
    .eq("status", "open")
    .order("created_at", { ascending: true })) as { data: PropertyReportRow[] | null };

  const { data: messageReports } = (await admin
    .from("message_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true })) as { data: MessageReport[] | null };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Property reports</h1>
        <div className="mt-4 flex flex-col gap-3">
          {(propertyReports ?? []).length === 0 && <p className="text-sm text-charcoal-400">No open reports.</p>}
          {(propertyReports ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal-700">
                    {r.properties?.title ?? "Unknown listing"}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {r.reason.replace(/_/g, " ")} {r.details && `— ${r.details}`}
                  </p>
                </div>
                <Badge variant="warning">open</Badge>
              </div>
              <form className="mt-3 flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-charcoal-500">
                  Resolution notes (internal — not shown to the reporter)
                  <textarea
                    name="reason"
                    rows={2}
                    className="focus-ring rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-charcoal-700 shadow-[var(--shadow-clay-inset)]"
                    placeholder="e.g. Listing removed; owner warned"
                  />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="primary" formAction={resolvePropertyReportAction.bind(null, r.id, "resolved")}>
                    Mark resolved
                  </Button>
                  <Button type="submit" size="sm" variant="secondary" formAction={resolvePropertyReportAction.bind(null, r.id, "dismissed")}>
                    Dismiss
                  </Button>
                </div>
              </form>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">Message reports</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(messageReports ?? []).length === 0 && <p className="text-sm text-charcoal-400">No open reports.</p>}
          {(messageReports ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-charcoal-500">
                  {r.reason.replace(/_/g, " ")} {r.details && `— ${r.details}`}
                </p>
                <Badge variant="warning">open</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <form action={async () => { "use server"; await resolveMessageReportAction(r.id, "resolved"); }}>
                  <Button type="submit" size="sm" variant="primary">
                    Mark resolved
                  </Button>
                </form>
                <form action={async () => { "use server"; await resolveMessageReportAction(r.id, "dismissed"); }}>
                  <Button type="submit" size="sm" variant="secondary">
                    Dismiss
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
