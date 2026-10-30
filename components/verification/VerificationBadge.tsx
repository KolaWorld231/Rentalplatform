import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { verificationBadges } from "@/lib/config/brand";

/**
 * Only ever rendered when the caller has independently confirmed
 * `status === 'verified'` via is_identity_verified()/is_property_verified()
 * — never derived from anything client-supplied. Precise labels per the
 * brief: identity verification is not proof of legal ownership.
 */
export function VerificationBadge({ kind }: { kind: "identity" | "property" }) {
  return (
    <Badge variant="info" className="gap-1.5">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {verificationBadges[kind]}
    </Badge>
  );
}
