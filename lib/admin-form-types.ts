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
 * React-key uten en tom, ellers-ubrukt startrad. */
export function makeKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
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
