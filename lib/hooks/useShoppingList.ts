"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { IngredientGroup, ShoppingListEntry } from "@/lib/types";
import { mergeIngredientsIntoList } from "@/lib/utils/shopping-list";

const STORAGE_KEY = "oppskriftsboken:handleliste";

export function useShoppingList() {
  const [entries, setEntries, hydrated] = useLocalStorage<ShoppingListEntry[]>(
    STORAGE_KEY,
    [],
  );

  const addFromRecipe = useCallback(
    (groups: IngredientGroup[], recipeTitle: string, servingsMultiplier = 1) => {
      setEntries((prev) =>
        mergeIngredientsIntoList(prev, groups, recipeTitle, servingsMultiplier),
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
