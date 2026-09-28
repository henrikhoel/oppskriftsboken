"use client";

/**
 * AUTOMATISK UKESMENY (29.09.2026) – sentrert rundt Henriks krav (se
 * prosjektnotatet "plan-brukerkontoer.md", avsnittet om automatisk
 * ukesmeny + handleliste): fem tilfeldige, UNIKE middager for
 * mandag–fredag, trukket kun blant publiserte oppskrifter som IKKE er
 * merket "utelatt" i /admin/ukesmeny (se WeeklyMenuExclusionPicker.tsx og
 * migrasjon 0024). Ingen AI involvert – ren tilfeldig trekning uten
 * tilbakelegging (Fisher–Yates), akkurat nok til å garantere fem
 * forskjellige retter.
 *
 * Uken lagres i localStorage (samme mønster som useShoppingList.ts) slik
 * at den ikke bytter seg selv ut ved hver sideoppdatering – kun når
 * besøkende selv trykker "Generer ny uke", ELLER når en tidligere valgt
 * oppskrift ikke lenger finnes i den kvalifiserte poolen (avpublisert,
 * slettet, eller nylig merket "utelatt" av Henrik) – da regenereres uken
 * automatisk og stille, siden den lagrede referansen uansett ikke lenger
 * er gyldig.
 *
 * Handlelistedelen gjenbruker EKSAKT samme mønster som
 * MealShoppingListSection.tsx (kombinert handleliste for en manuell
 * meny): getMealShoppingIngredients() for å hente ferske
 * ingrediens-/porsjonsdata for de fem oppskrift-id-ene, og
 * mergeIngredientsIntoList() (via useShoppingList sin addFromRecipe) for
 * selve sammenslåingen – ingen ny sammenslåingslogikk skrevet her, kun
 * gjenbruk, siden begge stedene løser nøyaktig det samme problemet
 * (flere oppskrifter → én handleliste med summerte mengder og strøkne
 * basisvarer).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { ShoppingBagIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import type { SearchableRecipe } from "@/lib/utils/search";
import { t, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "oppskriftsboken:ukesmeny";
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const MIN_RECIPES = DAY_KEYS.length;

function pickRandomWeek(pool: SearchableRecipe[]): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, MIN_RECIPES).map((r) => r.id);
}

export function WeeklyMenuView({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  const [recipeIds, setRecipeIds, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, []);
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const hasEnoughRecipes = recipes.length >= MIN_RECIPES;
  const storedIsValid = recipeIds.length === MIN_RECIPES && recipeIds.every((id) => byId.has(id));

  // Regenerer stille hvis den lagrede uken er tom, ufullstendig, eller
  // inneholder en oppskrift som ikke lenger er kvalifisert – se filheader.
  useEffect(() => {
    if (!hydrated || !hasEnoughRecipes || storedIsValid) return;
    setRecipeIds(pickRandomWeek(recipes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasEnoughRecipes, storedIsValid]);

  function handleRegenerate() {
    setAdded(false);
    setRecipeIds(pickRandomWeek(recipes));
  }

  async function handleAddToShoppingList() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(recipeIds);
      const dataById = new Map(data.map((d) => [d.recipeId, d]));
      for (const id of recipeIds) {
        const recipeData = dataById.get(id);
        if (!recipeData || recipeData.baseServings <= 0) continue;
        addFromRecipe(recipeData.ingredientGroups, recipeData.title, 1, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: recipeData.baseServings,
        });
      }
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!hasEnoughRecipes) {
    return (
      <p className="rounded-card border border-line bg-paper px-5 py-4 text-sm text-ink-soft">
        {t(lang, "weeklyMenu.notEnoughRecipes", { count: MIN_RECIPES })}
      </p>
    );
  }

  if (!hydrated || !storedIsValid) {
    return <p className="text-sm text-ink-faint">…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={handleRegenerate}>
          {t(lang, "weeklyMenu.regenerate")}
        </Button>

        <div>
          {!added ? (
            <button
              type="button"
              onClick={handleAddToShoppingList}
              disabled={loading}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              {loading ? t(lang, "weeklyMenu.addLoading") : t(lang, "weeklyMenu.addButton")}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-olive-dark">{t(lang, "weeklyMenu.addDone")}</span>
              <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
                {t(lang, "weeklyMenu.viewList")} →
              </Link>
            </div>
          )}
          {error && <p className="mt-1.5 text-xs text-clay-dark">{error}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {recipeIds.map((id, index) => {
          const recipe = byId.get(id);
          const dayKey = DAY_KEYS[index];
          if (!recipe) return null;
          return (
            <div key={`${dayKey}-${id}`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                {t(lang, `weeklyMenu.${dayKey}`)}
              </p>
              {/* isLoggedIn hardkodet true – denne komponenten rendres kun
                  når bruker er innlogget, se gatingen i app/ukesmeny/page.tsx,
                  samme prinsipp som isLoggedIn={Boolean(user)} på
                  /oppskrifter. Så hjertet bruker kontobasert favoritt, ikke
                  gjeste-varianten. */}
              <RecipeCard recipe={recipe} lang={lang} isLoggedIn />
            </div>
          );
        })}
      </div>
    </div>
  );
}
