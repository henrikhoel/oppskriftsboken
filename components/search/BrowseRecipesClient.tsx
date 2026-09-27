"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, RecipeFilters } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import { filterRecipes } from "@/lib/utils/search";
import { FilterPanel } from "@/components/search/FilterPanel";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useAccountFavorites } from "@/lib/hooks/useAccountFavorites";
import { recipeCountLabel, type Lang } from "@/lib/i18n";

export function BrowseRecipesClient({
  recipes,
  categories,
  isAdmin = false,
  isLoggedIn = false,
  lang,
}: {
  recipes: SearchableRecipe[];
  categories: Category[];
  isAdmin?: boolean;
  /** (27.09.2026) Se FavoriteButton.tsx sin filheader. Styrer i tillegg
   * HVILKEN favorittliste "vis kun favoritter"-filteret under (filters.
   * favoritesOnly, se lib/utils/search.ts) overlagres fra – se
   * withFavoritesOverlay under. */
  isLoggedIn?: boolean;
  lang: Lang;
}) {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const { favoriteIds: guestFavoriteIds, hydrated: guestHydrated } = useFavorites();
  const { favoriteIds: accountFavoriteIds, hydrated: accountHydrated } = useAccountFavorites();

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

  // Overlag brukerens EGEN favorittliste inn i favoritedByAdmin-feltet, kun
  // for "vis kun favoritter"-filteret (filters.favoritesOnly) sin del –
  // FavoriteButton/RecipeCard bruker fortsatt isAdmin/isLoggedIn til å vise
  // riktig hjerte-status og til å skrive til riktig sted, se der. Sjekker
  // isLoggedIn (kontobasert, database) fremfor guest (localStorage) når
  // brukeren er innlogget – de to listene er separate.
  const withOwnFavorites = useMemo(() => {
    const ids = isLoggedIn ? accountFavoriteIds : guestFavoriteIds;
    const hydrated = isLoggedIn ? accountHydrated : guestHydrated;
    if (!hydrated) return recipes;
    return recipes.map((r) => (ids.includes(r.id) ? { ...r, favoritedByAdmin: true } : r));
  }, [recipes, isLoggedIn, accountFavoriteIds, accountHydrated, guestFavoriteIds, guestHydrated]);

  const filtered = useMemo(
    () => filterRecipes(withOwnFavorites, filters),
    [withOwnFavorites, filters],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside>
        <FilterPanel categories={categories} filters={filters} onChange={setFilters} lang={lang} />
      </aside>
      <div>
        <p className="mb-4 text-sm text-ink-faint">{recipeCountLabel(lang, filtered.length)}</p>
        <RecipeGrid recipes={filtered} isAdmin={isAdmin} isLoggedIn={isLoggedIn} lang={lang} />
      </div>
    </div>
  );
}
