import { Suspense } from "react";
import type { Metadata } from "next";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getAllCategories } from "@/lib/data/categories";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { BrowseRecipesClient } from "@/components/search/BrowseRecipesClient";
import { RecipeCardSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "recipesPage.title"),
    description: t(lang, "recipesPage.metaDescription"),
  };
}

export default async function RecipesPage() {
  const [recipes, categories, lang] = await Promise.all([
    getSearchableRecipes(),
    getAllCategories(),
    getLang(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "recipesPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "recipesPage.description")}</p>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <BrowseRecipesClient recipes={recipes} categories={categories} lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
