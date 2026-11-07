import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Home, Search } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/cn";
import { registerAction } from "../../lib/auth/actions";
import { registerSchema, type RegisterInput } from "../../lib/validation/auth";

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ intent?: string }>();
  const defaultIntent = params.intent === "owner" ? "owner" : "renter";
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

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="px-4 pt-20 pb-8 gap-6">
      <View>
        <Text className="font-display-bold text-2xl text-charcoal-700 dark:text-ivory-100">Create your account</Text>
        <Text className="mt-1 text-base text-charcoal-500 dark:text-charcoal-400">
          Browsing is always free. Tell us what you&apos;re here for.
        </Text>
      </View>

      <Card className="gap-4 p-5">
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setValue("intent", "renter")}
            className={cn(
              "flex-1 gap-1.5 rounded-lg border-2 p-4",
              intent === "renter" ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border dark:border-charcoal-500",
            )}
          >
            <Search size={20} color={intent === "renter" ? "#b8122f" : "#737373"} />
            <Text className={cn("font-sans-semibold text-sm", intent === "renter" ? "text-forest-700 dark:text-forest-500" : "text-charcoal-700 dark:text-ivory-100")}>
              Find a property
            </Text>
            <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">Browse and message owners</Text>
          </Pressable>
          <Pressable
            onPress={() => setValue("intent", "owner")}
            className={cn(
              "flex-1 gap-1.5 rounded-lg border-2 p-4",
              intent === "owner" ? "border-clay-500 bg-clay-400/10" : "border-border dark:border-charcoal-500",
            )}
          >
            <Home size={20} color={intent === "owner" ? "#a00c30" : "#737373"} />
            <Text className={cn("font-sans-semibold text-sm", intent === "owner" ? "text-clay-600" : "text-charcoal-700 dark:text-ivory-100")}>
              List a property
            </Text>
            <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">Free, always</Text>
          </Pressable>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <Input label="Full name" value={field.value} onChangeText={field.onChange} error={errors.displayName?.message} />
          )}
        />
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
      </Card>

      <View className="flex-row justify-center gap-1">
        <Text className="text-charcoal-500 dark:text-charcoal-400">Already have an account?</Text>
        <Link href="/(auth)/login" className="font-medium text-forest-700 dark:text-forest-500">
          Log in
        </Link>
      </View>
    </ScrollView>
  );
}
