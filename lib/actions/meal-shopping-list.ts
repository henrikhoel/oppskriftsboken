"use server";

import { getRecipesByIds } from "@/lib/data/recipes";
import type { IngredientGroup } from "@/lib/types";

/**
 * KOMBINERT HANDLELISTE (Fase 5 – Experience, 5.7). MealSession-slotsene
 * (se lib/kitchen-intelligence/types.ts) har kun en lett id/slug/tittel-
 * snapshot for "existing"-retter – ingen ingredienser, ingen porsjonstall.
 * Denne handlingen henter de EKTE, ferske ingredienslistene + grunn-
 * porsjonstall for et gitt sett med oppskrift-id-er, slik at klienten
 * (se components/meal/MealShoppingListSection.tsx) kan skalere hver rett
 * til menyens eget porsjonstall og legge alt inn i den delte handlelisten
 * via useShoppingList().addFromRecipe – samme underliggende
 * sammenslåingslogikk (lib/utils/shopping-list.ts) som når man legger til
 * fra en enkelt oppskriftsside, bare kalt flere ganger på rad.
 *
 * Ingen AI her – ren datahenting, derfor en egen, liten fil fremfor å
 * ligge i lib/actions/kitchen-intelligence.ts eller lib/actions/recipes.ts
 * (som er 100 % admin-gatet, se filheaderen der – dette skal være
 * tilgjengelig for alle besøkende, akkurat som resten av
 * handleliste-funksjonaliteten).
 */
export interface MealShoppingIngredients {
  recipeId: string;
  slug: string;
  title: string;
  /** Oppskriftens EGEN grunn-porsjonstall – kalleren bruker dette til å
   * regne ut skaleringsfaktoren mot menyens ønskede porsjonstall for denne
   * retten (slot.servings / baseServings), samme prinsipp som
   * RecipeInteractive.tsx bruker for én oppskrift om gangen. */
  baseServings: number;
  ingredientGroups: IngredientGroup[];
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
  }));
}
