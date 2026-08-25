"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

interface CookModeState {
  checkedIngredients: string[];
  checkedSteps: string[];
  currentStepIndex: number;
}

const EMPTY_STATE: CookModeState = {
  checkedIngredients: [],
  checkedSteps: [],
  currentStepIndex: 0,
};

/**
 * Persisterer avhukede ingredienser/steg og hvor langt man har kommet i
 * Cook Mode, per oppskrift, i localStorage. Slik kan man forlate appen
 * (f.eks. et telefonoppkall midt i matlagingen) og fortsette der man slapp.
 */
export function useCookModeState(recipeId: string) {
  const [state, setState, hydrated] = useLocalStorage<CookModeState>(
    `oppskriftsboken:cookmode:${recipeId}`,
    EMPTY_STATE,
  );

  const toggleIngredient = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        checkedIngredients: prev.checkedIngredients.includes(id)
          ? prev.checkedIngredients.filter((i) => i !== id)
          : [...prev.checkedIngredients, id],
      }));
    },
    [setState],
  );

  const toggleStep = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        checkedSteps: prev.checkedSteps.includes(id)
          ? prev.checkedSteps.filter((i) => i !== id)
          : [...prev.checkedSteps, id],
      }));
    },
    [setState],
  );

  const setCurrentStepIndex = useCallback(
    (index: number) => {
      setState((prev) => ({ ...prev, currentStepIndex: index }));
    },
    [setState],
  );

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, [setState]);

  return {
    state,
    hydrated,
    toggleIngredient,
    toggleStep,
    setCurrentStepIndex,
    reset,
  };
}
