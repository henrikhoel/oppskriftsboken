import { generateId } from "@/lib/utils/id";

/**
 * Klientsidige skjematyper for admin-oppskriftsskjemaet. Har en ekstra
 * `key`-felt (stabil React-key) som IKKE finnes i lib/validation/recipe-schema.ts
 * sin RecipeInput – den fjernes før vi sender data til server-actionen.
 */
export interface FormIngredientItem {
  key: string;
  amount: string;
  unit: string;
  name: string;
  note: string;
}

export interface FormIngredientGroup {
  key: string;
  title: string;
  items: FormIngredientItem[];
}

export interface FormStep {
  key: string;
  groupTitle: string;
  text: string;
}

/** Eksportert (i tillegg til newIngredientItem/newIngredientGroup/newStep
 * under, som bruker den internt) slik at komponenter som bygger opp hele
 * grupper/steg fra eksterne data – f.eks. RecipeForm.tsx sin
 * "Importer fra lenke"-funksjon – kan gi hver importerte rad en stabil
 * React-key uten en tom, ellers-ubrukt startrad. Tynn wrapper rundt den
 * delte generateId() (se lib/utils/id.ts for hvorfor en trygg fallback
 * trengs, ikke bare crypto.randomUUID() direkte) – beholdt som eget
 * navn/eksport her for å ikke måtte endre alle kallesteder. */
export function makeKey(): string {
  return generateId();
}

export function newIngredientItem(): FormIngredientItem {
  return { key: makeKey(), amount: "", unit: "", name: "", note: "" };
}

export function newIngredientGroup(): FormIngredientGroup {
  return { key: makeKey(), title: "", items: [newIngredientItem()] };
}

export function newStep(): FormStep {
  return { key: makeKey(), groupTitle: "", text: "" };
}

/**
 * Klientsidig skjematype for ett steg i "Hvordan gjør jeg det?"-guide-
 * admin-skjemaet (GuideStepsEditor.tsx) – samme "key i tillegg til det
 * server-actionen faktisk vil ha"-mønster som FormStep over. Tall-felter
 * holdes som string i skjemaet (tomt = ingen verdi) og parses til
 * number|null først idet GuideForm.tsx bygger selve lagrings-payloaden,
 * samme konvensjon som prepTime/cookTime osv. i RecipeForm.tsx.
 */
export interface FormGuideStep {
  key: string;
  text: string;
  textEn: string;
  note: string;
  noteEn: string;
  durationMinutes: string;
  temperature: string;
}

export function newGuideStep(): FormGuideStep {
  return { key: makeKey(), text: "", textEn: "", note: "", noteEn: "", durationMinutes: "", temperature: "" };
}

/**
 * Klientsidig skjematype for én råvare i "I sesong"-admin-skjemaet
 * (SeasonalIngredientsEditor.tsx) – samme "key i tillegg til det
 * server-actionen faktisk vil ha"-mønster som FormGuideStep over. `aliases`
 * holdes som én kommaseparert streng i skjemaet (samme
 * "én tekstboks fremfor rad-for-rad-editor"-avveining som
 * LineListField i GuideForm.tsx bruker for korte listefelter), splittet til
 * string[] først idet SeasonForm.tsx bygger selve lagrings-payloaden.
 *
 * Utvidet 28.08.2026 med det tre-lags TILGJENGELIG/SESONG/PEAK-vinduet,
 * redaksjonell gruppering, opprinnelse og strukturert kildegrunnlag – se
 * filheaderen til SeasonalIngredient i lib/types.ts. category/originGroup/
 * origin holdes som fri streng i skjemaet (samme "valider på server, ikke
 * bare i UI-et"-prinsipp som resten av admin), validert som ekte enum av
 * seasonalIngredientInputSchema i lib/validation/season-schema.ts idet
 * skjemaet sendes inn.
 */
export interface FormSeasonalIngredient {
  key: string;
  slug: string;
  nameNo: string;
  nameEn: string;
  aliases: string;
  category: string;
  originGroup: string;
  origin: string;
  availableStartMonth: string;
  availableEndMonth: string;
  seasonStartMonth: string;
  seasonEndMonth: string;
  peakStartMonth: string;
  peakEndMonth: string;
  descriptionNo: string;
  descriptionEn: string;
  seasonNoteNo: string;
  seasonNoteEn: string;
  sourceName: string;
  sourceUrl: string;
  sourceNote: string;
  verifiedAt: string;
}

export function newSeasonalIngredient(): FormSeasonalIngredient {
  return {
    key: makeKey(),
    slug: "",
    nameNo: "",
    nameEn: "",
    aliases: "",
    category: "vegetable",
    originGroup: "jorda",
    origin: "norwegian",
    availableStartMonth: "",
    availableEndMonth: "",
    seasonStartMonth: "",
    seasonEndMonth: "",
    peakStartMonth: "",
    peakEndMonth: "",
    descriptionNo: "",
    descriptionEn: "",
    seasonNoteNo: "",
    seasonNoteEn: "",
    sourceName: "",
    sourceUrl: "",
    sourceNote: "",
    verifiedAt: "",
  };
}
