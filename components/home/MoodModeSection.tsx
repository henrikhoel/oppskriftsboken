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
 */
export function MoodModeSection({ lang }: { lang: Lang }) {
  const [activeMood, setActiveMood] = useState<MoodId | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(moodId: MoodId) {
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
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-2xl text-ink sm:text-3xl">{t(lang, "moodMode.heading")}</h2>
          <p className="mt-2 text-sm text-ink-soft">{t(lang, "moodMode.intro")}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
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
