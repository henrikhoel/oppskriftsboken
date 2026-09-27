"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { getRecipesByMood } from "@/lib/actions/recipes";
import { MOOD_DEFINITIONS, type MoodId } from "@/lib/kitchen-intelligence/moods";
import type { RecipeSummary } from "@/lib/types";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { ClockIcon, HeartIcon, StarIcon, UsersIcon, GaugeIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Ingen eksplisitt Record<MoodId, ...>-typeannotasjon her – IconProps er
// ikke eksportert fra icons.tsx, og ikonene har litt ulike (men kompatible)
// signaturer (f.eks. HeartIcon sin valgfrie `filled`-prop). `as const` lar
// TypeScript utlede riktig, kompatibel funksjonstype per nøkkel selv.
const MOOD_ICONS = {
  quick: ClockIcon,
  cozy: HeartIcon,
  impress: StarIcon,
  crowd: UsersIcon,
  healthy: GaugeIcon,
} as const;

/**
 * "Hva passer humøret ditt?" (Fase 4 – Smak) – forsideseksjon, samme
 * redaksjonelle stil som WinePairing/SeasonTeaser/ClosingQuoteSection over.
 * Fem faste stemninger (se lib/kitchen-intelligence/moods.ts sin filheader
 * for hvorfor de er faste, ikke fritekst).
 *
 * OMLAGT 26.09.2026 (Henrik: "jeg tror kanskje dette bør være noe jeg
 * velger selv inne på hver rett... da blir det ikke ai generert") – kaller
 * nå getRecipesByMood (lib/actions/recipes.ts), et rent, deterministisk
 * filter på recipes.moods (admin-satt via /admin/humor), IKKE lenger den
 * tidligere AI-baserte getMoodRecommendations. Beholder likevel
 * loading/error-tilstandene under: kallet er fortsatt en server action
 * (nettverkstur), selv om selve svaret nå er instant å regne ut når det
 * først når fram.
 *
 * Redesignet 26.08.2026 (tilbakemelding: føltes for lite/lett å scrolle
 * forbi, mindre luft over enn under teksten). Nå et tydelig, luftig bånd,
 * py-verdien bevisst symmetrisk (samme verdi over og under), og page.tsx
 * sin påfølgende seksjon fikk sin egen toppmargin fjernet slik at luften
 * ned til "Ukens utvalg" faktisk matcher luften opp mot heroen, i stedet
 * for å dobles opp.
 *
 * Bakgrunnsbilde LAGT TIL PÅ NYTT 27.09.2026 (Henrik: "neste nå er å legge
 * inn bakgrunnsbilde bak 'hva passer humøret ditt' delen") – et tidligere
 * forsøk (public/images/mood-section.jpg via ParallaxBackdrop) ble reversert
 * samme dag den kom, 26.08.2026 ("tror det blir bedre med svart"). Denne
 * gangen brukes IKKE ParallaxBackdrop (den ligger fortsatt urørt i reserve,
 * se dens egen filheader), men samme enkle CSS-background-image-teknikk som
 * WinePairing/SeasonTeaser/ClosingQuoteSection (samme kraftige
 * bg-cream-dark/80-overlegg) – nytt bilde, samme filnavn (public/images/
 * mood-section.jpg er overskrevet). Overlegget dekker HELE seksjonen,
 * inkludert det utvidbare resultat-rutenettet under stemningsknappene: den
 * mørke overlegg-fargen (#191917 @ 80%) er så nær identisk med sidens egen
 * bg-cream (#0b0b0a) at oppskriftskortene (som allerede er designet for å
 * sitte på en mørk bakgrunn) ser like riktige ut her som andre steder på
 * siden, uansett hvor mange rader resultatet vokser til.
 */
export function MoodModeSection({ lang }: { lang: Lang }) {
  const [activeMood, setActiveMood] = useState<MoodId | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(moodId: MoodId) {
    // Trykker man på den ALLEREDE aktive stemningen igjen, "unclicker" man
    // den – lukker resultatet i stedet for å hente det på nytt. Matcher
    // aria-pressed-oppførselen knappen allerede annonserer (en toggle-knapp,
    // ikke en ren "velg"-knapp).
    if (activeMood === moodId) {
      setActiveMood(null);
      setRecipes(null);
      setError(null);
      setLoading(false);
      return;
    }

    setActiveMood(moodId);
    setRecipes(null);
    setError(null);
    setLoading(true);
    try {
      const result = await getRecipesByMood(moodId);
      setRecipes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "moodMode.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative isolate overflow-hidden bg-cream-dark py-28 sm:py-36 lg:py-40">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/mood-section.jpg)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-cream-dark/80" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-4xl text-ink sm:text-5xl">{t(lang, "moodMode.heading")}</h2>
          <p className="mt-3 text-base text-ink-soft">{t(lang, "moodMode.intro")}</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {MOOD_DEFINITIONS.map((mood) => {
            const Icon = MOOD_ICONS[mood.id];
            const active = activeMood === mood.id;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => handlePick(mood.id)}
                aria-pressed={active}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-clay bg-clay text-cream"
                    : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(lang, mood.labelKey)}
              </button>
            );
          })}
        </div>

        {activeMood && (
          <div className="mt-8">
            {loading && <p className="text-center text-sm text-ink-faint">{t(lang, "moodMode.loading")}</p>}
            {!loading && error && <p className="text-center text-sm text-clay-dark">{error}</p>}
            {!loading && recipes && recipes.length === 0 && (
              <p className="text-center text-sm text-ink-faint">{t(lang, "moodMode.none")}</p>
            )}
            {!loading && recipes && recipes.length > 0 && <RecipeGrid recipes={recipes} lang={lang} />}
          </div>
        )}
      </div>
    </section>
  );
}
