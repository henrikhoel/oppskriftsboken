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
 *
 * Gjort mye mer kompakt 31.08.2026 (tilbakemelding: "handleliste trenger
 * kun være en liten knapp. dropp boksene") – ingen egen
 * rounded-card/border-boks eller egen h3-overskrift/beskrivelse-avsnitt
 * lenger, kun selve knappen (heading/description sier ikke noe knappteksten
 * "Legg hele menyen i handlelisten" ikke allerede sier).
 */
export function MealShoppingListSection({ slots, lang }: { slots: MealCourseSlot[]; lang: Lang }) {
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");
  const suggestedCount = slots.length - existingSlots.length;

  if (existingSlots.length === 0) {
    return <p className="text-xs text-ink-faint">{t(lang, "mealShopping.noExisting")}</p>;
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
    <div>
      {!result ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={loading}
          className="rounded-full border border-line-strong bg-paper px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed"
        >
          {loading ? t(lang, "mealShopping.loading") : t(lang, "mealShopping.button")}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-olive-dark">{t(lang, "mealShopping.done")}</span>
          <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
            {t(lang, "mealShopping.viewList")} →
          </Link>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

      {suggestedCount > 0 && (
        <p className="mt-1.5 text-[11px] italic text-ink-faint">
          {t(lang, "mealShopping.skippedSuggested", { count: suggestedCount })}
        </p>
      )}
    </div>
  );
}
