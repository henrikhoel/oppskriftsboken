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

/**
 * VISUELT REDESIGNET 04.10.2026 (Henrik: "Gjør panelet mørkere og nærmere
 * sidens svarte bakgrunn [...] Ton kraftig ned card-følelsen og bruk svært
 * subtil border/radius"). Dette er en RENT visuell omarbeiding – selve
 * filtrene, feltene og onChange-logikken under er UENDRET fra før
 * (04.10.2026-redesignet av selve "Alle oppskrifter"-gridet rørte heller
 * ikke disse), kun selve ESKEN rundt dem og FilterPill-stylingen er
 * endret:
 *
 * - `bg-cream-dark` (#191917) i stedet for `bg-paper` (#201f1c) – betydelig
 *   nærmere sidens egen `bg-cream` (#0b0b0a) enn den lysere "kort"-fargen
 *   paper var ment for. `rounded-lg` (8px) i stedet for `rounded-card`
 *   (1.1rem) – en mye mindre, mindre "boks-aktig" avrunding.
 * - Filtergruppene (kategori/tid/vanskelighetsgrad/humør/ingrediens/
 *   favoritter) er nå delt med en tynn `border-t border-line`-linje
 *   mellom hver, ikke bare luft (`space-y-5` → `space-y-6` +
 *   `pt-6`-linjer, litt mer vertikal luft enn før).
 * - FilterPill under er betydelig lettere: mindre padding, ensartet
 *   `text-xs` (ikke `sm:text-sm`-oppgradering), og en tynn `border-line`
 *   (ikke `border-line-strong`) med INGEN bakgrunnsfyll når inaktiv – rent
 *   en diskret outline mot panelets egen mørke bakgrunn. Aktiv bruker
 *   fortsatt CONVITE-gull, men samme lette `bg-clay-light text-clay-dark`-
 *   behandling som "Kun favoritter"-knappen under alltid har brukt
 *   (i stedet for forrige, tyngre `bg-clay text-cream`-fyll).
 * - "Nullstill filtre" (`hasActiveFilters` under) nullstiller ALLE feltene
 *   FilterPanel selv styrer (kategori/tid/vanskelighetsgrad/humør/
 *   favoritter/ingrediens) i ett onChange-kall, men lar `filters.query`
 *   (søketeksten, satt fra et HELT annet søkefelt, se
 *   BrowseRecipesClient.tsx) stå urørt – samme avgrensning som
 *   `activeFilterCount` i BrowseRecipesClient.tsx bruker for selve
 *   "Filtrer · N"-tallet på knappen som åpner dette panelet.
 */
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
  const hasActiveFilters = Boolean(
    filters.categorySlug ||
      filters.difficulty ||
      filters.maxTotalTime ||
      filters.mood ||
      filters.favoritesOnly ||
      filters.ingredient,
  );

  function handleReset() {
    onChange({
      ...filters,
      categorySlug: undefined,
      difficulty: undefined,
      maxTotalTime: undefined,
      mood: undefined,
      favoritesOnly: undefined,
      ingredient: undefined,
    });
  }

  return (
    <div className="rounded-lg border border-line bg-cream-dark p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
        <FilterIcon className="h-4 w-4" />
        {t(lang, "filter.heading")}
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.category")}
          </p>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="border-t border-line pt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.totalTime")}
          </p>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="border-t border-line pt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.difficulty")}
          </p>
          <div className="flex flex-wrap gap-1.5">
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

        <div className="border-t border-line pt-6">
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
          <div className="flex flex-wrap gap-1.5">
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

        <div className="border-t border-line pt-6">
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
          <div className="border-t border-line pt-6">
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
          </div>
        )}

        {hasActiveFilters && (
          <div className="border-t border-line pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "filter.reset")}
            </button>
          </div>
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
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-clay bg-clay-light text-clay-dark"
          : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
