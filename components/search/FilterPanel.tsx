"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/config";
import type { Category, RecipeFilters } from "@/lib/types";
import { FilterIcon, HeartIcon } from "@/components/ui/icons";
import { difficultyLabel, localizedCategoryName } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

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
  lang,
}: {
  categories: Category[];
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t(lang, "filter.ingredient")}
          </p>
          <input
            type="text"
            value={filters.ingredient ?? ""}
            onChange={(e) => onChange({ ...filters, ingredient: e.target.value || undefined })}
            placeholder={t(lang, "filter.ingredientPlaceholder")}
            aria-label={t(lang, "filter.ingredientAria")}
            className="w-full rounded-full border border-line-strong bg-cream px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

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
