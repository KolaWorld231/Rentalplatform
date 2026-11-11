import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PropertyFormFields } from "../../components/properties/PropertyFormFields";
import { formatRelativeDate } from "../../lib/format";
import {
  confirmAvailability,
  deletePropertyPhoto,
  getMyProperty,
  setAvailability,
  setCoverPhoto,
  setListingStatus,
  updateProperty,
  uploadPropertyPhoto,
} from "../../lib/owner/service";
import { propertyFormSchema, type PropertyFormInput } from "../../lib/validation/property-form";
import { propertyImageUrl } from "../../lib/storage";

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const property = useQuery({ queryKey: ["owner-property", id], queryFn: () => getMyProperty(id) });
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormInput>({ resolver: zodResolver(propertyFormSchema) });

  useEffect(() => {
    if (!property.data) return;
    const p = property.data;
    reset({
      title: p.title,
      description: p.description,
      category: p.category,
      usageType: p.usage_type,
      rentAmount: p.rent_amount,
      rentalFrequency: p.rental_frequency,
      county: p.county,
      city: p.city,
      community: p.community ?? "",
      landmark: p.landmark ?? "",
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      floorAreaSqm: p.floor_area_sqm,
      furnished: p.furnished ?? false,
      hasElectricity: p.has_electricity ?? false,
      hasWater: p.has_water ?? false,
      hasAirConditioning: p.has_air_conditioning ?? false,
      hasParking: p.has_parking ?? false,
      hasSecurity: p.has_security ?? false,
      advanceRentAmount: p.advance_rent_amount,
      securityDepositAmount: p.security_deposit_amount,
    });
  }, [property.data, reset]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["owner-property", id] });
    queryClient.invalidateQueries({ queryKey: ["my-properties-full"] });
  }

  async function onSubmit(values: PropertyFormInput) {
    setServerError(null);
    const result = await updateProperty(id, values);
    if (result.error) setServerError(result.error);
    else invalidate();
  }

  async function onUploadPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    await uploadPropertyPhoto(id, result.assets[0].uri);
    setUploading(false);
    invalidate();
  }

  if (property.isLoading || !property.data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <Stack.Screen options={{ headerShown: true, title: "Edit listing" }} />
      </View>
    );
  }

  const p = property.data;

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-charcoal-900" contentContainerClassName="gap-4 p-4 pb-10">
      <Stack.Screen options={{ headerShown: true, title: "Edit listing" }} />

      <Card className="gap-3 p-4">
        <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Visibility</Text>
        <View className="flex-row gap-2">
          <Button size="sm" variant={p.listing_status === "published" ? "primary" : "secondary"} onPress={() => setListingStatus(id, "published").then(invalidate)}>
            Publish
          </Button>
          <Button size="sm" variant={p.listing_status === "draft" ? "primary" : "secondary"} onPress={() => setListingStatus(id, "draft").then(invalidate)}>
            Unpublish
          </Button>
        </View>

        <Text className="mt-2 font-sans-semibold text-charcoal-700 dark:text-ivory-100">Availability</Text>
        <View className="flex-row gap-2">
          <Button size="sm" variant={p.availability_status === "rented" ? "primary" : "secondary"} onPress={() => setAvailability(id, "rented").then(invalidate)}>
            Mark rented
          </Button>
          <Button size="sm" variant={p.availability_status === "available" ? "primary" : "secondary"} onPress={() => setAvailability(id, "available").then(invalidate)}>
            Mark available
          </Button>
        </View>
        {p.last_availability_confirmed_at && (
          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">Reconfirmed {formatRelativeDate(p.last_availability_confirmed_at)}</Text>
        )}
        <Button size="sm" variant="ghost" onPress={() => confirmAvailability(id).then(invalidate)}>
          Reconfirm availability now
        </Button>

        <View className="mt-2 border-t border-border pt-2 dark:border-charcoal-500">
          <Button size="sm" variant="ghost" onPress={() => setListingStatus(id, "archived").then(invalidate)}>
            Archive listing
          </Button>
        </View>
      </Card>

      <Card className="gap-3 p-4">
        <Text className="font-sans-semibold text-charcoal-700 dark:text-ivory-100">Photos</Text>
        <FlatList
          horizontal
          data={p.property_images}
          keyExtractor={(img) => img.id}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
          renderItem={({ item }) => (
            <View className="gap-1">
              <Image source={{ uri: propertyImageUrl(item.storage_path) }} style={{ width: 90, height: 90, borderRadius: 8 }} alt="" />
              <View className="flex-row gap-1">
                {!item.is_cover && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Set as cover photo"
                    onPress={() => setCoverPhoto(id, item.id).then(invalidate)}
                  >
                    <Text className="text-xs text-forest-700 dark:text-forest-500">Set cover</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete photo"
                  onPress={() => deletePropertyPhoto(id, item.id, item.storage_path).then(invalidate)}
                >
                  <Text className="text-xs text-error-500">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
        <Button size="sm" variant="secondary" loading={uploading} onPress={onUploadPhoto}>
          Add photo
        </Button>
      </Card>

      <Card className="gap-4 p-4">
        <Controller
          control={control}
          name="title"
          render={({ field }) => <Input label="Title" value={field.value} onChangeText={field.onChange} error={errors.title?.message} />}
        />
        <PropertyFormFields control={control} watch={watch} setValue={setValue} errors={errors} />
        {serverError && <Text className="text-sm text-error-500">{serverError}</Text>}
        <Button variant="clay" loading={isSubmitting} onPress={() => handleSubmit(onSubmit)()}>
          Save changes
        </Button>
      </Card>
    </ScrollView>
  );
}
