"use server";

import { getSearchableRecipes } from "@/lib/data/recipes";
import { matchesQuery, type SearchableRecipe } from "@/lib/utils/search";

/**
 * Lett, inline oppskriftssøk brukt av "Finn vin til maten"-fanen i
 * forsidens Mat & vin-seksjon (components/home/WinePairing.tsx) – en
 * enkel autocomplete-liste mens gjesten skriver, i stedet for å navigere
 * til /oppskrifter slik hoved-søkefeltet gjør (se components/search/
 * SearchBar.tsx). Gjenbruker samme fritekst-matching som resten av siden
 * (lib/utils/search.ts), bare begrenset til få treff og et lettvekts
 * resultat-shape.
 */
export async function searchRecipesForPicker(query: string): Promise<SearchableRecipe[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const searchable = await getSearchableRecipes();
  return searchable.filter((r) => matchesQuery(r, trimmed)).slice(0, 6);
}
