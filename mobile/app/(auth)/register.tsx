import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Home, Search } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { WhatsAppAuthForm } from "../../components/auth/WhatsAppAuthForm";
import { cn } from "../../lib/cn";
import { registerAction } from "../../lib/auth/actions";
import { attributeScoutReferral } from "../../lib/scouts/service";
import { registerSchema, type RegisterInput } from "../../lib/validation/auth";

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ intent?: string; ref?: string }>();
  const defaultIntent = params.intent === "owner" ? "owner" : "renter";
  const [method, setMethod] = useState<"password" | "whatsapp">("password");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", intent: defaultIntent },
  });
  const intent = watch("intent");
  const displayName = watch("displayName");

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    if (params.ref) {
      // Best-effort -- an unknown/self-referral code is silently ignored by the RPC itself.
      await attributeScoutReferral(params.ref);
    }
    router.replace("/(tabs)");
  }

  return (
    <ScrollView className="flex-1 bg-surface-base" contentContainerClassName="px-4 pt-20 pb-8 gap-6">
      <View>
        <Text className="font-display-bold text-2xl text-content-strong">Create your account</Text>
        <Text className="mt-1 text-base text-content-muted">
          Browsing is always free. Tell us what you&apos;re here for.
        </Text>
      </View>

      <Card className="gap-4 p-5">
        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find a property"
            accessibilityState={{ selected: intent === "renter" }}
            onPress={() => setValue("intent", "renter")}
            className={cn(
 "flex-1 gap-1.5 rounded-lg border-2 p-4",
              intent === "renter" ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border-themed",
            )}
          >
            <Search size={20} color={intent === "renter" ? "#b8122f" : "#737373"} />
            <Text className={cn("font-sans-semibold text-sm", intent === "renter" ? "text-accent-text" : "text-content-strong")}>
              Find a property
            </Text>
            <Text className="text-xs text-content-muted">Browse and message owners</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="List a property"
            accessibilityState={{ selected: intent === "owner" }}
            onPress={() => setValue("intent", "owner")}
            className={cn(
 "flex-1 gap-1.5 rounded-lg border-2 p-4",
              intent === "owner" ? "border-clay-500 bg-clay-400/10" : "border-border-themed",
            )}
          >
            <Home size={20} color={intent === "owner" ? "#a00c30" : "#737373"} />
            <Text className={cn("font-sans-semibold text-sm", intent === "owner" ? "text-accent-text" : "text-content-strong")}>
              List a property
            </Text>
            <Text className="text-xs text-content-muted">Free, always</Text>
          </Pressable>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <Input label="Full name" value={field.value} onChangeText={field.onChange} error={errors.displayName?.message} />
          )}
        />

        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign up with password"
            accessibilityState={{ selected: method === "password" }}
            onPress={() => setMethod("password")}
            className={cn(
 "flex-1 items-center rounded-md border py-2",
              method === "password" ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border-themed",
            )}
          >
            <Text className={cn("text-sm font-sans-semibold", method === "password" ? "text-accent-text" : "text-content-strong")}>
              Password
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign up with WhatsApp"
            accessibilityState={{ selected: method === "whatsapp" }}
            onPress={() => setMethod("whatsapp")}
            className={cn(
 "flex-1 items-center rounded-md border py-2",
              method === "whatsapp" ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border-themed",
            )}
          >
            <Text className={cn("text-sm font-sans-semibold", method === "whatsapp" ? "text-accent-text" : "text-content-strong")}>
              WhatsApp
            </Text>
          </Pressable>
        </View>

        {method === "whatsapp" ? (
          <WhatsAppAuthForm mode="signup" displayName={displayName} intent={intent} />
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input
                  label="Password"
                  secureTextEntry
                  hint="At least 8 characters."
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.password?.message}
                />
              )}
            />
            {serverError && <Text className="text-sm font-medium text-error-500">{serverError}</Text>}
            <Button loading={isSubmitting} onPress={() => handleSubmit(onSubmit)()}>
              Create account
            </Button>
          </>
        )}
      </Card>

      <View className="flex-row justify-center gap-1">
        <Text className="text-content-muted">Already have an account?</Text>
        <Link href="/(auth)/login" className="font-medium text-accent-text">
          Log in
        </Link>
      </View>
    </ScrollView>
  );
}
