"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-favoritter lagres direkte i databasen (recipes.favorited_by_admin),
 * i motsetning til gjeste-favoritter som ligger i localStorage
 * (lib/hooks/useFavorites.ts). Se README for begrunnelse.
 */
export async function toggleAdminFavorite(recipeId: string, next: boolean): Promise<void> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ favorited_by_admin: next })
    .eq("id", recipeId);

  if (error) {
    throw new Error(`Kunne ikke oppdatere favoritt: ${error.message}`);
  }

  revalidatePath("/favoritter");
  revalidatePath("/oppskrifter");
  revalidatePath("/");
}
