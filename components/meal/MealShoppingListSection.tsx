"use client";

import { useState } from "react";
import Link from "next/link";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import type { ExistingMealCourseSlot, MealCourseSlot } from "@/lib/kitchen-intelligence";
import { t, type Lang } from "@/lib/i18n";

/**
 * KOMBINERT HANDLELISTE (Fase 5 – Experience, 5.7) – ett trykk legger
 * ingrediensene fra ALLE "existing"-rettene i menyen inn i den samme delte
 * handlelisten som enkelt-oppskriftsidene bruker (useShoppingList), hver
 * skalert til sitt eget porsjonstall fra MealSession-slotten (se
 * lib/kitchen-intelligence/types.ts). "Suggested"-retter (AI-forslag som
 * ikke finnes som ekte oppskrift ennå) har ingen ingredienser å hente – de
 * telles og nevnes tydelig i stedet for å bare tie stille om dem.
 */
export function MealShoppingListSection({ slots, lang }: { slots: MealCourseSlot[]; lang: Lang }) {
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");
  const suggestedCount = slots.length - existingSlots.length;

  if (existingSlots.length === 0) {
    return (
      <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
        <h3 className="font-serif text-lg text-ink">{t(lang, "mealShopping.heading")}</h3>
        <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealShopping.noExisting")}</p>
      </div>
    );
  }

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(existingSlots.map((s) => s.recipeId));
      const byId = new Map(data.map((d) => [d.recipeId, d]));

      let added = 0;
      let skipped = 0;
      for (const slot of existingSlots) {
        const recipeData = byId.get(slot.recipeId);
        if (!recipeData || recipeData.baseServings <= 0) {
          skipped++;
          continue;
        }
        addFromRecipe(recipeData.ingredientGroups, slot.title, slot.servings / recipeData.baseServings, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: slot.servings,
        });
        added++;
      }

      setResult({ added, skipped });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "mealShopping.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealShopping.description")}</p>

      {!result && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={loading}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {loading ? t(lang, "mealShopping.loading") : t(lang, "mealShopping.button")}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {result && (
        <div className="mt-3 rounded-xl border border-olive-light bg-olive-light/30 px-4 py-3">
          <p className="text-sm text-olive-dark">{t(lang, "mealShopping.done")}</p>
          <Link href="/handleliste" className="mt-1 inline-block text-xs font-medium text-clay hover:text-clay-dark">
            {t(lang, "mealShopping.viewList")} →
          </Link>
        </div>
      )}

      {suggestedCount > 0 && (
        <p className="mt-2 text-xs italic text-ink-faint">
          {t(lang, "mealShopping.skippedSuggested", { count: suggestedCount })}
        </p>
      )}
    </div>
  );
}
