"use server";

import { revalidatePath } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

/**
 * Stjernevurderinger fra gjester. Ingen innlogging finnes for gjester, så
 * selve 1-5-verdien lagres i gjestens localStorage (se
 * lib/hooks/useRecipeRatings.ts) – denne actionen oppdaterer kun det
 * aggregerte tallet på oppskriften, via en egen databasefunksjon
 * (rate_recipe, se supabase/migrations/0002_ai_features.sql) som er trygg
 * å åpne for anonyme brukere uten å gi generell skrivetilgang.
 *
 * `previousStars` sendes med når en gjest endrer en vurdering de allerede
 * har gitt (funnet i deres egen localStorage), slik at aggregatet
 * justeres riktig i stedet for å telle dem to ganger.
 */
export async function rateRecipe(
  recipeId: string,
  newStars: number,
  previousStars: number | null,
  recipeSlug?: string,
): Promise<{ ratingSum: number; ratingCount: number }> {
  if (!Number.isInteger(newStars) || newStars < 1 || newStars > 5) {
    throw new Error("Vurdering må være mellom 1 og 5 stjerner.");
  }
  if (!isSupabaseConfigured) {
    throw new Error("Vurderinger krever at Supabase er konfigurert.");
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc("rate_recipe", {
    recipe_id: recipeId,
    new_stars: newStars,
    previous_stars: previousStars ?? undefined,
  });

  if (error) {
    throw new Error(`Kunne ikke lagre vurdering: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;

  // (29.09.2026, Henrik: "kan noe reduseres ytterligere?" – etter å ha
  // oppgradert til Vercel Pro og gått gjennom hva som trekker av de
  // delte 20 dollarne i månedlig kreditt) – fjernet de to brede kallene
  // som fornyet HELE forsiden og HELE oppskriftslisten på hver eneste
  // stjernevurdering, fra hvem som helst, uten innlogging. Unødvendig
  // aggressivt: personen som vurderer ser sitt eget nye snitt med det
  // samme (RatingStars.tsx oppdaterer seg selv optimistisk, uavhengig av
  // denne revalideringen), og selve oppskriftssiden har uansett en
  // 5-minutters automatisk fornyelse (revalidate = 300 lenger opp i
  // app/oppskrifter/[slug]/page.tsx) som sprer det oppdaterte snittet
  // videre til andre besøkende uten at vi trenger å tvinge det frem her.
  if (recipeSlug) revalidatePath(`/oppskrifter/${recipeSlug}`);

  return {
    ratingSum: row?.rating_sum ?? 0,
    ratingCount: row?.rating_count ?? 0,
  };
}
