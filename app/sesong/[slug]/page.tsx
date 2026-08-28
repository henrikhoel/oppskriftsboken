import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllPublishedSeasons,
  getAllSeasonalIngredientsFlat,
  getPublishedSeasonalIngredientBySlug,
  getSeasonBySlugWithIngredients,
} from "@/lib/data/seasons";
import { getSearchableRecipes } from "@/lib/data/recipes";
import {
  findRecipesForIngredient,
  groupIngredientsByOriginGroup,
  resolveCurrentSeason,
  resolveIngredientsForSeasonPage,
} from "@/lib/kitchen-intelligence/seasonal";
import { SeasonIngredientList } from "@/components/season/SeasonIngredientList";
import { SeasonList } from "@/components/season/SeasonList";
import { IngredientDetail } from "@/components/season/IngredientDetail";
import {
  localizedIngredientDescription,
  localizedIngredientName,
  localizedSeasonIntro,
  localizedSeasonName,
  seasonMonthRangeLabel,
} from "@/lib/utils/season-format";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

/**
 * Dual-purpose-ruting for "I sesong" (spesifikasjonens punkt 21: flate
 * URL-er som /sesong/blaskjell, ikke en egen /sesong/ravare/[slug]-gren).
 * Prøver sesong-slug FØRST (bevarer alle eksisterende sesong-URL-er
 * uendret), deretter råvare-slug, og gir 404 hvis ingen av delene treffer.
 * Slug er unikt PÅ TVERS av sesonger og råvarer samlet (håndhevet i
 * lib/validation/season-schema.ts sin ensureUniqueSlug-bruk i
 * lib/actions/seasons.ts), så det er aldri reell tvetydighet om hvilken av
 * de to en gitt slug peker til.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [season, lang] = await Promise.all([getSeasonBySlugWithIngredients(slug), getLang()]);

  if (season) {
    const title = localizedSeasonName(season, lang);
    const description = localizedSeasonIntro(season, lang);
    const url = `${siteConfig.url}/sesong/${season.slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: "article", title, description, url },
    };
  }

  const ingredient = await getPublishedSeasonalIngredientBySlug(slug);
  if (ingredient) {
    const title = localizedIngredientName(ingredient, lang);
    const description = localizedIngredientDescription(ingredient, lang) ?? title;
    const url = `${siteConfig.url}/sesong/${ingredient.slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: "article", title, description, url },
    };
  }

  return { title: t(lang, "recipeNotFound.title") };
}

export default async function SeasonOrIngredientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [season, lang] = await Promise.all([getSeasonBySlugWithIngredients(slug), getLang()]);

  if (season) {
    const [allIngredients, allSeasons, recipes] = await Promise.all([
      getAllSeasonalIngredientsFlat(),
      getAllPublishedSeasons(),
      getSearchableRecipes(),
    ]);

    const now = new Date();
    const currentSeason = resolveCurrentSeason(allSeasons, now);
    const isCurrent = currentSeason?.id === season.id;

    const pageIngredients = resolveIngredientsForSeasonPage(season, allIngredients, now);
    const groups = groupIngredientsByOriginGroup(pageIngredients);

    // "Andre sesonger" (Henriks eksplisitte ønske 28.08.2026): denne listen
    // fantes FØR kun på /sesong-forsiden (app/sesong/page.tsx), ikke her på
    // den enkelte sesongsiden – som gjorde det tungvint å bla videre til en
    // ANNEN sesong (f.eks. Høst, der blåskjell hører hjemme) uten å gå
    // tilbake til forsiden først. Ekskluderer DENNE sesongen (`season`),
    // ikke nødvendigvis dagens (`currentSeason`) – de to er ofte samme, men
    // begrepsmessig forskjellige (se `isCurrent` over).
    const otherSeasons = allSeasons.filter((s) => s.id !== season.id);

    // Regnet ut HER (server-side) i stedet for i klienten – én, avgrenset
    // datamengde (kun råvarene som faktisk vises på DENNE sesongsiden, ikke
    // hele oppskrifts-/råvaredatasettet) sendes ned til den klientrenderte
    // SeasonIngredientList, som trenger dette for den inline utvidbare
    // råvaredetaljen (se filheaderen der).
    const recipesByIngredientId: Record<string, typeof recipes> = {};
    for (const { ingredient } of pageIngredients) {
      recipesByIngredientId[ingredient.id] = findRecipesForIngredient(recipes, ingredient);
    }

    return (
      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/sesong"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t(lang, "seasonPage.backToIndex")}
        </Link>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">{localizedSeasonName(season, lang)}</h1>
          {isCurrent && (
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-clay-dark">
              {t(lang, "seasonPage.currentBadge")}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-faint">{seasonMonthRangeLabel(season.months, lang)}</p>
        <p className="mt-4 max-w-2xl text-ink-soft">{localizedSeasonIntro(season, lang)}</p>

        <div className="mt-10">
          {groups.length > 0 ? (
            <SeasonIngredientList
              groups={groups}
              lang={lang}
              allSeasons={allSeasons}
              recipesByIngredientId={recipesByIngredientId}
              isLiveSeason={isCurrent}
            />
          ) : (
            <p className="py-6 text-sm text-ink-faint">{t(lang, "seasonPage.noneNow")}</p>
          )}
        </div>

        {otherSeasons.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
              {t(lang, "seasonPage.otherSeasonsHeading")}
            </h2>
            <SeasonList seasons={otherSeasons} lang={lang} />
          </div>
        )}
      </article>
    );
  }

  const ingredient = await getPublishedSeasonalIngredientBySlug(slug);
  if (!ingredient) notFound();

  const [allSeasons, recipes] = await Promise.all([getAllPublishedSeasons(), getSearchableRecipes()]);
  const homeSeason = allSeasons.find((s) => s.id === ingredient.seasonId);
  if (!homeSeason) notFound();

  const ingredientRecipes = findRecipesForIngredient(recipes, ingredient);

  return <IngredientDetail ingredient={ingredient} homeSeason={homeSeason} recipes={ingredientRecipes} lang={lang} />;
}
