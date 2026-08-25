"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import {
  addExistingSlot,
  addSuggestedSlot,
  createEmptyMealSession,
  markSuggestionConverted,
  removeSlot,
  renameMeal,
  replaceSlotContent,
  setMealDesiredReadyAt,
  setMealNotes,
  setSlotServings,
} from "@/lib/kitchen-intelligence/meal-session";
import type { MealCourseRole, MealSession } from "@/lib/kitchen-intelligence/types";

const INDEX_KEY = "oppskriftsboken:meals:index";

/** Trygg id-generering for en NY meny – samme fallback-mønster som
 * makeKey() i lib/admin-form-types.ts (der crypto.randomUUID ikke skulle
 * finnes i miljøet). Kalleren (f.eks. MealBuilder.tsx) genererer én id ved
 * mount (`useState(() => generateMealId())`), og bruker den til BÅDE
 * `useMealSession(id, …)` og `useMealSessionIndex().addToIndex(id)`. */
export function generateMealId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Register over hvilke MealSession-id-er denne besøkende har fra før – i
 * motsetning til RecipeSession (nøkkelert på recipeId, alltid nåbar fra
 * oppskriftssiden) finnes det ingen naturlig "adresse" en MealSession kan
 * slås opp fra, så uten dette registeret ville menyer bli uoppdagelige for
 * besøkende etter at de forlot siden de ble laget på. Lagres separat fra
 * selve menyene (`oppskriftsboken:meals:index` → liste av id-er, nyeste
 * først), samme mønster som ellers: ren localStorage, ingen database.
 *
 * IKKE koblet inn i noe UI ennå – fundament for "Dine menyer"-oversikten som
 * bygges sammen med menybyggeren (5.1–5.4).
 */
export function useMealSessionIndex() {
  const [mealIds, setMealIds, hydrated] = useLocalStorage<string[]>(INDEX_KEY, []);

  const addToIndex = useCallback(
    (id: string) => setMealIds((prev) => [id, ...prev.filter((existing) => existing !== id)]),
    [setMealIds],
  );

  const removeFromIndex = useCallback(
    (id: string) => setMealIds((prev) => prev.filter((existing) => existing !== id)),
    [setMealIds],
  );

  return { mealIds, hydrated, addToIndex, removeFromIndex };
}

/**
 * Persisterer én MealSession (se lib/kitchen-intelligence/types.ts) i
 * localStorage under `oppskriftsboken:meal:${mealId}` – samme lagringsteknikk
 * OG samme "id kommer utenfra"-mønster som useRecipeSession.ts. `mealId`
 * genereres av kalleren (f.eks. menybygger-UI-et, med crypto.randomUUID())
 * FØR denne hooken brukes første gang – finnes ingen meny under den id-en
 * fra før, oppretter hooken automatisk en ny, tom en med `initialTitle`
 * (samme "start alltid med en avledet tom økt"-oppførsel som
 * useRecipeSession, ikke `null`-tilstand å håndtere i UI-et). Husk å også
 * kalle `useMealSessionIndex().addToIndex(mealId)` når en helt ny id tas i
 * bruk, ellers blir menyen ugjenfinnbar senere (se den hookens filheader).
 */
export function useMealSession(mealId: string, initialTitle: string) {
  const initial = useMemo(
    () => createEmptyMealSession(mealId, initialTitle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mealId],
  );

  const [session, setSession, hydrated] = useLocalStorage<MealSession>(
    `oppskriftsboken:meal:${mealId}`,
    initial,
  );

  const touch = useCallback(
    (updater: (prev: MealSession) => MealSession) => {
      setSession((prev) => ({ ...updater(prev), updatedAt: new Date().toISOString() }));
    },
    [setSession],
  );

  const setTitle = useCallback((title: string) => touch((prev) => renameMeal(prev, title)), [touch]);

  const addExisting = useCallback(
    (role: MealCourseRole, recipe: { id: string; slug: string; title: string }, servings: number) =>
      touch((prev) => addExistingSlot(prev, role, recipe, servings)),
    [touch],
  );

  const addSuggested = useCallback(
    (role: MealCourseRole, suggestion: { title: string; description: string }, servings: number) =>
      touch((prev) => addSuggestedSlot(prev, role, suggestion, servings)),
    [touch],
  );

  const remove = useCallback((slotId: string) => touch((prev) => removeSlot(prev, slotId)), [touch]);

  const replaceContent = useCallback(
    (
      slotId: string,
      content: Parameters<typeof replaceSlotContent>[2],
    ) => touch((prev) => replaceSlotContent(prev, slotId, content)),
    [touch],
  );

  const setServings = useCallback(
    (slotId: string, servings: number) => touch((prev) => setSlotServings(prev, slotId, servings)),
    [touch],
  );

  const markConverted = useCallback(
    (slotId: string, recipeId: string) => touch((prev) => markSuggestionConverted(prev, slotId, recipeId)),
    [touch],
  );

  const setNotes = useCallback((notes: string) => touch((prev) => setMealNotes(prev, notes)), [touch]);

  const setDesiredReadyAt = useCallback(
    (desiredReadyAt: string | null) => touch((prev) => setMealDesiredReadyAt(prev, desiredReadyAt)),
    [touch],
  );

  return {
    session,
    hydrated,
    setTitle,
    addExisting,
    addSuggested,
    remove,
    replaceContent,
    setServings,
    markConverted,
    setNotes,
    setDesiredReadyAt,
  };
}
