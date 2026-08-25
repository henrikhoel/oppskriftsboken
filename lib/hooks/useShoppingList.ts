"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
import { mergeIngredientsIntoList } from "@/lib/utils/shopping-list";

const STORAGE_KEY = "oppskriftsboken:handleliste";

export function useShoppingList() {
  const [entries, setEntries, hydrated] = useLocalStorage<ShoppingListEntry[]>(
    STORAGE_KEY,
    [],
  );

  /** `source` (valgfri, femte arg) – strukturert sporbarhet lagt til for
   * "kombinert handleliste" (Fase 5 – Experience, 5.7, se
   * components/meal/MealShoppingListSection.tsx). Utelates kalleren den
   * (som den eksisterende enkelt-oppskrift-siden fortsatt gjør), er
   * oppførselen 100 % uendret fra før. */
  const addFromRecipe = useCallback(
    (groups: IngredientGroup[], recipeTitle: string, servingsMultiplier = 1, source?: ShoppingListSourceRef) => {
      setEntries((prev) =>
        mergeIngredientsIntoList(prev, groups, recipeTitle, servingsMultiplier, source),
      );
    },
    [setEntries],
  );

  const toggleChecked = useCallback(
    (id: string) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)),
      );
    },
    [setEntries],
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [setEntries],
  );

  const clearChecked = useCallback(() => {
    setEntries((prev) => prev.filter((e) => !e.checked));
  }, [setEntries]);

  const clearAll = useCallback(() => {
    setEntries([]);
  }, [setEntries]);

  return {
    entries,
    hydrated,
    addFromRecipe,
    toggleChecked,
    removeEntry,
    clearChecked,
    clearAll,
  };
}
