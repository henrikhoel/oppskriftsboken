"use server";

import { getRecipesByIds } from "@/lib/data/recipes";
import type { IngredientGroup, RecipeStep } from "@/lib/types";

/**
 * DELT DATAHENTING FOR MENYER – opprinnelig kun for KOMBINERT HANDLELISTE
 * (Fase 5 – Experience, 5.7), UTVIDET 25.08.2026 til også å dekke
 * HEL-MENY-TIMELINE (5.8) sitt behov (steg + forberedelsestid), slik at
 * begge funksjonene deler ÉTT oppslag mot databasen for de samme
 * oppskriftene i stedet for to nesten identiske – i tråd med prinsippet om
 * én delt arkitektur fremfor spredte enkeltfunksjoner. Filnavnet
 * ("meal-shopping-list") gjenspeiler kun det opprinnelige formålet; flyttes
 * ikke til en egen fil for ikke å måtte be Henrik rydde bort en foreldreløs
 * fil på sin egen maskin etterpå (se sync-begrensningen: jeg kan ikke selv
 * slette filer der).
 *
 * MealSession-slotsene (se lib/kitchen-intelligence/types.ts) har kun en
 * lett id/slug/tittel-snapshot for "existing"-retter – ingen ingredienser,
 * ingen steg, ingen porsjonstall. Denne handlingen henter de EKTE, ferske
 * dataene for et gitt sett med oppskrift-id-er, slik at klienten (se
 * components/meal/MealShoppingListSection.tsx og MealTimelineSection.tsx)
 * kan skalere/regne ut riktig for menyens eget porsjonstall/tidspunkt.
 *
 * Ingen AI her – ren datahenting, derfor en egen, liten fil fremfor å
 * ligge i lib/actions/kitchen-intelligence.ts eller lib/actions/recipes.ts
 * (som er 100 % admin-gatet, se filheaderen der – dette skal være
 * tilgjengelig for alle besøkende, akkurat som resten av
 * handleliste-/timeline-funksjonaliteten).
 */
export interface MealShoppingIngredients {
  recipeId: string;
  slug: string;
  title: string;
  /** Oppskriftens EGEN grunn-porsjontall – kalleren bruker dette til å
   * regne ut skaleringsfaktoren mot menyens ønskede porsjonstall for denne
   * retten (slot.servings / baseServings), samme prinsipp som
   * RecipeInteractive.tsx bruker for én oppskrift om gangen. */
  baseServings: number;
  ingredientGroups: IngredientGroup[];
  /** Lagt til for hel-meny-timeline (5.8) – se computeMealTimeline i
   * lib/kitchen-intelligence/meal-timeline.ts. */
  steps: RecipeStep[];
  prepTimeMinutes: number | null;
}

export async function getMealShoppingIngredients(recipeIds: string[]): Promise<MealShoppingIngredients[]> {
  const uniqueIds = Array.from(new Set(recipeIds));
  if (uniqueIds.length === 0) return [];

  const recipes = await getRecipesByIds(uniqueIds);

  return recipes.map((recipe) => ({
    recipeId: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    baseServings: recipe.servings,
    ingredientGroups: recipe.ingredientGroups,
    steps: recipe.steps,
    prepTimeMinutes: recipe.prepTimeMinutes,
  }));
}
