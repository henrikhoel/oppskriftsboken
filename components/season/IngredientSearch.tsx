"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SeasonalIngredient } from "@/lib/types";
import { searchIngredients } from "@/lib/kitchen-intelligence";
import { localizedIngredientName } from "@/lib/utils/season-format";
import { SearchIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

const MAX_RESULTS = 8;

/**
 * "NÅR ER DET I SESONG?" – råvaresøket (spesifikasjonens punkt 26-29).
 * Rent LOKALT (searchIngredients() fra lib/kitchen-intelligence er en
 * ren, synkron funksjon – ingen server-runde per tastetrykk, ingen AI).
 * Bevisst liten og integrert i den redaksjonelle siden, ikke et dominerende
 * søkefelt (punkt 26: "skal ikke være stort/dominerende").
 *
 * `groupLabelBySlug`/`statusLabelBySlug` kommer FERDIG LOKALISERT og
 * FERDIG BEREGNET fra serveren (dagens dato + effektive vinduer, se
 * computeIngredientStatus() i lib/kitchen-intelligence/seasonal.ts) – selve
 * søkefiltreringen er det eneste som skjer i klienten.
 */
export function IngredientSearch({
  allIngredients,
  groupLabelBySlug,
  statusLabelBySlug,
  isPeakBySlug,
  lang,
}: {
  allIngredients: SeasonalIngredient[];
  groupLabelBySlug: Record<string, string>;
  statusLabelBySlug: Record<string, string>;
  isPeakBySlug: Record<string, boolean>;
  lang: Lang;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchIngredients(allIngredients, query).slice(0, MAX_RESULTS);
  }, [allIngredients, query]);

  return (
    <div className="relative">
      <label htmlFor="ingredient-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        {t(lang, "season.searchHeading")}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          id="ingredient-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, "season.searchPlaceholder")}
          className="w-full rounded-full border border-line-strong bg-paper py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          autoComplete="off"
        />
      </div>

      {results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full divide-y divide-line/60 rounded-card border border-line bg-paper shadow-card-hover">
          {results.map((ingredient) => (
            <li key={ingredient.id}>
              <Link
                href={`/sesong/${ingredient.slug}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-cream-dark/40"
              >
                <span>
                  <span className="block font-serif text-base text-ink">{localizedIngredientName(ingredient, lang)}</span>
                  <span className="text-xs text-ink-faint">{groupLabelBySlug[ingredient.slug] ?? ""}</span>
                </span>
                <span
                  className={`shrink-0 text-xs font-medium uppercase tracking-[0.08em] ${
                    isPeakBySlug[ingredient.slug] ? "text-clay-dark" : "text-ink-faint"
                  }`}
                >
                  {statusLabelBySlug[ingredient.slug] ?? ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-ink-faint">{t(lang, "season.searchNoResults")}</p>
      )}
    </div>
  );
}
