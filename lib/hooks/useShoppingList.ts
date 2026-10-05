"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
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

  /**
   * Manuelle varer (05.10.2026, Handleliste-redesign, punkt 6 – "Legg til
   * mulighet for at brukeren kan legge til egne varer") – f.eks. "melk",
   * "brød", "Cola Zero", "bleier". Trenger IKKE være koblet til en
   * oppskrift (fromRecipes settes derfor til en tom liste, ikke én
   * oppskrifts-tittel), og legges ALDRI til automatisk avhuket selv om
   * navnet skulle matche en kjent basisvare (se isPantryStaple i
   * lib/utils/shopping-list.ts) – i motsetning til varer som kommer fra en
   * oppskrift, er dette en EKSPLISITT handling fra brukeren om at akkurat
   * denne varen trengs nå, og skal derfor alltid starte uavhuket.
   * Dedupliseres bevisst IKKE mot eksisterende linjer (i motsetning til
   * mergeIngredientsIntoList) – holder logikken enkel og forutsigbar; en
   * sjelden duplikat er en helt vanlig linje å bare slette, langt
   * rimeligere enn en feilaktig sammenslåing av to egentlig ulike behov.
   */
  const addManualItem = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setEntries((prev) => [
        ...prev,
        {
          id: generateId(),
          amount: null,
          displayAmount: null,
          unit: null,
          name: trimmed,
          checked: false,
          fromRecipes: [],
        },
      ]);
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
    addManualItem,
    toggleChecked,
    removeEntry,
    clearChecked,
    clearAll,
  };
}
