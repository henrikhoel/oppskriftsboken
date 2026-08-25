import type { SearchableRecipe } from "@/lib/utils/search";

/**
 * DETERMINISTISK matching-motor for "Hva kan jeg lage?" (Smart Pantry Search
 * + "Bruk restene" – bevisst slått sammen til ÉN motor/side, se
 * components/pantry/PantryMatchView.tsx sin filheader for begrunnelsen).
 * Ingen AI her: rangeringen er ren tekstsammenligning mellom det brukeren
 * sier de har og hver oppskrifts ingrediensnavn. AI brukes KUN til å
 * produsere selve `availableIngredients`-listen fra et bilde (se
 * lib/actions/kitchen-intelligence.ts -> detectIngredientsFromImage) – når
 * brukeren skriver inn ingredienser selv trengs ikke AI i det hele tatt.
 */

export interface PantryMatchResult {
  recipe: SearchableRecipe;
  matchedCount: number;
  totalCount: number;
  /** 0–1. */
  coverage: number;
  missingIngredientNames: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** To ingrediensnavn regnes som match dersom det ene inneholder det andre
 * (etter normalisering) – dekker både "løk" -> "rødløk"/"gul løk" (brukerens
 * ord er en delstreng av oppskriftens) og "kyllingfilet" -> "kylling"
 * (omvendt vei). Krever minst 2 tegn for å unngå at enkeltbokstaver/svært
 * korte ord gir treff på nesten alt. */
function ingredientMatches(available: string, recipeIngredientName: string): boolean {
  const a = normalize(available);
  const r = normalize(recipeIngredientName);
  if (a.length < 2 || r.length < 2) return false;
  return a.includes(r) || r.includes(a);
}

export function matchRecipesToPantry(
  availableIngredients: string[],
  recipes: SearchableRecipe[],
  options?: { limit?: number },
): PantryMatchResult[] {
  const cleanedAvailable = availableIngredients.map((i) => i.trim()).filter(Boolean);
  if (cleanedAvailable.length === 0) return [];

  const results: PantryMatchResult[] = recipes.map((recipe) => {
    const missing: string[] = [];
    let matchedCount = 0;
    for (const ingredientName of recipe.ingredientNames) {
      const isMatched = cleanedAvailable.some((available) => ingredientMatches(available, ingredientName));
      if (isMatched) matchedCount++;
      else missing.push(ingredientName);
    }
    const totalCount = recipe.ingredientNames.length;
    return {
      recipe,
      matchedCount,
      totalCount,
      coverage: totalCount > 0 ? matchedCount / totalCount : 0,
      missingIngredientNames: missing,
    };
  });

  const limit = options?.limit ?? 12;

  return results
    .filter((r) => r.matchedCount > 0)
    .sort((a, b) => b.coverage - a.coverage || b.matchedCount - a.matchedCount || a.totalCount - b.totalCount)
    .slice(0, limit);
}

/** Deterministisk splitting av en fritekst-liste ("løk, kylling og fløte",
 * eller én linje per ingrediens) til enkeltingredienser – null AI-behov for
 * tekst-input, kun for selve bilde-gjenkjenningen (se
 * lib/actions/kitchen-intelligence.ts -> detectIngredientsFromImage). */
export function splitIngredientList(raw: string): string[] {
  return raw
    .split(/[,\n]| og /gi)
    .map((s) => s.trim())
    .filter(Boolean);
}
