/**
 * Delte typer/registeret for "Næringsinnhold" (kalori- og makro-oversikt).
 * Samme mønster som lib/kitchen-intelligence/taste.ts: IKKE en live,
 * per-besøk AI-beregning – genereres én gang fra admin ("Generer
 * næringsinnhold"-knappen i RecipeForm.tsx, se generateNutritionInfo i
 * lib/actions/recipes.ts) og lagres fast på oppskriften
 * (recipes.nutrition_info). Vises bak en "vis næringsinnhold"-knapp på
 * selve oppskriftssiden (components/recipe/NutritionPanel.tsx) – ren
 * klientside-toggle av allerede lastet data, IKKE et nytt AI-kall når noen
 * trykker (se filheaderen der) – de som ikke bryr seg om det trenger aldri
 * se det.
 *
 * Feltene følger den vanlige NORSKE næringsdeklarasjonen (energi/fett/hvorav
 * mettet fett/karbohydrat/hvorav sukkerarter/fiber/protein/salt) fremfor et
 * amerikansk "Nutrition Facts"-oppsett, siden det er formatet norske
 * besøkende kjenner igjen fra vareemballasje. Alle tall er PER PORSJON
 * (ikke per 100 g) – oppskriftens porsjonsantall brukes som grunnlag når
 * AI-en genererer, se generateNutritionInfo.
 *
 * Estimater fra ingredienslisten, ALDRI en laboratoriemåling – dette vises
 * alltid sammen med tallene via nutrition.disclaimer (i18n), se
 * NutritionPanel.tsx.
 */

export const NUTRITION_FIELDS = [
  { id: "calories", labelKey: "nutrition.calories", unit: "kcal" },
  { id: "fat", labelKey: "nutrition.fat", unit: "g" },
  { id: "saturatedFat", labelKey: "nutrition.saturatedFat", unit: "g" },
  { id: "carbs", labelKey: "nutrition.carbs", unit: "g" },
  { id: "sugar", labelKey: "nutrition.sugar", unit: "g" },
  { id: "fiber", labelKey: "nutrition.fiber", unit: "g" },
  { id: "protein", labelKey: "nutrition.protein", unit: "g" },
  { id: "salt", labelKey: "nutrition.salt", unit: "g" },
] as const;

export type NutritionFieldId = (typeof NUTRITION_FIELDS)[number]["id"];

export interface NutritionInfo {
  /** Per porsjon. Alle felt er tall (aldri null/undefined) – klampet av
   * clampNutritionValue før lagring, se generateNutritionInfo. */
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  protein: number;
  /** Gram, ikke mg natrium – matcher norsk næringsdeklarasjon. */
  salt: number;
}

/** Klemmer en rå AI-verdi til et fornuftig, ikke-negativt tall (1 desimal)
 * for et gitt næringsfelt – hindrer at en AI-glipp (negativt tall, NaN,
 * eller en urealistisk stor verdi) noen gang lagres eller vises. `max` er et
 * romslig sikkerhetsnett per felt (se generateNutritionInfo), ikke en
 * presisjonsgrense. */
export function clampNutritionValue(value: unknown, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(max, Math.round(n * 10) / 10));
}
