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
 *
 * checkedSteps/toggleStep: selve "Merk som gjort"-avkrysningsboksen i
 * CookMode.tsx ble fjernet 27.09.2026 (Henrik: "hva er det godt for? for
 * hvis jeg trykker på den så går den ikke til neste uansett... jeg merker
 * jeg ikke bruker denne funksjonen"), så CookMode.tsx kaller ikke lenger
 * toggleStep noe sted. Feltet/funksjonen beholdes likevel her fordi
 * RecipeInteractive.tsx fortsatt LESER checkedSteps.length som ett av tre
 * signaler for om man skal vise "Fortsett matlaging" i stedet for "Start
 * matlaging" – i praksis vil den alltid være tom fra og med denne
 * endringen, men det er ufarlig (de to andre signalene, currentStepIndex
 * og checkedIngredients, dekker fortsatt reell fremgang).
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
