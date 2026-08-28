"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { getMoodRecommendations } from "@/lib/actions/kitchen-intelligence";
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
 * redaksjonelle stil som AtmosphereSection/WinePairing over. Fem faste
 * stemninger (se lib/kitchen-intelligence/moods.ts sin filheader for
 * hvorfor de er faste, ikke fritekst); resultatet lastes først når
 * besøkende faktisk velger en stemning – ingen AI-kall bare av å laste
 * forsiden.
 *
 * Redesignet 26.08.2026 (tilbakemelding: føltes for lite/lett å scrolle
 * forbi, mindre luft over enn under teksten). Nå et tydelig, luftig bånd
 * – prøvde en stund et svakt bakgrunnsbilde her (public/images/mood-
 * section.jpg via ParallaxBackdrop, samme som AtmosphereSection), men
 * Henrik tok det tilbake samme dag ("tror det blir bedre med svart") –
 * ren mørk bakgrunn (samme bg-cream som resten av siden) igjen. Bildet og
 * ParallaxBackdrop-bruken ligger fortsatt urørt i hhv. public/images/ og
 * components/home/ hvis det skulle bli aktuelt igjen senere. py-verdien
 * er bevisst symmetrisk (samme verdi over og under), og page.tsx sin
 * påfølgende seksjon fikk sin egen toppmargin fjernet slik at luften ned
 * til "Ukens utvalg" faktisk matcher luften opp mot heroen, i stedet for
 * å dobles opp.
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
      const result = await getMoodRecommendations(moodId, lang);
      setRecipes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "moodMode.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-28 sm:py-36 lg:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
    </div>
  );
}
