"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { Lang } from "@/lib/i18n";
import type { UnitSystem } from "@/lib/utils/units";
import {
  createEmptyRecipeSession,
  withImprovement,
  withSubstitution,
  withoutImprovement,
  withoutSubstitution,
} from "@/lib/kitchen-intelligence/session";
import type {
  ChosenImprovement,
  ChosenSubstitution,
  RecipeSession,
  RecipeSessionTimer,
  RecipeVariant,
} from "@/lib/kitchen-intelligence/types";

/**
 * Persisterer RecipeSession (se lib/kitchen-intelligence/types.ts) per
 * oppskrift, i localStorage – samme mønster og samme lagringsteknikk som
 * lib/hooks/useCookModeState.ts, bevisst en EGEN nøkkel
 * (`oppskriftsboken:session:${recipeId}`) fremfor å utvide den eksisterende,
 * slik at Cook Mode-fremdrift ikke går tapt/endrer form for besøkende som
 * allerede har en lagret økt fra før denne funksjonen fantes.
 *
 * IKKE koblet inn i RecipeInteractive.tsx/CookMode.tsx ennå – dette er
 * fundamentet fremtidige funksjoner (erstatninger, "Løft retten",
 * flere-timere Cook Mode, "Reverse Cooking Timeline" osv.) bygger videre på
 * når de faktisk implementeres, se rapporten til bruker for videre fase-plan.
 */
export function useRecipeSession(recipeId: string, originalServings: number, lang: Lang) {
  const initial = useMemo(
    () => createEmptyRecipeSession({ id: recipeId, servings: originalServings }, lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipeId],
  );

  const [session, setSession, hydrated] = useLocalStorage<RecipeSession>(
    `oppskriftsboken:session:${recipeId}`,
    initial,
  );

  const touch = useCallback(
    (updater: (prev: RecipeSession) => RecipeSession) => {
      setSession((prev) => ({ ...updater(prev), updatedAt: new Date().toISOString() }));
    },
    [setSession],
  );

  const setServings = useCallback((servings: number) => touch((prev) => ({ ...prev, servings })), [touch]);

  const setUnitSystem = useCallback(
    (unitSystem: UnitSystem) => touch((prev) => ({ ...prev, unitSystem })),
    [touch],
  );

  const setVariant = useCallback((variant: RecipeVariant) => touch((prev) => ({ ...prev, variant })), [touch]);

  const addSubstitution = useCallback(
    (substitution: ChosenSubstitution) => touch((prev) => withSubstitution(prev, substitution)),
    [touch],
  );

  const removeSubstitution = useCallback(
    (ingredientItemId: string) => touch((prev) => withoutSubstitution(prev, ingredientItemId)),
    [touch],
  );

  const addImprovement = useCallback(
    (improvement: ChosenImprovement) => touch((prev) => withImprovement(prev, improvement)),
    [touch],
  );

  const removeImprovement = useCallback(
    (improvementId: string) => touch((prev) => withoutImprovement(prev, improvementId)),
    [touch],
  );

  const setDesiredReadyAt = useCallback(
    (desiredReadyAt: string | null) => touch((prev) => ({ ...prev, desiredReadyAt })),
    [touch],
  );

  const setNotes = useCallback((notes: string) => touch((prev) => ({ ...prev, notes })), [touch]);

  const setCookModeStepIndex = useCallback(
    (currentStepIndex: number) =>
      touch((prev) => ({ ...prev, cookMode: { ...prev.cookMode, currentStepIndex } })),
    [touch],
  );

  const toggleCookModeStep = useCallback(
    (stepId: string) =>
      touch((prev) => {
        const has = prev.cookMode.checkedStepIds.includes(stepId);
        return {
          ...prev,
          cookMode: {
            ...prev.cookMode,
            checkedStepIds: has
              ? prev.cookMode.checkedStepIds.filter((id) => id !== stepId)
              : [...prev.cookMode.checkedStepIds, stepId],
          },
        };
      }),
    [touch],
  );

  const toggleCookModeIngredient = useCallback(
    (ingredientId: string) =>
      touch((prev) => {
        const has = prev.cookMode.checkedIngredientIds.includes(ingredientId);
        return {
          ...prev,
          cookMode: {
            ...prev.cookMode,
            checkedIngredientIds: has
              ? prev.cookMode.checkedIngredientIds.filter((id) => id !== ingredientId)
              : [...prev.cookMode.checkedIngredientIds, ingredientId],
          },
        };
      }),
    [touch],
  );

  const upsertTimer = useCallback(
    (timer: RecipeSessionTimer) =>
      touch((prev) => ({
        ...prev,
        timers: [...prev.timers.filter((t) => t.id !== timer.id), timer],
      })),
    [touch],
  );

  const removeTimer = useCallback(
    (timerId: string) => touch((prev) => ({ ...prev, timers: prev.timers.filter((t) => t.id !== timerId) })),
    [touch],
  );

  const reset = useCallback(() => {
    setSession(createEmptyRecipeSession({ id: recipeId, servings: originalServings }, lang));
  }, [recipeId, originalServings, lang, setSession]);

  return {
    session,
    hydrated,
    setServings,
    setUnitSystem,
    setVariant,
    addSubstitution,
    removeSubstitution,
    addImprovement,
    removeImprovement,
    setDesiredReadyAt,
    setNotes,
    setCookModeStepIndex,
    toggleCookModeStep,
    toggleCookModeIngredient,
    upsertTimer,
    removeTimer,
    reset,
  };
}
