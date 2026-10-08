"use server";

import { getSearchableRecipes } from "@/lib/data/recipes";

/**
 * "vi må legge til sånn at alternativer kommer opp når jeg skriver noe
 * her" (08.10.2026, Henrik, om forsidens søkefelt – skjermbilde av å
 * skrive "svensk" uten at "Svenske kjøttboller" dukket opp som forslag) –
 * lett tittel+slug-liste til SearchBar.tsx sin type-ahead-nedtrekksliste.
 *
 * Gjenbruker den allerede unstable_cache()-cachede getSearchableRecipes()
 * (lib/data/recipes.ts, samme delte liste som /oppskrifter sitt eget
 * søk/filter bruker) – ingen ny database-spørring, kun en tynnere
 * projeksjon av noe som allerede hentes/caches. Henter HELE listen (300+)
 * i ett kall ved FØRSTE fokus i SearchBar.tsx (ikke på hvert tastetrykk) –
 * oppskriftsantallet er lite nok til at én liten, cachet nedlasting er
 * billigere og mer responsiv enn en debounce-rundtur til serveren for
 * hvert tastetrykk.
 */
export interface RecipeSearchSuggestion {
  title: string;
  slug: string;
}

export async function getRecipeSearchSuggestions(): Promise<RecipeSearchSuggestion[]> {
  const recipes = await getSearchableRecipes();
  return recipes.map((r) => ({ title: r.title, slug: r.slug }));
}
