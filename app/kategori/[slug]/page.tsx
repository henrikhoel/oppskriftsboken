import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCategories } from "@/lib/data/categories";
import { getRecipesByCategory } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { t, recipeCountLabel } from "@/lib/i18n";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { localizedCategoryName } from "@/lib/utils/format";

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [categories, lang] = await Promise.all([getAllCategories(), getLang()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: t(lang, "categoryPage.notFoundTitle") };
  const name = localizedCategoryName(category, lang);
  return {
    title: name,
    description: t(lang, "categoryPage.metaDescription", { name }),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, lang] = await Promise.all([getAllCategories(), getLang()]);
  const category = categories.find((c) => c.slug === slug);

  if (!category) notFound();

  const recipes = await getRecipesByCategory(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
        {t(lang, "categoryPage.eyebrow")}
      </p>
      <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">{localizedCategoryName(category, lang)}</h1>
      <p className="mt-2 text-ink-soft">{recipeCountLabel(lang, recipes.length)}</p>
      <div className="mt-8">
        <RecipeGrid
          recipes={recipes}
          emptyTitle={t(lang, "categoryPage.emptyTitle")}
          emptyDescription={t(lang, "categoryPage.emptyDescription", { name: localizedCategoryName(category, lang) })}
          lang={lang}
        />
      </div>
    </div>
  );
}
