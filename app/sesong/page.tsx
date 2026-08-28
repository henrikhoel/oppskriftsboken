import type { Metadata } from "next";
import { getAllSeasonsWithIngredients, getAllSeasonalIngredientsFlat } from "@/lib/data/seasons";
import { getSearchableRecipes } from "@/lib/data/recipes";
import {
  computeIngredientStatus,
  findRecipesForIngredient,
  groupIngredientsByOriginGroup,
  resolveCurrentSeason,
  resolveIngredientsForSeasonPage,
} from "@/lib/kitchen-intelligence/seasonal";
import { SeasonList } from "@/components/season/SeasonList";
import { SeasonIngredientList } from "@/components/season/SeasonIngredientList";
import { IngredientSearch } from "@/components/season/IngredientSearch";
import { localizedSeasonIntro, localizedSeasonName, ingredientStatusLabel, originGroupLabel } from "@/lib/utils/season-format";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "seasonPage.title"),
    description: t(lang, "seasonPage.metaDescription"),
  };
}

/**
 * "I sesong" – forside for den strukturerte, redaksjonelle
 * sesonginnholdslaget, oppgradert 28.08.2026 til en komplett,
 * kildebasert råvareguide (se plan-dokumentet i sesjonens historikk for
 * hele spesifikasjonen). Viser hvilken sesong det er NÅ (ren datoregning,
 * ingen AI), råvarene som hører hjemme på den sesongsiden gruppert
 * redaksjonelt (FRA HAVET/SKOGEN/JORDA/HAGEN/BEITE, kun grupper som faktisk
 * har innhold), et lite lokalt råvaresøk, og en rolig indeksliste over de
 * andre sesongene. Bevisst progressive disclosure (spesifikasjonens punkt
 * 1/19): kun navn + evt. peak-merke her, all dybde (måneder, hvorfor,
 * kilde, oppskrifter) ligger på selve råvaresiden – én klikk unna.
 */
export default async function SeasonIndexPage() {
  const [lang, seasonsWithIngredients, allIngredients, recipes] = await Promise.all([
    getLang(),
    getAllSeasonsWithIngredients(),
    getAllSeasonalIngredientsFlat(),
    getSearchableRecipes(),
  ]);

  const now = new Date();
  const currentSeason = resolveCurrentSeason(seasonsWithIngredients, now);

  const pageIngredients = currentSeason
    ? resolveIngredientsForSeasonPage(currentSeason, allIngredients, now)
    : [];
  const groups = groupIngredientsByOriginGroup(pageIngredients);

  // Samme prinsipp som app/sesong/[slug]/page.tsx: avgrenset til råvarene
  // som faktisk vises her, regnet ut server-side for den inline utvidbare
  // råvaredetaljen i SeasonIngredientList (se filheaderen der).
  const recipesByIngredientId: Record<string, typeof recipes> = {};
  for (const { ingredient } of pageIngredients) {
    recipesByIngredientId[ingredient.id] = findRecipesForIngredient(recipes, ingredient);
  }

  const otherSeasons = seasonsWithIngredients.filter((season) => season.id !== currentSeason?.id);

  // Grunnlag for det lokale råvaresøket (spesifikasjonens punkt 26/27) –
  // status/gruppe-etiketter beregnes HER (server-side, med dagens dato) og
  // sendes ned som ferdig lokaliserte, ferdig beregnede strenger. Selve
  // søkefiltreringen skjer likevel rent lokalt i klienten (searchIngredients
  // fra den klient-trygge kitchen-intelligence-barrelen), ingen AI og ingen
  // server-runde per tastetrykk.
  const seasonMonthsById = new Map(seasonsWithIngredients.map((s) => [s.id, s.months]));
  const groupLabelBySlug: Record<string, string> = {};
  const statusLabelBySlug: Record<string, string> = {};
  const isPeakBySlug: Record<string, boolean> = {};
  for (const ingredient of allIngredients) {
    const homeMonths = seasonMonthsById.get(ingredient.seasonId) ?? [];
    const status = computeIngredientStatus(ingredient, homeMonths, now);
    groupLabelBySlug[ingredient.slug] = originGroupLabel(ingredient.originGroup, lang);
    statusLabelBySlug[ingredient.slug] = ingredientStatusLabel(ingredient, status, lang) ?? "";
    isPeakBySlug[ingredient.slug] = status.kind === "peak";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">{t(lang, "seasonPage.eyebrow")}</p>

      {currentSeason ? (
        <>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{localizedSeasonName(currentSeason, lang)}</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">{localizedSeasonIntro(currentSeason, lang)}</p>
        </>
      ) : (
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{t(lang, "seasonPage.title")}</h1>
      )}

      <div className="mt-8 max-w-sm">
        <IngredientSearch
          allIngredients={allIngredients}
          groupLabelBySlug={groupLabelBySlug}
          statusLabelBySlug={statusLabelBySlug}
          isPeakBySlug={isPeakBySlug}
          lang={lang}
        />
      </div>

      <div className="mt-10">
        {groups.length > 0 ? (
          // isLiveSeason er alltid true her – denne siden viser per definisjon
          // KUN currentSeason (den vi faktisk er i nå), se lib/utils/season-format.ts
          // sin ingredientStatusLabel()-filheader for hvorfor dette skillet finnes.
          <SeasonIngredientList
            groups={groups}
            lang={lang}
            allSeasons={seasonsWithIngredients}
            recipesByIngredientId={recipesByIngredientId}
            isLiveSeason
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
    </div>
  );
}
