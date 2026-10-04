import { clsx } from "clsx";
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
 *
 * `filterOpen` (04.10.2026, runde 2 – det kollapsbare filterpanelet,
 * Henrik: "Når filterpanelet er åpent på desktop, vis 3 kolonner med
 * oppskrifter i stedet for å presse inn 4. Når filterpanelet lukkes, gå
 * tilbake til 4 kolonner") styrer KUN om `xl:grid-cols-4` legges til –
 * `lg:grid-cols-3` står uansett fra før, så med panelet åpent stopper
 * gridet rett og slett på 3 kolonner selv på xl+ (siden den 280px brede
 * <aside> da uansett har spist opp plassen den fjerde kolonnen ville
 * trengt), mens det med panelet lukket får tilbake sitt opprinnelige
 * 4-kolonners sprang på xl+. Kolonnene UNDER lg (mobil/tablet) er helt
 * uendret av `filterOpen` – se BrowseRecipesClient.tsx sin filheader for
 * hvorfor <aside> der uansett bare stables over gridet, ikke ved siden av.
 */
export function BrowseRecipeGrid({
  recipes,
  emptyTitle,
  emptyDescription,
  isAdmin = false,
  isLoggedIn = false,
  lang = "no",
  filterOpen = false,
}: {
  recipes: RecipeSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  lang?: Lang;
  filterOpen?: boolean;
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
    <div
      className={clsx(
        "grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3",
        !filterOpen && "xl:grid-cols-4",
      )}
    >
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
