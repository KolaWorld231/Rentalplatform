import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { SwipeDeck } from "../../components/properties/SwipeDeck";
import { useSession } from "../../lib/auth/session";
import { cn } from "../../lib/cn";
import { LIBERIA_COUNTIES, PROPERTY_CATEGORIES } from "../../lib/database.types";
import { formatCategory } from "../../lib/format";
import { searchProperties } from "../../lib/properties/service";
import { searchParamsSchema, type SearchParamsInput } from "../../lib/validation/property";

const SORT_OPTIONS: { value: SearchParamsInput["sort"]; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function SearchScreen() {
  const { user } = useSession();
  const [q, setQ] = useState("");
  const [county, setCounty] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<SearchParamsInput["sort"]>("newest");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"list" | "swipe">("list");

  const params = searchParamsSchema.parse({ q: q || undefined, county, category, sort, page });
  const result = useQuery({
    queryKey: ["search", params],
    queryFn: () => searchProperties(params),
    enabled: mode === "list",
  });

  const totalPages = result.data ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize)) : 1;

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <View className="flex-1 bg-canvas pt-16 dark:bg-charcoal-900">
      <View className="gap-3 px-4 pb-3">
        <TextInput
          placeholder="Search by title (e.g. Sinkor apartment)"
          placeholderTextColor="#737373"
          value={q}
          onChangeText={(v) => {
            setQ(v);
            resetToFirstPage();
          }}
          className="h-12 rounded-md border border-border bg-surface px-4 text-base text-charcoal-700 dark:border-charcoal-500 dark:bg-charcoal-700 dark:text-ivory-100"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <FilterChip
            label="All types"
            active={!category}
            onPress={() => {
              setCategory(undefined);
              resetToFirstPage();
            }}
          />
          {PROPERTY_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={formatCategory(c)}
              active={category === c}
              onPress={() => {
                setCategory(category === c ? undefined : c);
                resetToFirstPage();
              }}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <FilterChip
            label="All counties"
            active={!county}
            onPress={() => {
              setCounty(undefined);
              resetToFirstPage();
            }}
          />
          {LIBERIA_COUNTIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={county === c}
              onPress={() => {
                setCounty(county === c ? undefined : c);
                resetToFirstPage();
              }}
            />
          ))}
        </ScrollView>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
            {mode === "list" && result.data ? `${result.data.total} result${result.data.total === 1 ? "" : "s"}` : " "}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {SORT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={sort === opt.value}
                onPress={() => {
                  setSort(opt.value);
                  resetToFirstPage();
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Swipe mode is an optional, logged-in-only way to browse the same
            filtered results -- guests only ever see the plain grid below. */}
        {user && (
          <View className="flex-row self-start rounded-full border border-border p-0.5 dark:border-charcoal-500">
            <Pressable onPress={() => setMode("list")} className={cn("rounded-full px-3 py-1", mode === "list" && "bg-forest-600")}>
              <Text className={cn("text-xs font-sans-semibold", mode === "list" ? "text-ivory-50" : "text-charcoal-700 dark:text-ivory-100")}>
                Grid
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode("swipe")} className={cn("rounded-full px-3 py-1", mode === "swipe" && "bg-forest-600")}>
              <Text className={cn("text-xs font-sans-semibold", mode === "swipe" ? "text-ivory-50" : "text-charcoal-700 dark:text-ivory-100")}>
                Swipe
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {mode === "swipe" && user ? (
        <SwipeDeck
          key={JSON.stringify({ q: params.q, county: params.county, category: params.category, sort: params.sort })}
          params={{ q: params.q, county: params.county, category: params.category, sort: params.sort }}
        />
      ) : result.isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : result.isError ? (
        <Text className="px-4 text-sm text-error-500">Couldn&apos;t load results. Pull to refresh.</Text>
      ) : (
        <FlatList
          data={result.data?.properties ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperClassName="gap-3 px-4"
          contentContainerClassName="gap-3 pb-6"
          renderItem={({ item }) => (
            <View className="flex-1">
              <PropertyCard property={item} />
            </View>
          )}
          ListEmptyComponent={
            <Text className="px-4 text-sm text-charcoal-500 dark:text-charcoal-400">
              No properties match these filters yet. Try widening your search.
            </Text>
          }
          ListFooterComponent={
            result.data && totalPages > 1 ? (
              <View className="flex-row items-center justify-center gap-4 pt-2">
                <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)} className={cn(page <= 1 && "opacity-40")}>
                  <Text className="font-sans-semibold text-forest-700 dark:text-forest-500">Previous</Text>
                </Pressable>
                <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">
                  Page {page} of {totalPages}
                </Text>
                <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} className={cn(page >= totalPages && "opacity-40")}>
                  <Text className="font-sans-semibold text-forest-700 dark:text-forest-500">Next</Text>
                </Pressable>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-full border px-3 py-1.5",
        active ? "border-forest-600 bg-forest-100 dark:bg-forest-900/40" : "border-border dark:border-charcoal-500",
      )}
    >
      <Text className={cn("text-xs font-sans-semibold", active ? "text-forest-700 dark:text-forest-500" : "text-charcoal-700 dark:text-ivory-100")}>
        {label}
      </Text>
    </Pressable>
  );
}
