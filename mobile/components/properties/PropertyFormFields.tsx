import type { Control, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Input } from "../ui/Input";
import { cn } from "../../lib/cn";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "../../lib/database.types";
import { formatCategory } from "../../lib/format";
import type { PropertyFormInput } from "../../lib/validation/property-form";

const RENTAL_FREQUENCIES: PropertyFormInput["rentalFrequency"][] = ["monthly", "quarterly", "yearly", "nightly"];
const USAGE_TYPES: PropertyFormInput["usageType"][] = ["residential", "commercial", "land"];
const AMENITIES: { key: "furnished" | "hasElectricity" | "hasWater" | "hasAirConditioning" | "hasParking" | "hasSecurity"; label: string }[] = [
  { key: "furnished", label: "Furnished" },
  { key: "hasElectricity", label: "Electricity" },
  { key: "hasWater", label: "Water supply" },
  { key: "hasAirConditioning", label: "Air conditioning" },
  { key: "hasParking", label: "Parking" },
  { key: "hasSecurity", label: "Security" },
];

export function PropertyFormFields({
  control,
  watch,
  setValue,
  errors,
}: {
  control: Control<PropertyFormInput>;
  watch: UseFormWatch<PropertyFormInput>;
  setValue: UseFormSetValue<PropertyFormInput>;
  errors: FieldErrors<PropertyFormInput>;
}) {
  const category = watch("category");
  const county = watch("county");
  const usageType = watch("usageType");
  const rentalFrequency = watch("rentalFrequency");

  return (
    <>
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Input label="Description" multiline numberOfLines={4} value={field.value} onChangeText={field.onChange} error={errors.description?.message} />
        )}
      />

      <ChipPicker label="Category" value={category} options={PROPERTY_CATEGORIES} formatOption={formatCategory} onChange={(v) => setValue("category", v)} />
      <ChipPicker label="Usage type" value={usageType} options={USAGE_TYPES} formatOption={formatCategory} onChange={(v) => setValue("usageType", v)} />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="rentAmount"
            render={({ field }) => (
              <Input
                label="Rent (USD)"
                keyboardType="numeric"
                value={String(field.value ?? "")}
                onChangeText={(v) => field.onChange(Number(v) || 0)}
                error={errors.rentAmount?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <ChipPicker label="Frequency" value={rentalFrequency} options={RENTAL_FREQUENCIES} formatOption={(v) => v} onChange={(v) => setValue("rentalFrequency", v)} />
        </View>
      </View>

      <ChipPicker label="County" value={county} options={LIBERIA_COUNTIES} formatOption={(v) => v} onChange={(v) => setValue("county", v)} />

      <Controller
        control={control}
        name="city"
        render={({ field }) => <Input label="City" value={field.value} onChangeText={field.onChange} error={errors.city?.message} />}
      />
      <Controller
        control={control}
        name="community"
        render={({ field }) => <Input label="Community (optional)" value={field.value ?? ""} onChangeText={field.onChange} />}
      />
      <Controller
        control={control}
        name="landmark"
        render={({ field }) => <Input label="Landmark (optional)" value={field.value ?? ""} onChangeText={field.onChange} />}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="bedrooms"
            render={({ field }) => (
              <Input label="Bedrooms" keyboardType="numeric" value={field.value != null ? String(field.value) : ""} onChangeText={(v) => field.onChange(v === "" ? null : Number(v))} />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="bathrooms"
            render={({ field }) => (
              <Input label="Bathrooms" keyboardType="numeric" value={field.value != null ? String(field.value) : ""} onChangeText={(v) => field.onChange(v === "" ? null : Number(v))} />
            )}
          />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-charcoal-700 dark:text-ivory-100">Amenities</Text>
        <View className="flex-row flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <Controller
              key={a.key}
              control={control}
              name={a.key}
              render={({ field }) => (
                <Pressable
                  onPress={() => field.onChange(!field.value)}
                  className={cn("rounded-full border px-3 py-1.5", field.value ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border dark:border-charcoal-500")}
                >
                  <Text className={cn("text-xs font-sans-semibold", field.value ? "text-forest-700 dark:text-forest-500" : "text-charcoal-700 dark:text-ivory-100")}>{a.label}</Text>
                </Pressable>
              )}
            />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="advanceRentAmount"
            render={({ field }) => (
              <Input label="Advance rent (optional)" keyboardType="numeric" value={field.value != null ? String(field.value) : ""} onChangeText={(v) => field.onChange(v === "" ? null : Number(v))} />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="securityDepositAmount"
            render={({ field }) => (
              <Input label="Security deposit (optional)" keyboardType="numeric" value={field.value != null ? String(field.value) : ""} onChangeText={(v) => field.onChange(v === "" ? null : Number(v))} />
            )}
          />
        </View>
      </View>
    </>
  );
}

function ChipPicker<T extends string>({
  label,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  formatOption: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-charcoal-700 dark:text-ivory-100">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className={cn("rounded-full border px-3 py-1.5", value === opt ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border dark:border-charcoal-500")}
          >
            <Text className={cn("text-xs font-sans-semibold", value === opt ? "text-forest-700 dark:text-forest-500" : "text-charcoal-700 dark:text-ivory-100")}>
              {formatOption(opt)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
