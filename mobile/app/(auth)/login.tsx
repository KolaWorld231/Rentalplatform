import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { loginAction } from "../../lib/auth/actions";
import { loginSchema, type LoginInput } from "../../lib/validation/auth";

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await loginAction(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="px-4 pt-20 pb-8 gap-6">
      <View>
        <Text className="font-display-bold text-2xl text-charcoal-700 dark:text-ivory-100">Log in</Text>
        <Text className="mt-1 text-base text-charcoal-500 dark:text-charcoal-400">Welcome back to DomiLink.</Text>
      </View>

      <Card className="gap-4 p-5">
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
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />
        {serverError && <Text className="text-sm font-medium text-error-500">{serverError}</Text>}
        <Button loading={isSubmitting} onPress={() => handleSubmit(onSubmit)()}>
          Log in
        </Button>
      </Card>

      <View className="flex-row justify-center gap-1">
        <Text className="text-charcoal-500 dark:text-charcoal-400">New to DomiLink?</Text>
        <Link href="/(auth)/register" className="font-medium text-forest-700 dark:text-forest-500">
          Create an account
        </Link>
      </View>
    </ScrollView>
  );
}
