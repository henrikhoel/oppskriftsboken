import type { RecipeFilters, RecipeSummary } from "@/lib/types";

/**
 * Klientsidig søk/filtrering brukt i demo-modus og som et raskt
 * "instant filter" på toppen av allerede hentede oppskrifter. Ekte
 * fulltekstsøk mot Supabase (lib/data/recipes.ts) bruker databasens
 * `search_vector`-kolonne og dette er kun et supplement/fallback.
 *
 * Støtter flerords-søk der ordene kan matche ulike felt – "kylling
 * parmesan" gir treff på en oppskrift med "kylling" i tittelen og
 * "parmesan" som ingrediens, selv om ingen av feltene inneholder begge
 * ordene.
 */

export interface SearchableRecipe extends RecipeSummary {
  /** Flatt ingrediensnavn-array, brukt kun til søk (ikke visning). */
  ingredientNames: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesQuery(recipe: SearchableRecipe, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystacks = [
    normalize(recipe.title),
    normalize(recipe.description),
    normalize(recipe.category?.name ?? ""),
    ...recipe.tags.map((t) => normalize(t.name)),
    ...recipe.ingredientNames.map(normalize),
  ];

  return words.every((word) => haystacks.some((h) => h.includes(word)));
}

export function filterRecipes(
  recipes: SearchableRecipe[],
  filters: RecipeFilters,
): SearchableRecipe[] {
  return recipes.filter((recipe) => {
    if (filters.query && !matchesQuery(recipe, filters.query)) return false;

    if (filters.categorySlug && recipe.category?.slug !== filters.categorySlug) {
      return false;
    }

    if (filters.difficulty && recipe.difficulty !== filters.difficulty) {
      return false;
    }

    if (
      filters.maxTotalTime &&
      recipe.totalTimeMinutes != null &&
      recipe.totalTimeMinutes > filters.maxTotalTime
    ) {
      return false;
    }

    if (filters.favoritesOnly && !recipe.favoritedByAdmin) {
      return false;
    }

    if (filters.ingredient) {
      const needle = normalize(filters.ingredient);
      const hasIngredient = recipe.ingredientNames.some((name) =>
        normalize(name).includes(needle),
      );
      if (!hasIngredient) return false;
    }

    return true;
  });
}
