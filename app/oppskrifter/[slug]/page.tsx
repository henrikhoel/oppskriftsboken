import type { Metadata } from "next";
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

      {/* Ingen full-bred, liggende heltskjerm-bildeblokk lenger (fjernet
          31.08.2026, designforbedring punkt 1/2) – selve oppskriftsbildet
          vises nå ubeskåret som del av den nye to-kolonners heroen inne i
          RecipeInteractive → RecipeHero, i samme sentrerte container som
          resten av siden. "Alle oppskrifter"-lenken flyttet hit, som en
          rolig tekstlenke over heroen i stedet for å flyte oppå et bilde.
          xl:max-w-[1280px] (var kun max-w-5xl/1024px) – finjustering
          31.08.2026: Ingredienser/Fremgangsmåte-raden (og seksjonene
          under) kjentes smale ut sammenlignet med heroen, som allerede
          bryter ut til akkurat denne bredden på store skjermer (se
          RecipeHero.tsx). Samme breddenivå her gir én sammenhengende,
          bred komposisjon i stedet for et smalt "spor" midt i en bred
          hero. Selve stegteksten i Fremgangsmåte er likevel kappet til en
          komfortabel lesebredde (max-w-prose i RecipeInteractive.tsx), så
          bare selve kolonnene/panelene – ikke brødteksten – blir bredere. */}
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:max-w-[1280px]">
        <Link
          href="/oppskrifter"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t(lang, "recipeDetail.allRecipesLink")}
        </Link>

        <div className="mt-6 sm:mt-8">
          <RecipeInteractive recipe={recipe} isAdmin={Boolean(user?.isAdmin)} lang={lang} />
        </div>

        {recipe.source && (
          <p className="mt-10 text-xs text-ink-faint">
            {t(lang, "recipeDetail.source")}: {recipe.source}
          </p>
        )}
      </div>
    </article>
  );
}
