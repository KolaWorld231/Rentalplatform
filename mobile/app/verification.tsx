import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useSession } from "../lib/auth/session";
import { supabase } from "../lib/supabase";
import {
  getDocuments,
  getIdentityVerification,
  getPropertyVerification,
  submitIdentityVerification,
  submitPropertyVerification,
  uploadVerificationDocument,
} from "../lib/verification/service";
import type { IdentityVerificationRequest, VerificationStatus } from "../lib/database.types";

const STATUS_COPY: Record<VerificationStatus, string> = {
  submitted: "Submitted — awaiting review",
  under_review: "Under review",
  verified: "Verified",
  rejected: "Rejected",
  needs_more_info: "Needs more information",
  expired: "Expired — resubmit",
};

export default function VerificationScreen() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const identity = useQuery({
    queryKey: ["identity-verification", user?.id],
    enabled: !!user,
    queryFn: () => getIdentityVerification(user!.id),
  });
  const myProperties = useQuery({
    queryKey: ["my-properties", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, title, slug").eq("owner_id", user!.id);
      return data ?? [];
    },
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Verification" }} />
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">Log in to verify your identity.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-5 p-4 pb-10">
      <Stack.Screen options={{ headerShown: true, title: "Verification" }} />
      <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
        Verification is an evidence-based review process, not a guarantee of legal ownership. Documents are stored
        privately and reviewed only by our moderation team.
      </Text>

      <IdentityCard userId={user.id} request={identity.data} onChanged={() => queryClient.invalidateQueries({ queryKey: ["identity-verification", user.id] })} />

      {myProperties.data && myProperties.data.length > 0 && (
        <View className="gap-3">
          <Text className="font-display-bold text-lg text-charcoal-700 dark:text-ivory-100">Your properties</Text>
          {myProperties.data.map((p) => (
            <PropertyVerificationCard key={p.id} propertyId={p.id} title={p.title} applicantId={user.id} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function IdentityCard({
  userId,
  request,
  onChanged,
}: {
  userId: string;
  request: IdentityVerificationRequest | null | undefined;
  onChanged: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documents = useQuery({
    queryKey: ["verification-documents", "identity", request?.id],
    enabled: !!request,
    queryFn: () => getDocuments({ identityRequestId: request!.id }),
  });

  async function onStart() {
    setSubmitting(true);
    await submitIdentityVerification(userId);
    setSubmitting(false);
    onChanged();
  }

  async function onUpload() {
    if (!request) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to capture your ID.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    setError(null);
    setUploading(true);
    const { error: uploadError } = await uploadVerificationDocument(result.assets[0].uri, { identityRequestId: request.id }, userId);
    setUploading(false);
    if (uploadError) {
      setError(uploadError);
      return;
    }
    documents.refetch();
  }

  return (
    <Card className={request?.status === "verified" ? "gap-3 p-5 shadow-floating" : "gap-3 p-5"}>
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Identity verification</Text>
        {request && <Text className="text-xs font-sans-semibold text-forest-700 dark:text-forest-500">{STATUS_COPY[request.status]}</Text>}
      </View>

      {!request ? (
        <>
          <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Submit a government-issued ID so renters know you&apos;re a verified owner.
          </Text>
          <Button loading={submitting} onPress={onStart}>
            Start identity verification
          </Button>
        </>
      ) : (
        <>
          {documents.data && documents.data.length > 0 && (
            <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">
              {documents.data.length} document{documents.data.length === 1 ? "" : "s"} uploaded
            </Text>
          )}
          {error && <Text className="text-sm text-error-500">{error}</Text>}
          {request.status !== "verified" && (
            <Button variant="secondary" loading={uploading} onPress={onUpload}>
              Take a photo of your ID
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function PropertyVerificationCard({ propertyId, title, applicantId }: { propertyId: string; title: string; applicantId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useQuery({ queryKey: ["property-verification", propertyId], queryFn: () => getPropertyVerification(propertyId) });
  const documents = useQuery({
    queryKey: ["verification-documents", "property", request.data?.id],
    enabled: !!request.data,
    queryFn: () => getDocuments({ propertyRequestId: request.data!.id }),
  });

  async function onStart() {
    setSubmitting(true);
    await submitPropertyVerification(propertyId, applicantId);
    setSubmitting(false);
    request.refetch();
  }

  async function onUpload() {
    if (!request.data) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed to capture your documents.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    setError(null);
    setUploading(true);
    const { error: uploadError } = await uploadVerificationDocument(result.assets[0].uri, { propertyRequestId: request.data.id }, applicantId);
    setUploading(false);
    if (uploadError) {
      setError(uploadError);
      return;
    }
    documents.refetch();
  }

  return (
    <Card className="gap-2 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-sans-semibold text-charcoal-700 dark:text-ivory-100" numberOfLines={1}>
          {title}
        </Text>
        {request.data && <Text className="text-xs font-sans-semibold text-forest-700 dark:text-forest-500">{STATUS_COPY[request.data.status]}</Text>}
      </View>

      {!request.data ? (
        <Button size="sm" loading={submitting} onPress={onStart}>
          Submit for verification
        </Button>
      ) : request.data.status !== "verified" ? (
        <>
          {documents.data && documents.data.length > 0 && (
            <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">{documents.data.length} document(s) uploaded</Text>
          )}
          {error && <Text className="text-sm text-error-500">{error}</Text>}
          <Button size="sm" variant="secondary" loading={uploading} onPress={onUpload}>
            Take a photo of ownership documents
          </Button>
        </>
      ) : null}
    </Card>
  );
}
