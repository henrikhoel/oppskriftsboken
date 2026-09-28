"use client";

import { useSessionStorage } from "@/lib/hooks/useSessionStorage";
import type { WeeklyMenuChoice } from "@/lib/kitchen-intelligence/weekly-menu-styles";

/**
 * Nøkkelen for DEN AKTIVE ukesmenyen (28.09.2026) – eksportert (ikke bare
 * brukt inni denne filen) fordi SavedWeeklyMenusList.tsx sin "Bruk denne
 * uken igjen"-handling skriver rett til denne nøkkelen (via
 * window.sessionStorage direkte, FØR den navigerer til /ukesmeny) i stedet
 * for å gå via selve hooken under – de to komponentene er aldri montert
 * samtidig (å trykke "Bruk denne uken igjen" navigerer bort fra siden med
 * lista), så det finnes ingen synk-instans å holde oppdatert, kun én
 * skriving som WeeklyMenuView.tsx leser inn ved neste mount.
 */
export const ACTIVE_WEEKLY_MENU_KEY = "oppskriftsboken:ukesmeny:aktiv-uke";

export interface ActiveWeeklyMenuState {
  style: WeeklyMenuChoice | null;
  recipeIds: string[];
}

const EMPTY_ACTIVE_STATE: ActiveWeeklyMenuState = { style: null, recipeIds: [] };

/**
 * Se filheaderen i useSessionStorage.ts for hele bakgrunnen: den AKTIVE
 * ukesmenyen lever i sessionStorage (overlever "trykk inn på en rett og
 * kom tilbake", men IKKE en helt ny fane/økt) – atskilt fra de EKSPLISITT
 * LAGREDE ukesmenyene (lib/hooks/useSavedWeeklyMenus.ts), som lever i ekte
 * localStorage til brukeren selv fjerner dem.
 */
export function useActiveWeeklyMenu() {
  return useSessionStorage<ActiveWeeklyMenuState>(ACTIVE_WEEKLY_MENU_KEY, EMPTY_ACTIVE_STATE);
}
