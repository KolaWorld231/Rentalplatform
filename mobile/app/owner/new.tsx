import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PropertyFormFields } from "../../components/properties/PropertyFormFields";
import { useSession } from "../../lib/auth/session";
import { createProperty } from "../../lib/owner/service";
import { propertyFormSchema, type PropertyFormInput } from "../../lib/validation/property-form";

const DEFAULT_VALUES: PropertyFormInput = {
  title: "",
  description: "",
  category: "apartment",
  usageType: "residential",
  rentAmount: 0,
  rentalFrequency: "monthly",
  county: "Montserrado",
  city: "",
  community: "",
  landmark: "",
  bedrooms: null,
  bathrooms: null,
  floorAreaSqm: null,
  furnished: false,
  hasElectricity: false,
  hasWater: false,
  hasAirConditioning: false,
  hasParking: false,
  hasSecurity: false,
  advanceRentAmount: null,
  securityDepositAmount: null,
};

export default function NewPropertyScreen() {
  const { user } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormInput>({ resolver: zodResolver(propertyFormSchema), defaultValues: DEFAULT_VALUES });

  async function onSubmit(values: PropertyFormInput) {
    if (!user) return;
    setServerError(null);
    const result = await createProperty(user.id, values);
    if ("error" in result) {
      setServerError(result.error);
      return;
    }
    router.replace(`/owner/${result.id}`);
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-4 p-4 pb-10">
      <Stack.Screen options={{ headerShown: true, title: "List a property" }} />

      <Card className="gap-4 p-4">
        <Controller
          control={control}
          name="title"
          render={({ field }) => <Input label="Title" value={field.value} onChangeText={field.onChange} error={errors.title?.message} />}
        />
        <PropertyFormFields control={control} watch={watch} setValue={setValue} errors={errors} />
        {serverError && <Text className="text-sm text-error-500">{serverError}</Text>}
        <Button variant="clay" loading={isSubmitting} onPress={() => handleSubmit(onSubmit)()}>
          Create listing
        </Button>
      </Card>
    </ScrollView>
  );
}
