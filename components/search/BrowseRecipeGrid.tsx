import type { RecipeSummary } from "@/lib/types";
import { BrowseRecipeCard } from "@/components/recipe/BrowseRecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Rutenettet for /oppskrifter sitt redesign (04.10.2026, se
 * BrowseRecipeCard.tsx sin filheader for hele bakgrunnen) – samme rolle som
 * RecipeGrid.tsx (tomtilstand + selve rutenettet), men BEVISST en egen,
 * parallell komponent: RecipeGrid/RecipeCard brukes fortsatt uendret andre
 * steder (favoritter, kategori-sider, forsiden, osv.), og skal IKKE påvirkes
 * av dette redesignet.
 *
 * `gap-y-8` (i stedet for WeekendGuestsClient sin `gap-y-10`) – Henrik ba
 * om "god, men relativt kompakt vertikal spacing", til forskjell fra Helg &
 * gjester sin bevisst luftigere, kuraterte 3-kolonners presentasjon.
 * Kolonnebrytningspunktene er UENDRET fra det gamle RecipeGrid.tsx
 * (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4) – Henrik:
 * "Behold 4 kolonner på desktop", og 20 pr. side / 4 kolonner = nøyaktig 5
 * rader, se paginering-logikken i BrowseRecipesClient.tsx.
 */
export function BrowseRecipeGrid({
  recipes,
  emptyTitle,
  emptyDescription,
  isAdmin = false,
  isLoggedIn = false,
  lang = "no",
}: {
  recipes: RecipeSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  lang?: Lang;
}) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon={<BookIcon className="h-10 w-10" />}
        title={emptyTitle ?? t(lang, "recipesPage.emptyTitle")}
        description={emptyDescription ?? t(lang, "recipesPage.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe, i) => (
        <BrowseRecipeCard
          key={recipe.id}
          recipe={recipe}
          priority={i < 4}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          lang={lang}
        />
      ))}
    </div>
  );
}
