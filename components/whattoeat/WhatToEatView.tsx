"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { getWhatToEatSuggestions, type WhatToEatSuggestion } from "@/lib/actions/what-to-eat";
import {
  ALL_AMBITIONS,
  ALL_MEAL_OCCASIONS,
  ALL_PROTEIN_PREFERENCES,
  ALL_VIBE_FACETS,
  AMBITION_LABELS,
  MEAL_OCCASION_LABELS,
  PROTEIN_PREFERENCE_LABELS,
  VIBE_FACET_LABELS,
  type Ambition,
  type MealOccasion,
  type ProteinPreference,
  type VibeFacet,
} from "@/lib/kitchen-intelligence";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useDecisionHistory } from "@/lib/hooks/useDecisionHistory";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClockIcon, UsersIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

const inputClass =
  "w-24 rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink focus:border-clay focus:outline-none sm:text-sm";

function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function FacetRow<T extends string>({
  options,
  labels,
  value,
  onChange,
  lang,
}: {
  options: readonly T[];
  labels: Record<T, { no: string; en: string }>;
  value: T | null;
  onChange: (next: T | null) => void;
  lang: Lang;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(active ? null : option)}
            aria-pressed={active}
            className={clsx(
              "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "border-clay bg-clay text-cream"
                : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
            )}
          >
            {lang === "en" ? labels[option].en : labels[option].no}
          </button>
        );
      })}
    </div>
  );
}

/**
 * "Hva skal vi spise?" – deterministisk-først beslutningshjelper
 * (spesifikasjon punkt 1-8). Dekker BÅDE hverdags- og
 * anledningsbruk i én og samme flate (ingen egen "modus"-bryter): tid og
 * stemning dekker hverdagen, anledning+ambisjon+antall gjester dekker en
 * spesiell kveld – alle kriterier er myke bonuser i motoren (se
 * filheaderen til lib/kitchen-intelligence/what-to-eat.ts), så en
 * besøkende som bare velger ÉN ting fortsatt får gode, relevante forslag.
 * Ingen AI-kall her i det hele tatt – kun ett server action-kall mot den
 * rene rangeringsmotoren, se lib/actions/what-to-eat.ts.
 */
export function WhatToEatView({ lang }: { lang: Lang }) {
  const [vibe, setVibe] = useState<VibeFacet | null>(null);
  const [protein, setProtein] = useState<ProteinPreference | null>(null);
  const [occasion, setOccasion] = useState<MealOccasion | null>(null);
  const [ambition, setAmbition] = useState<Ambition | null>(null);
  const [availableMinutes, setAvailableMinutes] = useState("");
  const [guestCount, setGuestCount] = useState("");

  const [results, setResults] = useState<WhatToEatSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { favoriteIds } = useFavorites();
  const { historyIds, recordShown } = useDecisionHistory();

  async function handleFind(extraExclusions: string[] = []) {
    setError(null);
    setLoading(true);
    try {
      const excludeRecipeIds = Array.from(new Set([...historyIds, ...extraExclusions]));
      const suggestions = await getWhatToEatSuggestions(
        {
          vibe,
          protein,
          occasion,
          ambition,
          availableMinutes: parseIntOrNull(availableMinutes),
          guestCount: parseIntOrNull(guestCount),
          favoriteRecipeIds: favoriteIds,
          excludeRecipeIds,
        },
        lang,
        6,
      );
      setResults(suggestions);
      recordShown(suggestions.map((s) => s.recipe.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "whatToEat.error"));
    } finally {
      setLoading(false);
    }
  }

  function handleShowSomethingElse() {
    void handleFind(results?.map((r) => r.recipe.id) ?? []);
  }

  return (
    <div>
      <div className="space-y-6 rounded-card border border-line bg-paper p-5 sm:p-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {t(lang, "whatToEat.vibeLabel")}
          </p>
          <FacetRow options={ALL_VIBE_FACETS} labels={VIBE_FACET_LABELS} value={vibe} onChange={setVibe} lang={lang} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {t(lang, "whatToEat.proteinLabel")}
          </p>
          <FacetRow
            options={ALL_PROTEIN_PREFERENCES}
            labels={PROTEIN_PREFERENCE_LABELS}
            value={protein}
            onChange={setProtein}
            lang={lang}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {t(lang, "whatToEat.occasionLabel")}
          </p>
          <FacetRow
            options={ALL_MEAL_OCCASIONS}
            labels={MEAL_OCCASION_LABELS}
            value={occasion}
            onChange={setOccasion}
            lang={lang}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {t(lang, "whatToEat.ambitionLabel")}
          </p>
          <FacetRow
            options={ALL_AMBITIONS}
            labels={AMBITION_LABELS}
            value={ambition}
            onChange={setAmbition}
            lang={lang}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <ClockIcon className="h-4 w-4 text-ink-faint" />
            {t(lang, "whatToEat.minutesLabel")}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={availableMinutes}
              onChange={(e) => setAvailableMinutes(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <UsersIcon className="h-4 w-4 text-ink-faint" />
            {t(lang, "whatToEat.guestsLabel")}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleFind()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3.5 text-base font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {loading ? t(lang, "whatToEat.loading") : t(lang, "whatToEat.findButton")}
        </button>
        {error && <p className="text-sm text-clay-dark">{error}</p>}
      </div>

      {results && (
        <div className="mt-8">
          {results.length === 0 ? (
            <EmptyState title={t(lang, "whatToEat.emptyTitle")} description={t(lang, "whatToEat.emptyDescription")} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((match) => (
                  <div key={match.recipe.id} className="flex flex-col gap-2.5">
                    <RecipeCard recipe={match.recipe} lang={lang} />
                    <p className="text-sm leading-relaxed text-ink-soft">{match.reason}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleShowSomethingElse}
                disabled={loading}
                className="mt-8 text-sm font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
              >
                {t(lang, "whatToEat.showSomethingElse")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
