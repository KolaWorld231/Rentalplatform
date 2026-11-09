import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { REPORT_REASON_LABELS } from "../../lib/validation/reports";
import type { ReportReason } from "../../lib/database.types";

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

/**
 * Shared inline report UI for both property listings and messages --
 * the caller supplies the actual submit call (reportProperty/
 * reportMessage from lib/reports/service.ts) so this component stays
 * ignorant of which table it's writing to.
 */
export function ReportForm({
  label,
  onSubmit,
}: {
  label: string;
  onSubmit: (reason: ReportReason, details: string) => Promise<{ ok: true } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">Thanks — we&apos;ll review this.</Text>;
  }

  if (!open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)}>
        <Text className="text-xs font-sans-semibold text-charcoal-500 underline dark:text-charcoal-400">{label}</Text>
      </Pressable>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(reason, details);
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
  }

  return (
    <View className="gap-2 rounded-md border border-border p-3 dark:border-charcoal-500">
      <Text className="text-sm font-sans-semibold text-charcoal-700 dark:text-ivory-100">{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {REASONS.map(([value, reasonLabel]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={reasonLabel}
            accessibilityState={{ selected: reason === value }}
            onPress={() => setReason(value)}
            className={
              reason === value
                ? "rounded-full border border-forest-600 bg-forest-100 px-2.5 py-1 dark:bg-forest-900/40"
                : "rounded-full border border-border px-2.5 py-1 dark:border-charcoal-500"
            }
          >
            <Text
              className={
                reason === value
                  ? "text-xs font-sans-semibold text-forest-700 dark:text-forest-500"
                  : "text-xs text-charcoal-700 dark:text-ivory-100"
              }
            >
              {reasonLabel}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        placeholder="Add any details (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
      />
      {error && <Text className="text-xs font-medium text-error-500">{error}</Text>}
      <View className="flex-row gap-2">
        <Button size="sm" variant="secondary" onPress={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" loading={submitting} onPress={handleSubmit}>
          Submit report
        </Button>
      </View>
    </View>
  );
}
