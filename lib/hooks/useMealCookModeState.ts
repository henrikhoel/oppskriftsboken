"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

interface MealCookModeState {
  checkedTaskIds: string[];
  /** `${slotId}:${ingredientItemId}` – samme "unik på tvers av retter"-
   * prinsipp som taskId, se filheaderen under. */
  checkedIngredientIds: string[];
  currentTaskIndex: number;
}

const EMPTY_STATE: MealCookModeState = {
  checkedTaskIds: [],
  checkedIngredientIds: [],
  currentTaskIndex: 0,
};

/**
 * MENY-SCOPED speil av useCookModeState.ts (Fase 5-finale, 5.16/5.17) – helt
 * samme mønster (avhukede oppgaver + hvor langt man har kommet, persistert i
 * localStorage), men nøkkelert på `mealId` i stedet for `recipeId`, og med
 * ÉN `currentTaskIndex` som peker inn i den FLATE, kronologisk sorterte
 * `MealTaskStreamEntry[]`-listen fra computeMealTaskStream (se
 * lib/kitchen-intelligence/meal-timeline.ts) – ikke per-rett indekser. Se
 * MultiCookMode.tsx sin filheader for hvorfor dette IKKE er samme hook som
 * useCookModeState (recipeId-nøklet, én-rett-om-gangen-modell passer ikke
 * lenger når navigasjonen går på tvers av retter).
 *
 * `checkedTaskIds` bruker `taskId` (`${slotId}:${stepId}`, se
 * MealTaskStreamEntry) – allerede unik på tvers av retter, samme prinsipp
 * som checkedSteps i useCookModeState bruker step.id.
 *
 * Bevisst IKKE en generisk abstraksjon delt med useCookModeState – begge
 * hookene er små nok til at duplisering er billigere å forstå enn en tidlig
 * fellesnevner, samme linje planen for Fase 5-finale la seg på.
 */
export function useMealCookModeState(mealId: string) {
  const [state, setState, hydrated] = useLocalStorage<MealCookModeState>(
    `oppskriftsboken:mealcookmode:${mealId}`,
    EMPTY_STATE,
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      setState((prev) => ({
        ...prev,
        checkedTaskIds: prev.checkedTaskIds.includes(taskId)
          ? prev.checkedTaskIds.filter((id) => id !== taskId)
          : [...prev.checkedTaskIds, taskId],
      }));
    },
    [setState],
  );

  const toggleIngredient = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        checkedIngredientIds: prev.checkedIngredientIds.includes(id)
          ? prev.checkedIngredientIds.filter((i) => i !== id)
          : [...prev.checkedIngredientIds, id],
      }));
    },
    [setState],
  );

  const setCurrentTaskIndex = useCallback(
    (index: number) => {
      setState((prev) => ({ ...prev, currentTaskIndex: index }));
    },
    [setState],
  );

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, [setState]);

  return {
    state,
    hydrated,
    toggleTask,
    toggleIngredient,
    setCurrentTaskIndex,
    reset,
  };
}
