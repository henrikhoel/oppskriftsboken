"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteRecipeIdsForUser } from "@/lib/data/recipes";

/**
 * Admin-favoritter lagres direkte i databasen (recipes.favorited_by_admin) –
 * dette er EN delt, admin-kuratert liste, ikke en per-bruker en. Vanlige
 * innloggede brukeres favoritter ligger derimot i `favorites`-tabellen
 * (se toggleFavorite/getMyFavoriteRecipeIds under), og gjester (ikke
 * innlogget i det hele tatt) i localStorage (lib/hooks/useFavorites.ts).
 * Tre helt separate lag – se README for begrunnelse.
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

/**
 * Kontobaserte favoritter (27.09.2026, steg 1 av "kontolagring på tvers av
 * enheter"). Brukes av useAccountFavorites-hooken (lib/hooks/useAccountFavorites.ts)
 * for INNLOGGEDE, ikke-admin brukere. Bruker getCurrentUser() (den
 * revaliderende varianten), ikke getCurrentUserFast() – dette er en
 * skriveoperasjon, og konvensjonen i lib/auth.ts er at alle Server Actions
 * som skriver må bruke den ekte, reviderende sjekken.
 *
 * `favorites`-tabellen (supabase/migrations/0021_user_accounts.sql) har
 * ingen "update"-policy – en favoritt legges enten til eller fjernes, den
 * "oppdateres" aldri – derfor insert/delete her, ikke upsert.
 */
export async function toggleFavorite(recipeId: string, next: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Du må være innlogget for å lagre favoritter.");
  }

  const supabase = await createClient();

  if (next) {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, recipe_id: recipeId });
    if (error) {
      throw new Error(`Kunne ikke lagre favoritt: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId);
    if (error) {
      throw new Error(`Kunne ikke fjerne favoritt: ${error.message}`);
    }
  }

  revalidatePath("/favoritter");
}

/**
 * Henter den innloggede brukerens favoritt-ID-er – brukt av
 * useAccountFavorites-hooken til å hydrere den delte klient-cachen ved
 * første lasting. Returnerer tom liste for gjester (ikke feil), siden
 * hooken kalles ubetinget fra klienten når isLoggedIn er true; selve
 * isLoggedIn-sjekken skjer via prop-tredding fra serversiden (samme mønster
 * som isAdmin), så dette er kun et sikkerhetsnett.
 */
export async function getMyFavoriteRecipeIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getFavoriteRecipeIdsForUser(user.id);
}
