import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { scoutProgram } from "../../lib/brand";
import {
  listOpenScoutAreas,
  startScoutApplicationOtp,
  submitScoutApplication,
  verifyScoutApplicationOtp,
} from "../../lib/scouts/service";
import { scoutApplicationSchema, SCOUT_CODE_OF_CONDUCT_VERSION, type ScoutApplicationInput } from "../../lib/validation/scouts";

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "employer", label: "Employer" },
  { value: "community_leader", label: "Community leader" },
  { value: "other", label: "Other" },
] as const;

interface ReferenceDraft {
  fullName: string;
  relationship: "family" | "employer" | "community_leader" | "other";
  phone: string;
}

const emptyReference: ReferenceDraft = { fullName: "", relationship: "family", phone: "" };

function Checkbox({ checked, onPress, children }: { checked: boolean; onPress: () => void; children: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Button variant={checked ? "primary" : "secondary"} size="sm" onPress={onPress} className="h-6 w-6 rounded px-0">
        <Text className="text-xs text-ivory-50">{checked ? "✓" : ""}</Text>
      </Button>
      <Text className="flex-1 text-sm text-charcoal-700 dark:text-ivory-100">{children}</Text>
    </View>
  );
}

export default function ScoutApplyScreen() {
  const areas = useQuery({ queryKey: ["scout-areas"], queryFn: () => listOpenScoutAreas() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [areaKnowledge, setAreaKnowledge] = useState("");
  const [experience, setExperience] = useState("");
  const [smartphoneModel, setSmartphoneModel] = useState("");
  const [hasDataAccess, setHasDataAccess] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [references, setReferences] = useState<ReferenceDraft[]>([{ ...emptyReference }, { ...emptyReference }]);
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);
  const [verificationConsent, setVerificationConsent] = useState(false);

  const [otpPhase, setOtpPhase] = useState<"idle" | "sent">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [submitPending, setSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ referenceCode: string; status: "applied" | "waitlisted" } | null>(null);

  function updateReference(index: number, patch: Partial<ReferenceDraft>) {
    setReferences((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function onRequestOtp() {
    setOtpError(null);
    setOtpPending(true);
    const res = await startScoutApplicationOtp(phone);
    setOtpPending(false);
    if (res.error) {
      setOtpError(res.error);
      return;
    }
    setOtpPhase("sent");
  }

  async function onVerifyOtp() {
    setOtpError(null);
    setOtpPending(true);
    const res = await verifyScoutApplicationOtp(phone, otpCode);
    setOtpPending(false);
    if (res.error) {
      setOtpError(res.error);
      return;
    }
    setPhoneVerified(true);
  }

  async function onSubmit() {
    setSubmitError(null);
    setFieldErrors({});

    const input: ScoutApplicationInput = {
      fullName,
      phone,
      email,
      ageConfirmed: ageConfirmed as true,
      areaId,
      areaKnowledge,
      experience,
      smartphoneModel,
      hasDataAccess: hasDataAccess as true,
      motivation,
      references,
      codeOfConductAccepted: codeOfConductAccepted as true,
      verificationConsent: verificationConsent as true,
    };
    const parsed = scoutApplicationSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSubmitPending(true);
    const res = await submitScoutApplication(parsed.data);
    setSubmitPending(false);
    if (res.error || res.fieldErrors) {
      setSubmitError(res.error ?? "Please check the highlighted fields.");
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    setResult({ referenceCode: res.referenceCode!, status: res.status! });
  }

  if (result) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Application received" }} />
        <Card className="w-full gap-2 p-5">
          <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100">Application received</Text>
          <Text className="text-sm text-charcoal-600 dark:text-charcoal-400">
            Your reference number is <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">{result.referenceCode}</Text>.{" "}
            {result.status === "waitlisted"
              ? "Your area is currently full -- you've been added to the waitlist for it."
              : "Your area currently has open seats."}
          </Text>
          <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Applications are reviewed in the order received. Seats are limited by area.
          </Text>
        </Card>
      </View>
    );
  }

  if (areas.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (!areas.data || areas.data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Apply" }} />
        <Text className="text-center text-sm text-charcoal-500 dark:text-charcoal-400">
          Applications aren&apos;t open for any area right now. Please check back soon.
        </Text>
      </View>
    );
  }

  const currentAreaId = areaId || areas.data[0].id;

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-4 px-4 pt-16 pb-8">
      <Stack.Screen options={{ headerShown: true, title: `Apply -- ${scoutProgram.name}` }} />
      <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
        Applications are reviewed in the order received. Seats are limited by area.
      </Text>

      <Card className="gap-4 p-5">
        <Input label="Full name" value={fullName} onChangeText={setFullName} error={fieldErrors.fullName} />
        <View className="gap-2">
          <Input
            label="Phone number"
            placeholder="+231 77 000 0000"
            hint="Include your country code, e.g. +231 for Liberia."
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneVerified(false);
              setOtpPhase("idle");
            }}
            error={fieldErrors.phone}
          />
          {phoneVerified ? (
            <Text className="text-xs font-sans-semibold text-success-500">Phone verified</Text>
          ) : otpPhase === "idle" ? (
            <Button variant="secondary" size="sm" loading={otpPending} onPress={onRequestOtp} disabled={!phone}>
              Send verification code
            </Button>
          ) : (
            <View className="gap-2">
              <Input label="Verification code" keyboardType="number-pad" maxLength={6} value={otpCode} onChangeText={setOtpCode} />
              <Button variant="secondary" size="sm" loading={otpPending} onPress={onVerifyOtp} disabled={otpCode.length !== 6}>
                Verify code
              </Button>
            </View>
          )}
          {otpError && <Text className="text-xs font-medium text-error-500">{otpError}</Text>}
        </View>
        <Input label="Email (optional)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} error={fieldErrors.email} />
        <Checkbox checked={ageConfirmed} onPress={() => setAgeConfirmed((v) => !v)}>
          I confirm I am 18 years old or older.
        </Checkbox>
        {fieldErrors.ageConfirmed && <Text className="text-xs font-medium text-error-500">{fieldErrors.ageConfirmed}</Text>}
      </Card>

      <Card className="gap-4 p-5">
        <Text className="text-sm font-sans-semibold text-charcoal-700 dark:text-ivory-100">County / neighbourhood you know</Text>
        <View className="gap-2">
          {areas.data.map((a) => (
            <Button
              key={a.id}
              variant={currentAreaId === a.id ? "primary" : "secondary"}
              size="sm"
              onPress={() => setAreaId(a.id)}
            >
              {`${a.county} -- ${a.neighborhood}`}
            </Button>
          ))}
        </View>
        {fieldErrors.areaId && <Text className="text-xs font-medium text-error-500">{fieldErrors.areaId}</Text>}

        <Input label="How well do you know this area?" multiline value={areaKnowledge} onChangeText={setAreaKnowledge} error={fieldErrors.areaKnowledge} className="h-24 py-2" />
        <Input label="Relevant experience (optional)" multiline value={experience} onChangeText={setExperience} error={fieldErrors.experience} className="h-24 py-2" />
        <Input label="Smartphone model" hint="So we know you can use the scout tools." value={smartphoneModel} onChangeText={setSmartphoneModel} error={fieldErrors.smartphoneModel} />
        <Checkbox checked={hasDataAccess} onPress={() => setHasDataAccess((v) => !v)}>
          I confirm I have regular access to mobile data.
        </Checkbox>
        {fieldErrors.hasDataAccess && <Text className="text-xs font-medium text-error-500">{fieldErrors.hasDataAccess}</Text>}
        <Input label="Why do you want to be a scout?" multiline value={motivation} onChangeText={setMotivation} error={fieldErrors.motivation} className="h-24 py-2" />
      </Card>

      <Card className="gap-4 p-5">
        <Text className="text-sm font-sans-semibold text-charcoal-700 dark:text-ivory-100">Two references</Text>
        {references.map((ref, i) => (
          <View key={i} className="gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0 dark:border-charcoal-500">
            <Input label={`Reference ${i + 1} name`} value={ref.fullName} onChangeText={(v) => updateReference(i, { fullName: v })} />
            <Text className="text-sm font-medium text-charcoal-700 dark:text-ivory-100">Relationship</Text>
            <View className="flex-row flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <Button
                  key={r.value}
                  variant={ref.relationship === r.value ? "primary" : "secondary"}
                  size="sm"
                  onPress={() => updateReference(i, { relationship: r.value })}
                >
                  {r.label}
                </Button>
              ))}
            </View>
            <Input label="Phone" placeholder="+231 77 000 0000" keyboardType="phone-pad" value={ref.phone} onChangeText={(v) => updateReference(i, { phone: v })} />
          </View>
        ))}
        {fieldErrors.references && <Text className="text-xs font-medium text-error-500">{fieldErrors.references}</Text>}
      </Card>

      <Card className="gap-3 p-5">
        <Checkbox checked={codeOfConductAccepted} onPress={() => setCodeOfConductAccepted((v) => !v)}>
          {`I agree to the ${scoutProgram.name} Code of Conduct (version ${SCOUT_CODE_OF_CONDUCT_VERSION}).`}
        </Checkbox>
        {fieldErrors.codeOfConductAccepted && <Text className="text-xs font-medium text-error-500">{fieldErrors.codeOfConductAccepted}</Text>}
        <Checkbox checked={verificationConsent} onPress={() => setVerificationConsent((v) => !v)}>
          I consent to reference checks and other verification steps as part of my application.
        </Checkbox>
        {fieldErrors.verificationConsent && <Text className="text-xs font-medium text-error-500">{fieldErrors.verificationConsent}</Text>}
      </Card>

      {submitError && <Text className="text-sm font-medium text-error-500">{submitError}</Text>}

      <Button loading={submitPending} disabled={!phoneVerified} onPress={onSubmit}>
        Submit application
      </Button>
      {!phoneVerified && <Text className="text-center text-xs text-charcoal-400">Verify your phone number above before submitting.</Text>}
    </ScrollView>
  );
}
