"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavouriteAction(propertyId: string): Promise<{ favourited: boolean } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Log in to save properties." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("property_favourites")
    .select("property_id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("property_favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", propertyId);
    if (error) return { error: "Couldn't update favourites." };
    revalidatePath("/favourites");
    return { favourited: false };
  }

  const { error } = await supabase
    .from("property_favourites")
    .insert({ user_id: user.id, property_id: propertyId });
  if (error) return { error: "Couldn't update favourites." };
  revalidatePath("/favourites");
  return { favourited: true };
}
