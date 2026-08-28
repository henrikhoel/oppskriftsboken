"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

const STORAGE_KEY = "oppskriftsboken:hva-skal-vi-spise-historikk";

/** Maks antall nylig viste oppskrift-ider som huskes – gammelt faller ut
 * automatisk (FIFO), se recordShown under. Trenger ikke være stor: poenget
 * er kun å unngå at "Vis meg noe annet" gjentar akkurat de samme forslagene
 * rett etter hverandre, ikke å bygge en full seer-historikk. */
const MAX_HISTORY = 12;

/**
 * Husker de sist VISTE oppskrift-idene fra "Hva skal vi spise?"-forslagene,
 * lokalt i nettleseren – samme "id-array i localStorage"-mønster som
 * useFavorites.ts (ingen server-lagring, ingen innlogging nødvendig, samme
 * useLocalStorage-primitiv). Brukes som excludeRecipeIds i
 * WhatToEatCriteria slik at "Vis meg noe annet" faktisk gir noe NYTT i
 * stedet for å gjenta de samme forslagene (spesifikasjonens punkt om å
 * unngå repetisjon).
 */
export function useDecisionHistory() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, []);

  const recordShown = useCallback(
    (recipeIds: string[]) => {
      if (recipeIds.length === 0) return;
      setIds((prev) => {
        const merged = [...prev, ...recipeIds.filter((id) => !prev.includes(id))];
        return merged.slice(-MAX_HISTORY);
      });
    },
    [setIds],
  );

  const clear = useCallback(() => setIds([]), [setIds]);

  return { historyIds: ids, recordShown, clear, hydrated };
}
