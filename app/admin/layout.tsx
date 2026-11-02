import { AdminNav } from "@/components/admin/AdminNav";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["admin", "moderator"], "/admin");

  // Real pending-item counts, reused from the same aggregates the
  // Overview page computes — never fabricated (CLAUDE.md rule #9).
  const admin = createServiceRoleClient();
  const [
    { count: pendingListings },
    { count: pendingIdentity },
    { count: pendingProperty },
    { count: openPropertyReports },
    { count: openMessageReports },
  ] = await Promise.all([
    admin.from("properties").select("id", { count: "exact", head: true }).eq("listing_status", "pending_review"),
    admin
      .from("identity_verification_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "under_review"]),
    admin
      .from("property_verification_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "under_review"]),
    admin.from("property_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/listings", label: "Listings", count: pendingListings ?? 0 },
    { href: "/admin/verifications", label: "Verifications", count: (pendingIdentity ?? 0) + (pendingProperty ?? 0) },
    { href: "/admin/reports", label: "Reports", count: (openPropertyReports ?? 0) + (openMessageReports ?? 0) },
    { href: "/admin/users", label: "Users" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminNav links={links} />
      {children}
    </div>
  );
}
