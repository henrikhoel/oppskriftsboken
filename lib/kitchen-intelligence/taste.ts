/**
 * Delte typer/registeret for "Smaksprofil" (Fase 4 – Smak). Selve
 * vurderingen av HVOR søtt/salt/syrlig osv. en rett er, er per definisjon
 * skjønn – det finnes ingen deterministisk måte å regne det ut fra en
 * ingrediensliste – så dette (i motsetning til f.eks. pantry-match.ts) er
 * et rent AI-drevet forslag.
 *
 * VIKTIG (endret 25.08.2026): dette er IKKE lenger en live, per-besøk AI-
 * beregning. Smaksprofilen genereres én gang fra admin ("Generer
 * smaksprofil"-knappen i RecipeForm.tsx, se generateTasteProfile i
 * lib/actions/recipes.ts) og lagres fast på selve oppskriften
 * (recipes.taste_profile) – samme mønster som titleEn/descriptionEn. Denne
 * filen holder kun den DELTE formen (dimensjoner + type), slik at
 * admin-actionen og visningskomponenten (TasteProfileDisplay.tsx) alltid er
 * enige om hvilke dimensjoner som finnes, uten å duplisere listen to steder.
 * Ren typefil, ingen server-avhengigheter – trygg å importere fra både
 * server- og klientkomponenter.
 */

export const TASTE_DIMENSIONS = [
  { id: "sweet", labelKey: "tasteProfile.sweet" },
  { id: "salty", labelKey: "tasteProfile.salty" },
  { id: "sour", labelKey: "tasteProfile.sour" },
  { id: "bitter", labelKey: "tasteProfile.bitter" },
  { id: "umami", labelKey: "tasteProfile.umami" },
  { id: "spicy", labelKey: "tasteProfile.spicy" },
] as const;

export type TasteDimensionId = (typeof TASTE_DIMENSIONS)[number]["id"];

export interface TasteProfile {
  /** 0–5 per dimensjon. Språkuavhengige tall – trenger ingen egen engelsk
   * variant. */
  dimensions: Record<TasteDimensionId, number>;
  /** Én kort setning på norsk som oppsummerer smaksbildet, f.eks. "Rik og
   * umami-tung, med en syrlig kant fra tomatene." */
  summary: string;
  /** Samme setning på engelsk – genereres i samme AI-kall som summary, se
   * generateTasteProfile i lib/actions/recipes.ts. Tom streng dersom
   * (svært gammelt) generert før dette feltet fantes. */
  summaryEn: string;
}

/** Klemmer en rå AI-verdi til et gyldig heltall 0–5 – brukes av
 * getTasteProfile før caching, slik at et cachet svar aldri kan inneholde
 * en verdi UI-et (bredde-prosent på en stolpe) ikke takler pent. */
export function clampTasteValue(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}
