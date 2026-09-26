"use client";

import { useEffect, useMemo, useState } from "react";
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
  const queryParam = searchParams.get("q") ?? "";
  const { favoriteIds, hydrated } = useFavorites();

  const [filters, setFilters] = useState<RecipeFilters>({ query: queryParam });

  // (27.09.2026, Henrik: "når jeg er inne på 'oppskrifter' og prøver å søke
  // med feltet øverst, så skjer det ingenting. det fungerer på de andre
  // sidene, men ikke 'oppskrifter'") – filters.query ble tidligere kun satt
  // fra URL-ens ?q= ÉN gang, i useState-initialiseringen ved første mount.
  // Header sitt søkefelt (SearchBar.tsx) navigerer alltid til nettopp
  // /oppskrifter?q=... – men står man ALLEREDE på /oppskrifter er dette
  // samme rute, så BrowseRecipesClient mountes ikke på nytt, og det nye
  // søkeordet i URL-en ble derfor aldri plukket opp. Fra enhver annen side
  // fungerte det fint, siden navigasjonen dit uansett friskt monterer
  // denne komponenten. Synkroniserer nå query-feltet eksplisitt hver gang
  // selve URL-parameteren endrer seg, uten å nullstille de andre filtrene
  // (kategori/tid/vanskelighetsgrad) brukeren eventuelt allerede har satt.
  useEffect(() => {
    setFilters((prev) => (prev.query === queryParam ? prev : { ...prev, query: queryParam }));
  }, [queryParam]);

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
