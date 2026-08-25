"use client";

import { useState } from "react";
import { getMenuSuggestions, type MenuSuggestionItem } from "@/lib/actions/kitchen-intelligence";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Server det sammen med …" (Fase 4 – Smak) – besøkende ber selv om
 * menyforslag (samme knapp-trigget mønster som WineSection.tsx sin
 * vinanbefaling), i stedet for at det lastes automatisk for alle. Selve
 * forslaget er cachet server-side (getMenuSuggestions), så gjentatte
 * besøkende på samme oppskrift trigger normalt ikke et nytt AI-kall.
 */
export function MenuSuggestions({
  recipeId,
  title,
  description,
  lang,
}: {
  recipeId: string;
  title: string;
  description: string;
  lang: Lang;
}) {
  const [suggestions, setSuggestions] = useState<MenuSuggestionItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    setLoading(true);
    setError(null);
    try {
      const result = await getMenuSuggestions(recipeId, { title, description }, lang);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "menuSuggestions.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "menuSuggestions.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "menuSuggestions.intro")}</p>

      {!suggestions && (
        <button
          type="button"
          onClick={handleLoad}
          disabled={loading}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {loading ? t(lang, "menuSuggestions.loading") : t(lang, "menuSuggestions.button")}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {suggestions && suggestions.length === 0 && (
        <p className="mt-3 text-sm text-ink-faint">{t(lang, "menuSuggestions.none")}</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {suggestions.map(({ recipe, note }) => (
            <div key={recipe.id} className="flex flex-col gap-1.5">
              <RecipeCard recipe={recipe} lang={lang} />
              <p className="px-1 text-xs leading-relaxed text-ink-faint">{note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
