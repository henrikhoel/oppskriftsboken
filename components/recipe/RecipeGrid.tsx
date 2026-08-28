import type { RecipeSummary } from "@/lib/types";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function RecipeGrid({
  recipes,
  emptyTitle,
  emptyDescription,
  isAdmin = false,
  lang = "no",
}: {
  recipes: RecipeSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  isAdmin?: boolean;
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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe, i) => (
        <RecipeCard key={recipe.id} recipe={recipe} priority={i < 4} isAdmin={isAdmin} lang={lang} />
      ))}
    </div>
  );
}
