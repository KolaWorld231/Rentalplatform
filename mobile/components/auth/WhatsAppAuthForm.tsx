import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { startWhatsAppLogin, startWhatsAppSignup, verifyWhatsAppOtp } from "../../lib/auth/whatsapp-service";
import { whatsappLoginSchema, whatsappOtpVerifySchema, whatsappSignupSchema } from "../../lib/validation/auth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function WhatsAppAuthForm({
  mode,
  displayName,
  intent,
}: {
  mode: "signup" | "login";
  displayName?: string;
  intent?: "renter" | "owner";
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const startForm = useForm({
    resolver: zodResolver(mode === "signup" ? whatsappSignupSchema : whatsappLoginSchema),
    defaultValues: mode === "signup" ? { displayName: displayName ?? "", phone: "", email: "", intent: intent ?? "renter" } : { phone: "" },
  });
  const verifyForm = useForm({
    resolver: zodResolver(whatsappOtpVerifySchema),
    defaultValues: { phone: "", code: "", mode },
  });

  async function onStartSubmit(values: Record<string, unknown>) {
    setServerError(null);
    const result =
      mode === "signup"
        ? await startWhatsAppSignup(values as { displayName: string; phone: string; email: string; intent: "renter" | "owner" })
        : await startWhatsAppLogin((values as { phone: string }).phone);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    const enteredPhone = (values as { phone: string }).phone;
    setPhone(enteredPhone);
    verifyForm.setValue("phone", enteredPhone);
    setStep("otp");
  }

  async function onVerifySubmit(values: { phone: string; code: string; mode: "signup" | "login" }) {
    setServerError(null);
    const result = await verifyWhatsAppOtp(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.replace("/(tabs)");
  }

  if (step === "phone") {
    return (
      <View className="gap-3">
        {mode === "signup" && (
          <Controller
            control={startForm.control}
            name="email"
            render={({ field }) => (
              <Input
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value as string}
                onChangeText={field.onChange}
                hint="Used once to set up your account -- you'll only sign in with your WhatsApp number after this."
                error={startForm.formState.errors.email?.message as string | undefined}
              />
            )}
          />
        )}
        <Controller
          control={startForm.control}
          name="phone"
          render={({ field }) => (
            <Input
              label="WhatsApp number"
              keyboardType="phone-pad"
              placeholder="+231 77 000 0000"
              value={field.value as string}
              onChangeText={field.onChange}
              hint="Include your country code, e.g. +231 for Liberia."
              error={startForm.formState.errors.phone?.message as string | undefined}
            />
          )}
        />
        {serverError && <Text className="text-sm text-error-500">{serverError}</Text>}
        <Button loading={startForm.formState.isSubmitting} onPress={() => startForm.handleSubmit(onStartSubmit)()}>
          Send code on WhatsApp
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">We sent a 6-digit code to {phone} on WhatsApp.</Text>
      <Controller
        control={verifyForm.control}
        name="code"
        render={({ field }) => (
          <Input
            label="Verification code"
            keyboardType="numeric"
            maxLength={6}
            value={field.value}
            onChangeText={field.onChange}
            error={verifyForm.formState.errors.code?.message}
          />
        )}
      />
      {serverError && <Text className="text-sm text-error-500">{serverError}</Text>}
      <Button loading={verifyForm.formState.isSubmitting} onPress={() => verifyForm.handleSubmit(onVerifySubmit)()}>
        Verify &amp; continue
      </Button>
      <Pressable onPress={() => setStep("phone")}>
        <Text className="text-xs font-sans-semibold text-charcoal-500 dark:text-charcoal-400">Use a different number</Text>
      </Pressable>
    </View>
  );
}
