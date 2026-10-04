"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import {
  WEEKEND_GUESTS_OCCASION_DEFINITIONS,
  ALL_OCCASIONS_FILTER,
  type WeekendGuestsOccasionFilter,
} from "@/lib/kitchen-intelligence/weekend-guests";
import { WeekendGuestsFeatured } from "@/components/weekend/WeekendGuestsFeatured";
import { WeekendGuestsCard } from "@/components/weekend/WeekendGuestsCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Filterrad + "Utvalgt" + rutenett for /helg-og-gjester (03.10.2026). Hele
 * poenget med denne klientkomponenten (til forskjell fra f.eks.
 * BrowseRecipesClient.tsx sin søk/kategori/tid/vanskelighetsgrad-rigg) er
 * HVOR LITE den gjør: ingen generering, ingen server-tur per filterklikk –
 * `recipes` kommer inn FERDIG hentet og sortert (se getWeekendGuestsRecipes
 * i lib/data/recipes.ts) fra app/helg-og-gjester/page.tsx, og selve
 * anledningsfilteret er et rent, synkront in-memory .filter() her. Henrik:
 * "Dette skal IKKE fungere som Ukesmeny. Det skal ikke genereres noe [...]
 * Det skal IKKE være noen knapp for å bekrefte filteret. Når brukeren
 * velger en kategori, filtreres rettene direkte."
 *
 * "UTVALGT" (se WeekendGuestsFeatured.tsx) er alltid den FØRSTE oppskriften
 * i det aktive filterets liste – `recipes` kommer inn sortert på
 * displayOrder (høyest/nyeste-miksede først, se getWeekendGuestsRecipes),
 * og .filter() beholder rekkefølgen, så dette er 100 % deterministisk og
 * følger "Miks rekkefølgen"-knappen på /oppskrifter (Henrik: "Velg en
 * passende rett fra det filtrerte utvalget på en enkel/deterministisk
 * måte"). Når brukeren bytter anledning, plukkes en NY førsteplass fra
 * NÅVÆRENDE filter – "Utvalgt" tilhører dermed alltid det aktive filteret,
 * akkurat som spesifisert.
 *
 * Pille-filterraden gjenbruker nøyaktig samme visuelle mønster som
 * MoodModeSection.tsx sine stemningsknapper (border-clay/bg-clay når
 * aktiv) – samme "velg direkte, ingen bekreft-knapp"-UX Henrik allerede har
 * godkjent ett annet sted i appen.
 *
 * `visible`-fade (useEffect under) er en bevisst LETT, subtil overgang ved
 * filterbytte (Henrik: "gjerne med en rolig/subtil overgang") – ingen ny
 * CSS-keyframe lagt til i globals.css for dette, kun et kort
 * opacity-0→100-step via Tailwinds innebygde transition-opacity.
 *
 * Overskriften over rutenettet (03.10.2026, Henrik: "når det er 'alle' kan
 * det stå 'Retter for helg & gjester', men hvis jeg trykker på 'Date
 * night' så må det stå 'Retter som passer til date night'") bruker
 * `weekendGuests.gridHeading.${activeOccasion}` som nøkkel direkte –
 * `activeOccasion` er typet som WeekendGuestsOccasionFilter (unionen
 * "alle" | WeekendGuestsOccasionId), så malstrengen blir en fagforening av
 * eksakt de DictKey-verdiene som finnes i dictionary.ts, ikke en generell
 * `string` – TypeScript ville klaget dersom en anledning mangler sin egen
 * gridHeading-nøkkel der.
 *
 * Rutenettet viser WEEKEND_GUESTS_GRID_PAGE_SIZE retter om gangen, med
 * "Tilbake"/"Neste"-sidenavigasjon under (04.10.2026, Henrik, etter et
 * første forsøk med en "Se alle"-knapp som avslørte ALT på én gang her:
 * "da blir det så fryktelig mange plutselig, så 'neste' [...] har man
 * trykket neste, så må man kunne gå tilbake også"). Ren client-side
 * paginering (`page`), ingen ny henting – hele `rest`-lista er allerede
 * inne, kun hvilken "side" av den som vises endres. Nullstilles til side 0
 * igjen når anledningen byttes (se useEffect under), slik at man ikke
 * lander midt i en senere side fra en tidligere anledning etter et
 * filterbytte.
 */
const WEEKEND_GUESTS_GRID_PAGE_SIZE = 6;

export function WeekendGuestsClient({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const [activeOccasion, setActiveOccasion] = useState<WeekendGuestsOccasionFilter>(ALL_OCCASIONS_FILTER);
  const [visible, setVisible] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setVisible(false);
    setPage(0);
    const timeout = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(timeout);
  }, [activeOccasion]);

  const filtered = useMemo(() => {
    if (activeOccasion === ALL_OCCASIONS_FILTER) return recipes;
    return recipes.filter((r) => (r.weekendGuestsOccasions ?? []).includes(activeOccasion));
  }, [recipes, activeOccasion]);

  const [featured, ...rest] = filtered;
  const pageCount = Math.max(1, Math.ceil(rest.length / WEEKEND_GUESTS_GRID_PAGE_SIZE));
  const visibleRest = rest.slice(page * WEEKEND_GUESTS_GRID_PAGE_SIZE, (page + 1) * WEEKEND_GUESTS_GRID_PAGE_SIZE);
  const hasPrevious = page > 0;
  const hasNext = page < pageCount - 1;

  // Bla side – samme lette, subtile fade som filterbyttet over (ikke
  // eksakt samme useEffect, siden den også skal nullstille SELVE siden ved
  // filterbytte, noe et rent sidebytte aldri skal).
  function goToPage(next: number) {
    setVisible(false);
    setPage(next);
    setTimeout(() => setVisible(true), 40);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t(lang, "weekendGuests.title")}>
        <button
          type="button"
          onClick={() => setActiveOccasion(ALL_OCCASIONS_FILTER)}
          aria-pressed={activeOccasion === ALL_OCCASIONS_FILTER}
          className={clsx(
            "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
            activeOccasion === ALL_OCCASIONS_FILTER
              ? "border-clay bg-clay text-cream"
              : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
          )}
        >
          {t(lang, "weekendGuests.occasion.alle")}
        </button>
        {WEEKEND_GUESTS_OCCASION_DEFINITIONS.map((occasion) => {
          const active = activeOccasion === occasion.id;
          return (
            <button
              key={occasion.id}
              type="button"
              onClick={() => setActiveOccasion(occasion.id)}
              aria-pressed={active}
              className={clsx(
                "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-clay bg-clay text-cream"
                  : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
              )}
            >
              {t(lang, occasion.labelKey)}
            </button>
          );
        })}
      </div>

      <div className={clsx("mt-12 transition-opacity duration-300 sm:mt-16", visible ? "opacity-100" : "opacity-0")}>
        {!featured ? (
          <p className="text-center text-sm text-ink-faint">
            {activeOccasion === ALL_OCCASIONS_FILTER
              ? t(lang, "weekendGuests.emptyGeneral")
              : t(lang, "weekendGuests.emptyForOccasion")}
          </p>
        ) : (
          <>
            <WeekendGuestsFeatured recipe={featured} lang={lang} />

            {rest.length > 0 && (
              <div className="mt-16 sm:mt-20">
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-faint">
                  {t(lang, `weekendGuests.gridHeading.${activeOccasion}`)}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleRest.map((recipe, i) => (
                    <WeekendGuestsCard key={recipe.id} recipe={recipe} priority={i < 3} lang={lang} />
                  ))}
                </div>

                {pageCount > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={!hasPrevious}
                      className="flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink-soft"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      {t(lang, "weekendGuests.gridPrevious")}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={!hasNext}
                      className="flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink-soft"
                    >
                      {t(lang, "weekendGuests.gridNext")}
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
