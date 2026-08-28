"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, RecipeFilters } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import { filterRecipes } from "@/lib/utils/search";
import { FilterPanel } from "@/components/search/FilterPanel";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { recipeCountLabel, type Lang } from "@/lib/i18n";

export function BrowseRecipesClient({
  recipes,
  categories,
  isAdmin = false,
  lang,
}: {
  recipes: SearchableRecipe[];
  categories: Category[];
  isAdmin?: boolean;
  lang: Lang;
}) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const { favoriteIds, hydrated } = useFavorites();

  const [filters, setFilters] = useState<RecipeFilters>({ query: initialQuery });

  const withGuestFavorites = useMemo(() => {
    if (!hydrated) return recipes;
    return recipes.map((r) =>
      favoriteIds.includes(r.id) ? { ...r, favoritedByAdmin: true } : r,
    );
  }, [recipes, favoriteIds, hydrated]);

  const filtered = useMemo(
    () => filterRecipes(withGuestFavorites, filters),
    [withGuestFavorites, filters],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside>
        <FilterPanel categories={categories} filters={filters} onChange={setFilters} lang={lang} />
      </aside>
      <div>
        <p className="mb-4 text-sm text-ink-faint">{recipeCountLabel(lang, filtered.length)}</p>
        <RecipeGrid recipes={filtered} isAdmin={isAdmin} lang={lang} />
      </div>
    </div>
  );
}
