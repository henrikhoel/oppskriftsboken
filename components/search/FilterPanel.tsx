"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/config";
import type { Category, RecipeFilters } from "@/lib/types";
import { MOOD_DEFINITIONS } from "@/lib/kitchen-intelligence/moods";
import { FilterIcon, HeartIcon, ClockIcon, StarIcon, UsersIcon, GaugeIcon, SparklesIcon } from "@/components/ui/icons";
import { difficultyLabel, localizedCategoryName } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

// Samme ikonsett/mønster som MOOD_ICONS i MoodModeSection.tsx (forsiden) –
// duplisert her fremfor delt, samme "små ikonkart dupliseres per
// komponent"-konvensjon som STYLE_ICONS/OCCASION_ICONS andre steder i
// appen. HeartIcon er allerede importert over (brukes også av "vis kun
// favoritter"-knappen under), gjenbrukt her for "cozy".
const MOOD_ICONS = {
  quick: ClockIcon,
  cozy: HeartIcon,
  impress: StarIcon,
  crowd: UsersIcon,
  healthy: GaugeIcon,
  tasty: SparklesIcon,
} as const;

const TIME_OPTIONS = [
  { key: "filter.all" as const, value: undefined },
  { key: "filter.timeUnder30" as const, value: 30 },
  { key: "filter.timeUnder45" as const, value: 45 },
  { key: "filter.timeUnder60" as const, value: 60 },
];

export function FilterPanel({
  categories,
  filters,
  onChange,
  canFavorite = false,
  lang,
}: {
  categories: Category[];
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  /** (27.09.2026) isAdmin || isLoggedIn fra kalleren – "vis kun
   * favoritter"-filteret under gir ingen mening for en ikke-innlogget
   * besøkende nå som favoritter er 100 % kontoeksklusivt (ingen hjerte å
   * filtrere på i det hele tatt, se FavoriteButton.tsx sin filheader). */
  canFavorite?: boolean;
  lang: Lang;
}) {
  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
        <FilterIcon className="h-4 w-4" />
        {t(lang, "filter.heading")}
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.category")}
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={!filters.categorySlug}
              onClick={() => onChange({ ...filters, categorySlug: undefined })}
            >
              {t(lang, "filter.all")}
            </FilterPill>
            {categories.map((cat) => (
              <FilterPill
                key={cat.id}
                active={filters.categorySlug === cat.slug}
                onClick={() => onChange({ ...filters, categorySlug: cat.slug })}
              >
                {localizedCategoryName(cat, lang)}
              </FilterPill>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.totalTime")}
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((opt) => (
              <FilterPill
                key={opt.key}
                active={filters.maxTotalTime === opt.value}
                onClick={() => onChange({ ...filters, maxTotalTime: opt.value })}
              >
                {t(lang, opt.key)}
              </FilterPill>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.difficulty")}
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={!filters.difficulty}
              onClick={() => onChange({ ...filters, difficulty: undefined })}
            >
              {t(lang, "filter.all")}
            </FilterPill>
            {DIFFICULTY_LEVELS.map((level: Difficulty) => (
              <FilterPill
                key={level}
                active={filters.difficulty === level}
                onClick={() => onChange({ ...filters, difficulty: level })}
              >
                {difficultyLabel(level, lang)}
              </FilterPill>
            ))}
          </div>
        </div>

        <div>
          {/* Humør-filter (03.10.2026, Henrik: "legg inn humør som en
              filter inne på Alle oppskrifter [...] kan trykke 'se alle' og
              da kommer man inn på 'Alle oppskrifter' siden hvor humøret
              allerede er valgt som filter") – se RecipeFilters.mood sin
              filheader i lib/types.ts og "Se alle"-lenken i
              MoodModeSection.tsx som forhåndsutfyller nettopp dette
              filteret via ?mood=<id> i URL-en. */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.mood")}
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={!filters.mood} onClick={() => onChange({ ...filters, mood: undefined })}>
              {t(lang, "filter.all")}
            </FilterPill>
            {MOOD_DEFINITIONS.map((mood) => {
              const Icon = MOOD_ICONS[mood.id];
              return (
                <FilterPill
                  key={mood.id}
                  active={filters.mood === mood.id}
                  onClick={() => onChange({ ...filters, mood: mood.id })}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {t(lang, mood.labelKey)}
                  </span>
                </FilterPill>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.ingredient")}
          </p>
          <input
            type="text"
            value={filters.ingredient ?? ""}
            onChange={(e) => onChange({ ...filters, ingredient: e.target.value || undefined })}
            placeholder={t(lang, "filter.ingredientPlaceholder")}
            aria-label={t(lang, "filter.ingredientAria")}
            // text-base på mobil (unngår iOS-innzooming ved fokus).
            className="w-full rounded-full border border-line-strong bg-cream px-4 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
          />
        </div>

        {canFavorite && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
            aria-pressed={Boolean(filters.favoritesOnly)}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
              filters.favoritesOnly
                ? "border-clay bg-clay-light text-clay-dark"
                : "border-line-strong text-ink-soft hover:bg-cream-dark",
            )}
          >
            <HeartIcon filled={filters.favoritesOnly} className="h-4 w-4" />
            {t(lang, "filter.favoritesOnly")}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
        active
          ? "border-clay bg-clay text-cream"
          : "border-line-strong bg-cream text-ink-soft hover:bg-cream-dark",
      )}
    >
      {children}
    </button>
  );
}
