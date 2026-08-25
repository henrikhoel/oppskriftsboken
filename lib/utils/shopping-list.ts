import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
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

/** Sammenligner to ShoppingListSourceRef på recipeId alene (samme oppskrift
 * regnes som samme kilde uansett om porsjonstallet skulle avvike mellom to
 * bidrag – bør normalt ikke skje, men vi dobbelfører aldri samme
 * oppskrift). */
function hasSameSource(sources: ShoppingListSourceRef[], source: ShoppingListSourceRef): boolean {
  return sources.some((s) => s.recipeId === source.recipeId);
}

/**
 * Legger ingredienser fra en eller flere oppskrifter til en eksisterende
 * handleliste. To linjer slås KUN sammen dersom navn og enhet er identiske
 * (etter normalisering) og begge mengder er tallbare – ellers legges de til
 * som separate linjer, for å unngå å gjette feil (f.eks. "1 boks" + "400 g"
 * slås aldri sammen).
 *
 * `source` (valgfri) – strukturert sporbarhet (recipeId/slug/porsjoner), se
 * ShoppingListSourceRef i lib/types.ts. Lagt til for "kombinert
 * handleliste" (Fase 5 – Experience, 5.7); eksisterende kallere som ikke
 * sender den (enkelt-oppskrift-siden, se useShoppingList.ts) fortsetter å
 * fungere UENDRET – fromRecipes (tittel-teksten UI-et viser) settes alltid,
 * uavhengig av om `source` er oppgitt.
 */
export function mergeIngredientsIntoList(
  existing: ShoppingListEntry[],
  groups: IngredientGroup[],
  recipeTitle: string,
  servingsMultiplier = 1,
  source?: ShoppingListSourceRef,
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
        if (source) {
          match.sources = match.sources ?? [];
          if (!hasSameSource(match.sources, source)) match.sources.push(source);
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
        sources: source ? [source] : undefined,
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
