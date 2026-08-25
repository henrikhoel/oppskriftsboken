import type { IngredientGroup, ShoppingListEntry } from "@/lib/types";
import { parseAmount } from "@/lib/utils/scale";

/**
 * Normaliserer et ingrediensnavn for sammenligning ("Parmesan, revet" og
 * "parmesan" skal kunne gjenkjennes som samme vare), uten å være så
 * aggressiv at ulike ingredienser slås sammen ved en feil.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå\s]/g, "")
    .trim();
}

function normalizeUnit(unit: string | null): string {
  if (!unit) return "";
  return unit.trim().toLowerCase();
}

/**
 * Legger ingredienser fra en eller flere oppskrifter til en eksisterende
 * handleliste. To linjer slås KUN sammen dersom navn og enhet er identiske
 * (etter normalisering) og begge mengder er tallbare – ellers legges de til
 * som separate linjer, for å unngå å gjette feil (f.eks. "1 boks" + "400 g"
 * slås aldri sammen).
 */
export function mergeIngredientsIntoList(
  existing: ShoppingListEntry[],
  groups: IngredientGroup[],
  recipeTitle: string,
  servingsMultiplier = 1,
): ShoppingListEntry[] {
  const next = [...existing];

  for (const group of groups) {
    for (const item of group.items) {
      const scaledAmount = item.amount
        ? parseAmount(item.amount) != null
          ? (parseAmount(item.amount) as number) * servingsMultiplier
          : null
        : null;

      const normalizedName = normalizeName(item.name);
      const normalizedUnit = normalizeUnit(item.unit);
      const canMerge = scaledAmount != null && item.unit;

      const match = canMerge
        ? next.find(
            (entry) =>
              normalizeName(entry.name) === normalizedName &&
              normalizeUnit(entry.unit) === normalizedUnit &&
              entry.amount != null,
          )
        : undefined;

      if (match && canMerge) {
        match.amount = (match.amount ?? 0) + (scaledAmount ?? 0);
        if (!match.fromRecipes.includes(recipeTitle)) {
          match.fromRecipes.push(recipeTitle);
        }
        continue;
      }

      next.push({
        id: crypto.randomUUID(),
        amount: canMerge ? scaledAmount : null,
        displayAmount: canMerge ? null : item.amount,
        unit: item.unit,
        name: item.name + (item.note ? ` (${item.note})` : ""),
        checked: false,
        fromRecipes: [recipeTitle],
      });
    }
  }

  return next;
}

export function formatShoppingAmount(entry: ShoppingListEntry): string {
  if (entry.amount != null) {
    const rounded =
      entry.amount % 1 === 0 ? entry.amount : Math.round(entry.amount * 100) / 100;
    return [rounded, entry.unit].filter(Boolean).join(" ");
  }
  if (entry.displayAmount) {
    return [entry.displayAmount, entry.unit].filter(Boolean).join(" ");
  }
  return entry.unit ?? "";
}
