"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { generateId } from "@/lib/utils/id";
import type { WeeklyMenuChoice } from "@/lib/kitchen-intelligence/weekly-menu-styles";

/**
 * "Se lagrede ukesmenyer" (28.09.2026, Henrik: "jeg mener også å ha en
 * 'lagre ukesmeny' og 'se lagrede ukesmenyer'") – speiler EKSAKT samme
 * mønster som "Dine menyer" for den manuelle/AI-baserte menybyggeren (se
 * lib/hooks/useMealSession.ts sin useMealSessionIndex og
 * components/meal/SavedMealsList.tsx): en EKSPLISITT "Lagre"-handling (ikke
 * automatisk ved hver generering – samme "det må være en knapp man trykker
 * på for å velge å lagre"-prinsipp Henrik allerede etablerte for menyer),
 * lagret i ekte localStorage (til forskjell fra DEN AKTIVE uken, som kun
 * lever i sessionStorage – se useActiveWeeklyMenu.ts) til brukeren selv
 * fjerner den.
 *
 * ÉN forskjell fra useMealSessionIndex sitt "register av id-er + én egen
 * localStorage-nøkkel per meny"-mønster: en ukesmeny er et lite, FERDIG,
 * ikke-videre-redigerbart øyeblikksbilde (stil + fem oppskrift-id-er) i det
 * øyeblikket den lagres – det finnes ingen "rediger en lagret ukesmeny
 * senere"-funksjon slik en MealSession har (legg til/fjern retter,
 * endre tittel osv.). Derfor er det ingen grunn til separate
 * localStorage-nøkler per lagret uke; hele lista holdes i ÉN nøkkel som en
 * enkel array, akkurat som handlelisten (useShoppingList.ts).
 */
export interface SavedWeeklyMenu {
  id: string;
  style: WeeklyMenuChoice;
  recipeIds: string[];
  /** ISO-tidsstempel – brukt til visning ("lagret 28. september 2026") og
   * til å sortere nyeste øverst. */
  savedAt: string;
}

const STORAGE_KEY = "oppskriftsboken:ukesmenyer:lagrede";

export function useSavedWeeklyMenus() {
  const [saved, setSaved, hydrated] = useLocalStorage<SavedWeeklyMenu[]>(STORAGE_KEY, []);

  const saveMenu = useCallback(
    (style: WeeklyMenuChoice, recipeIds: string[]) => {
      const entry: SavedWeeklyMenu = {
        id: generateId(),
        style,
        recipeIds,
        savedAt: new Date().toISOString(),
      };
      setSaved((prev) => [entry, ...prev]);
      return entry.id;
    },
    [setSaved],
  );

  const removeMenu = useCallback(
    (id: string) => setSaved((prev) => prev.filter((menu) => menu.id !== id)),
    [setSaved],
  );

  return { saved, hydrated, saveMenu, removeMenu };
}
