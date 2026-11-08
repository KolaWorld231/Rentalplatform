// Hand-ported from ../../../components/verification/VerificationBadge.tsx
// -- only ever rendered when the caller has independently confirmed
// `status === 'verified'` via is_identity_verified()/is_property_verified(),
// never derived from anything client-supplied.
import { Text, View } from "react-native";

const LABELS = {
  identity: "Identity Verified",
  property: "Property Documents Reviewed",
} as const;

export function VerificationBadge({ kind }: { kind: "identity" | "property" }) {
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-info-100 px-2.5 py-1">
      <Text className="text-xs font-sans-semibold text-info-500">{LABELS[kind]}</Text>
    </View>
  );
}
