import { createClient } from "@/lib/supabase/server";
import type { AiCacheFeature } from "@/lib/kitchen-intelligence/types";

/**
 * Delt cache for kostbare/trege AI-svar på tvers av ALLE nye
 * kjøkkenintelligens-funksjoner (erstatninger, "Løft retten",
 * pantry-matching, smaksprofil, meny-forslag, restemat, "gjør det til en
 * kveld") – se lib/kitchen-intelligence/types.ts sin filheader og
 * supabase/migrations/0006_kitchen_intelligence_foundation.sql. Poenget: én
 * tabell, én liten, forutsigbar API, i stedet for at hver funksjon finner
 * opp sin egen cache-mekanisme.
 *
 * `cacheKey` skal være en DETERMINISTISK, stabil nøkkel bygget av kalleren
 * fra de faktiske parameterne som påvirker svaret (f.eks.
 * `${servings}:${unitSystem}:${variant}:${ingredientItemId}` for en
 * erstatning) – denne modulen tar ikke stilling til hashing/normalisering,
 * kun lagring/oppslag. Hold nøkkelen kort (< 200 tegn); hash lange
 * parameterlister med f.eks. en enkel stabil JSON.stringify + i verste
 * fall trunkering, IKKE inkluder frie brukertekster rått.
 *
 * Silent-fail-prinsipp: caching er en optimalisering, ikke en avhengighet.
 * Både get og set svelger feil (logger, returnerer null/no-op) slik at et
 * midlertidig Supabase-problem aldri hindrer selve AI-kallet fra å kjøre —
 * det blir bare litt tregere/dyrere den ene gangen, aldri en brukervendt feil.
 *
 * `recipeId` er `null` for et FÅTALL sidevidte funksjoner som ikke gjelder
 * én bestemt oppskrift (i dag: mood_mode, se moods.ts) – se migrasjon 0007.
 * Postgres' unik-constraint (recipe_id, feature, cache_key) skiller ALDRI to
 * NULL-rader fra hverandre, så ON CONFLICT/upsert ville bare stablet opp nye
 * rader i det tilfellet i stedet for å oppdatere – NULL-veien under slår
 * derfor opp en eventuell eksisterende rad manuelt i stedet.
 */

export async function getCachedAiSuggestion<T>(
  recipeId: string | null,
  feature: AiCacheFeature,
  cacheKey: string,
): Promise<T | null> {
  try {
    const supabase = await createClient();
    let query = supabase.from("ai_suggestion_cache").select("payload").eq("feature", feature).eq("cache_key", cacheKey);
    query = recipeId === null ? query.is("recipe_id", null) : query.eq("recipe_id", recipeId);
    // limit(1) + maybeSingle (i stedet for maybeSingle alene) – tåler at det
    // skulle finnes mer enn én rad (kun mulig i NULL-tilfellet, se over),
    // fremfor å feile på "flere rader funnet".
    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (error || !data) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function setCachedAiSuggestion<T>(
  recipeId: string | null,
  feature: AiCacheFeature,
  cacheKey: string,
  payload: T,
): Promise<void> {
  try {
    const supabase = await createClient();

    if (recipeId === null) {
      const { data: existing } = await supabase
        .from("ai_suggestion_cache")
        .select("id")
        .is("recipe_id", null)
        .eq("feature", feature)
        .eq("cache_key", cacheKey)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("ai_suggestion_cache").update({ payload: payload as unknown }).eq("id", existing.id);
      } else {
        await supabase
          .from("ai_suggestion_cache")
          .insert({ recipe_id: null, feature, cache_key: cacheKey, payload: payload as unknown });
      }
      return;
    }

    await supabase
      .from("ai_suggestion_cache")
      .upsert(
        { recipe_id: recipeId, feature, cache_key: cacheKey, payload: payload as unknown },
        { onConflict: "recipe_id,feature,cache_key" },
      );
  } catch {
    // Se filheader – caching er best-effort, aldri en hard avhengighet.
  }
}
