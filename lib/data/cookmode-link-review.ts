import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { CookModeLinkStatus } from "@/lib/utils/cookmode-link-status";

/**
 * Lese-laget for Cook Mode-koblings-kø-visningen (07.10.2026, se
 * migrasjon 0033_recipe_cookmode_link_review.sql og
 * components/admin/CookModeLinkReviewBoard.tsx). Samme konvensjon som
 * lib/data/recipes.ts: rene lesefunksjoner uten "use server"/requireAdmin
 * – beskyttet av admin-layouten (app/admin/(dashboard)/layout.tsx), som
 * allerede blokkerer HELE /admin-treet i demo-modus og for ikke-admins.
 *
 * BEVISST uten demo-modus-fallback (til forskjell fra resten av
 * lib/data/recipes.ts) – admin-layouten rendrer aldri denne sidens
 * children når Supabase ikke er konfigurert (se "Admin er utilgjengelig i
 * demo-modus"-skjermen der), så en fallback her ville aldri faktisk blitt
 * nådd i praksis. isSupabaseConfigured-sjekken er likevel med, som et
 * siste sikkerhetsnett mot en tom liste fremfor en kastet feil.
 */
export interface CookModeLinkQueueItem {
  id: string;
  slug: string;
  title: string;
  /** null = batch har ikke kjørt for denne oppskriften ennå. */
  status: CookModeLinkStatus | null;
  linkedStepCount: number;
  totalStepCount: number;
}

interface QueueRow {
  id: string;
  slug: string;
  title: string;
  cook_mode_link_status: CookModeLinkStatus | null;
  recipe_steps: { id: string; ingredient_item_ids: string[] }[] | null;
}

/**
 * Lett spørring (ingen ingrediensdata, ingen bilder/tags/kategori – se
 * RECIPE_SELECT i lib/data/mappers.ts for den TUNGE varianten brukt av
 * vanlig admin-redigering) for selve kø-/filter-listen i
 * CookModeLinkReviewBoard.tsx. "X av Y steg koblet" leses direkte av
 * recipe_steps her i stedet for å mellomlagre et tall i
 * cook_mode_link_suggestions – alltid i sync med den LEVENDE
 * recipe_steps.ingredient_item_ids, uavhengig av om admin har endret noe
 * via den vanlige oppskrift-editoren (RecipeForm.tsx/StepsEditor.tsx) siden
 * sist batch kjørte.
 */
export async function getCookModeLinkQueue(): Promise<CookModeLinkQueueItem[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, slug, title, cook_mode_link_status, recipe_steps(id, ingredient_item_ids)")
    .order("title", { ascending: true });

  if (error || !data) {
    console.error("Kunne ikke hente Cook Mode-koblingskøen:", error?.message);
    return [];
  }

  return (data as unknown as QueueRow[]).map((row) => {
    const steps = row.recipe_steps ?? [];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.cook_mode_link_status,
      linkedStepCount: steps.filter((s) => (s.ingredient_item_ids ?? []).length > 0).length,
      totalStepCount: steps.length,
    };
  });
}
