"use client";

import { useMemo } from "react";
import type { RecipeSummary } from "@/lib/types";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeartIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function GuestFavoritesGrid({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const { favoriteIds, hydrated } = useFavorites();

  const favorites = useMemo(
    () => recipes.filter((r) => favoriteIds.includes(r.id)),
    [recipes, favoriteIds],
  );

  if (!hydrated) {
    return null;
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={<HeartIcon className="h-10 w-10" />}
        title={t(lang, "favoritesPage.guestEmptyTitle")}
        description={t(lang, "favoritesPage.guestEmptyDescription")}
      />
    );
  }

  return <RecipeGrid recipes={favorites} lang={lang} />;
}
