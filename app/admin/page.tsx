import { AlertTriangle, CreditCard, Home, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { formatUsd } from "@/lib/utils/format";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const { roles } = await requireAnyRole(["admin", "moderator"], "/admin");
  const isAdmin = roles.includes("admin");
  // Aggregates read real rows via service_role (RLS would otherwise
  // require per-row checks that don't make sense for a dashboard COUNT).
  const admin = createServiceRoleClient();

  const [
    { count: userCount },
    { count: ownerCount },
    { count: publishedCount },
    { count: pendingReviewCount },
    { count: openPropertyReports },
    { count: openMessageReports },
    { count: pendingIdentityVerifications },
    { count: pendingPropertyVerifications },
    { count: activeSubscriptions },
    { count: failedPayments },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "owner"),
    admin.from("properties").select("id", { count: "exact", head: true }).eq("listing_status", "published"),
    admin.from("properties").select("id", { count: "exact", head: true }).eq("listing_status", "pending_review"),
    admin.from("property_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("identity_verification_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    admin.from("property_verification_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  let revenue = 0;
  if (isAdmin) {
    const { data: confirmedPayments } = await admin.from("payment_transactions").select("amount").eq("status", "confirmed");
    revenue = (confirmedPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const stats = [
    { label: "Registered users", value: userCount ?? 0, icon: Users },
    { label: "Active owners", value: ownerCount ?? 0, icon: Users },
    { label: "Published listings", value: publishedCount ?? 0, icon: Home },
    { label: "Pending review", value: pendingReviewCount ?? 0, icon: Home },
    { label: "Open property reports", value: openPropertyReports ?? 0, icon: AlertTriangle },
    { label: "Open message reports", value: openMessageReports ?? 0, icon: AlertTriangle },
    { label: "Pending identity verifications", value: pendingIdentityVerifications ?? 0, icon: ShieldCheck },
    { label: "Pending property verifications", value: pendingPropertyVerifications ?? 0, icon: ShieldCheck },
    { label: "Active subscriptions", value: activeSubscriptions ?? 0, icon: CreditCard },
    { label: "Failed payments", value: failedPayments ?? 0, icon: CreditCard },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Admin overview</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        Every figure below is a live count from the database — nothing here is simulated.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <p className="mt-2 font-display text-2xl font-semibold text-charcoal-700">{s.value}</p>
            <p className="text-xs text-charcoal-400">{s.label}</p>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card className="mt-6 p-6">
          <p className="text-sm font-medium text-charcoal-700">Total confirmed subscription revenue</p>
          <p className="mt-1 font-display text-3xl font-semibold text-brand-800">{formatUsd(revenue)}</p>
          <p className="mt-1 text-xs text-charcoal-400">Sum of all `confirmed` payment_transactions.</p>
        </Card>
      )}
    </div>
  );
}
