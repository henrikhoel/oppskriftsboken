import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipeBySlug, getAllSlugs } from "@/lib/data/recipes";
import { getCurrentUser } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { RecipeInteractive } from "@/components/recipe/RecipeInteractive";
import { buildRecipeJsonLd } from "@/lib/utils/seo";
import { localizedTitle, localizedDescription } from "@/lib/utils/format";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [recipe, lang] = await Promise.all([getRecipeBySlug(slug), getLang()]);
  if (!recipe) return { title: lang === "en" ? "Recipe not found" : "Oppskrift ikke funnet" };

  const url = `${siteConfig.url}/oppskrifter/${recipe.slug}`;
  const title = localizedTitle(recipe, lang);
  const description = localizedDescription(recipe, lang);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images: recipe.heroImageUrl ? [{ url: recipe.heroImageUrl, width: 1200, height: 900 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: recipe.heroImageUrl ? [recipe.heroImageUrl] : undefined,
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [recipe, user, lang] = await Promise.all([getRecipeBySlug(slug), getCurrentUser(), getLang()]);

  if (!recipe) notFound();

  const jsonLd = buildRecipeJsonLd(recipe, lang);

  return (
    <article className="pb-24">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative h-[42vh] min-h-[320px] w-full overflow-hidden bg-cream-dark sm:h-[52vh]">
        {recipe.heroImageUrl ? (
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-serif text-2xl text-ink-faint">{t(lang, "recipeDetail.imagePending")}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cream/80 via-cream/20 to-transparent" />
        <Link
          href="/oppskrifter"
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-paper/90 px-3.5 py-2 text-sm font-medium text-ink shadow-card sm:left-6 sm:top-6"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t(lang, "recipeDetail.allRecipesLink")}
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <RecipeInteractive recipe={recipe} isAdmin={Boolean(user?.isAdmin)} lang={lang} />

        {recipe.source && (
          <p className="mt-10 text-xs text-ink-faint">
            {t(lang, "recipeDetail.source")}: {recipe.source}
          </p>
        )}
      </div>
    </article>
  );
}
