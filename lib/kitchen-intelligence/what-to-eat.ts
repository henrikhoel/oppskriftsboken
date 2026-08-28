import type { SearchableRecipe } from "@/lib/utils/search";
import type { MealOccasion } from "@/lib/kitchen-intelligence/types";
import type { InSeasonIngredient } from "@/lib/kitchen-intelligence/seasonal";
import { matchRecipeToSeasonalIngredients } from "@/lib/kitchen-intelligence/seasonal";
import type { Lang } from "@/lib/i18n/lang";

/**
 * DETERMINISTISK beslutningsmotor for "Hva skal vi spise?" (spesifikasjon
 * punkt 1-8). Bevisst INGEN AI i denne filen – hele rangeringen er ren,
 * synkron tekst-/tallsammenligning mot data appen allerede har (tid,
 * kategori, tags, vanskelighetsgrad, porsjoner, vurdering, sesong). Se
 * spesifikasjonens punkt 7 ("ikke betal for et AI-kall hver gang noen
 * velger 30 min + kylling") og filheaderen til pantry-match.ts, som denne
 * filen bevisst følger samme mønster som: bygg per-oppskrift metrikk,
 * filtrer/sorter med en tuple-komparator, aldri en AI-forespørsel per
 * visning.
 *
 * "Protein/rett-type"-preferansen (PASTA/KYLLING/FISK/KJØTT/VEGETAR)
 * trenger INGEN ny datamodell – den matcher direkte mot
 * recipe.category.slug, som allerede er nøyaktig disse fem verdiene (se
 * lib/demo-data/categories.ts). "Stemning"-fasettene
 * (RASKT/LETT/KOSEMAT/SUNT/BARNEVENNLIG/VEGETAR) matcher mot det
 * EKSISTERENDE tag-systemet (recipe.tags, admin kan allerede tagge
 * oppskrifter i det vanlige oppskriftsskjemaet) – ingen ny migrasjon,
 * ingen ny admin-UI. Før admin faktisk har tagget noe, degraderer
 * fasettmatching bare stille til "ingen bonus" (se scoreRecipe under) –
 * aldri en feil eller et tomt resultat, jf. spesifikasjon punkt 20.
 */

export type VibeFacet = "rask" | "lett" | "kosemat" | "sunt" | "barnevennlig" | "vegetar";
export const ALL_VIBE_FACETS: VibeFacet[] = ["rask", "lett", "kosemat", "sunt", "barnevennlig", "vegetar"];

export type ProteinPreference = "pasta" | "kylling" | "fisk" | "kjott" | "vegetar" | "overrask";
export const ALL_PROTEIN_PREFERENCES: ProteinPreference[] = ["pasta", "kylling", "fisk", "kjott", "vegetar", "overrask"];

export type Ambition = "enkelt" | "litt_ekstra" | "imponer";
export const ALL_AMBITIONS: Ambition[] = ["enkelt", "litt_ekstra", "imponer"];

/** Redaksjonelle norsk/engelsk-etiketter til valgknappene på "Hva skal vi
 * spise?"-siden – samme "kort etikett, {no,en}"-mønster som
 * MEAL_OCCASION_LABELS i lib/kitchen-intelligence/meal-session.ts. */
export const VIBE_FACET_LABELS: Record<VibeFacet, { no: string; en: string }> = {
  rask: { no: "Raskt", en: "Quick" },
  lett: { no: "Lett", en: "Light" },
  kosemat: { no: "Kosemat", en: "Comfort food" },
  sunt: { no: "Sunt", en: "Healthy" },
  barnevennlig: { no: "Barnevennlig", en: "Kid friendly" },
  vegetar: { no: "Vegetar", en: "Vegetarian" },
};

export const PROTEIN_PREFERENCE_LABELS: Record<ProteinPreference, { no: string; en: string }> = {
  pasta: { no: "Pasta", en: "Pasta" },
  kylling: { no: "Kylling", en: "Chicken" },
  fisk: { no: "Fisk", en: "Fish" },
  kjott: { no: "Kjøtt", en: "Meat" },
  vegetar: { no: "Vegetar", en: "Vegetarian" },
  overrask: { no: "Overrask meg", en: "Surprise me" },
};

export const AMBITION_LABELS: Record<Ambition, { no: string; en: string }> = {
  enkelt: { no: "Enkelt", en: "Simple" },
  litt_ekstra: { no: "Litt ekstra", en: "A bit extra" },
  imponer: { no: "Imponer", en: "Impress" },
};

/** Godtatte tag-navn (normalisert, substring-matchet) per fasett – flere
 * norske/engelske varianter slik at admin ikke må treffe én eksakt streng. */
const VIBE_TAG_HINTS: Record<VibeFacet, string[]> = {
  rask: ["rask", "raskt", "quick"],
  lett: ["lett", "light"],
  kosemat: ["kosemat", "comfort"],
  sunt: ["sunt", "sunn", "healthy"],
  barnevennlig: ["barnevennlig", "barnevenlig", "kid friendly", "kids"],
  vegetar: ["vegetar", "vegetarian"],
};

/** Kategori-slugs (recipe.category.slug) som regnes som "denne
 * protein-typen" – se lib/demo-data/categories.ts. */
const PROTEIN_CATEGORY_SLUGS: Partial<Record<ProteinPreference, string[]>> = {
  pasta: ["pasta"],
  kylling: ["kylling"],
  fisk: ["fisk"],
  kjott: ["kjott"],
  vegetar: ["vegetar"],
};

/** Under hvor mange minutter en oppskrift regnes som "rask" når ingen tag
 * finnes å matche mot – proxy for RASKT-fasetten, se filheaderen. */
const QUICK_PROXY_MAX_MINUTES = 30;

export interface WhatToEatCriteria {
  availableMinutes?: number | null;
  vibe?: VibeFacet | null;
  protein?: ProteinPreference | null;
  occasion?: MealOccasion | null;
  ambition?: Ambition | null;
  guestCount?: number | null;
  /** Oppskrift-ider besøkeren allerede har markert som favoritt (lokalt,
   * se useFavorites) – sendt inn som parameter, samme mønster som
   * availableIngredients i matchRecipesToPantry (ingen server-side
   * per-besøkende lagring finnes, se filheaderen til
   * lib/actions/kitchen-intelligence.ts sin favoritter-seksjon). */
  favoriteRecipeIds?: string[];
  /** Oppskrift-ider som nylig er vist/valgt (useDecisionHistory) – filtreres
   * HELT bort, ikke bare nedvektet, se spesifikasjon punkt 8. */
  excludeRecipeIds?: string[];
}

export interface WhatToEatMatch {
  recipe: SearchableRecipe;
  score: number;
  matchedCriteria: string[];
  seasonalMatches: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tagMatchesFacet(recipe: SearchableRecipe, facet: VibeFacet): boolean {
  const hints = VIBE_TAG_HINTS[facet];
  return recipe.tags.some((tag) => {
    const name = normalize(tag.name);
    return hints.some((hint) => name.includes(normalize(hint)));
  });
}

function scoreRecipe(
  recipe: SearchableRecipe,
  criteria: WhatToEatCriteria,
  inSeasonIngredients: InSeasonIngredient[],
): { score: number; matchedCriteria: string[]; seasonalMatches: string[] } {
  let score = 0;
  const matched: string[] = [];

  // Tid: myk bonus, ALDRI et hardt filter (spesifikasjon punkt 20 – en for
  // stram tidsgrense skal ikke kunne gi et tomt resultat).
  if (criteria.availableMinutes != null && recipe.totalTimeMinutes != null) {
    if (recipe.totalTimeMinutes <= criteria.availableMinutes) {
      score += 4;
      matched.push("time");
    } else if (recipe.totalTimeMinutes <= criteria.availableMinutes + 15) {
      score += 1;
      matched.push("time_close");
    }
  }

  // Stemning (fasett-tag, med tids-proxy for RASKT når ingen tag finnes).
  if (criteria.vibe) {
    if (tagMatchesFacet(recipe, criteria.vibe)) {
      score += 4;
      matched.push(`vibe:${criteria.vibe}`);
    } else if (
      criteria.vibe === "rask" &&
      recipe.totalTimeMinutes != null &&
      recipe.totalTimeMinutes <= QUICK_PROXY_MAX_MINUTES
    ) {
      score += 2;
      matched.push("vibe:rask");
    } else if (
      criteria.vibe === "vegetar" &&
      recipe.category?.slug === "vegetar"
    ) {
      score += 3;
      matched.push("vibe:vegetar");
    }
  }

  // Protein/rett-type.
  if (criteria.protein && criteria.protein !== "overrask") {
    const slugs = PROTEIN_CATEGORY_SLUGS[criteria.protein] ?? [];
    if (recipe.category && slugs.includes(recipe.category.slug)) {
      score += 4;
      matched.push(`protein:${criteria.protein}`);
    }
  }

  // Ambisjon -> vanskelighetsgrad + kuraterings-signaler.
  if (criteria.ambition === "enkelt" && recipe.difficulty === "enkel") {
    score += 2;
    matched.push("ambition:enkelt");
  } else if (criteria.ambition === "imponer") {
    if (recipe.difficulty === "avansert") {
      score += 2;
      matched.push("ambition:imponer");
    }
    if (recipe.isFeatured) {
      score += 1;
      matched.push("featured");
    }
  } else if (criteria.ambition === "litt_ekstra" && recipe.difficulty === "middels") {
    score += 1;
    matched.push("ambition:litt_ekstra");
  }

  // Antall gjester -> nærhet til oppskriftens porsjonstall (skalering
  // finnes jo allerede, se RecipeInteractive.tsx – dette er kun en svak
  // relevans-bonus, ikke et krav).
  if (criteria.guestCount != null && recipe.servings != null) {
    const diff = Math.abs(recipe.servings - criteria.guestCount);
    if (diff <= 1) {
      score += 1;
      matched.push("guestCount");
    }
  }

  // Sesong: subtil bonus, ALDRI dominerende (spesifikasjon punkt 13 – skal
  // ikke overstyre et eksplisitt protein-/kategorivalg).
  const seasonalMatches = matchRecipeToSeasonalIngredients(recipe.ingredientNames, inSeasonIngredients);
  if (seasonalMatches.length > 0) {
    const bonus = Math.min(2, seasonalMatches.some((m) => m.isPeakNow) ? 2 : 1);
    score += bonus;
    matched.push("season");
  }

  // Favoritt + vurdering: svake personlige signaler.
  if (criteria.favoriteRecipeIds?.includes(recipe.id)) {
    score += 2;
    matched.push("favorite");
  }
  if (recipe.ratingCount > 0) {
    score += Math.min(1, recipe.ratingSum / recipe.ratingCount / 5);
  }

  return {
    score,
    matchedCriteria: matched,
    seasonalMatches: seasonalMatches.map((m) => m.ingredient.nameNo),
  };
}

/**
 * Rangerer ALLE publiserte oppskrifter mot de gitte kriteriene. Ingen
 * kriterier er harde filtre (bortsett fra excludeRecipeIds) – alt annet er
 * myke bonuser, slik at det ALLTID finnes et resultat så lenge det finnes
 * publiserte oppskrifter (spesifikasjon punkt 20: "ikke vis tom skjerm").
 * Kalleren (getWhatToEatSuggestions) avgjør ut fra høyeste score om
 * treffet er "sterkt" eller om UI-et bør vise
 * "Ingen traff helt, disse kommer nærmest"-teksten.
 */
export function scoreRecipesForDecision(
  recipes: SearchableRecipe[],
  criteria: WhatToEatCriteria,
  inSeasonIngredients: InSeasonIngredient[],
): WhatToEatMatch[] {
  const excluded = new Set(criteria.excludeRecipeIds ?? []);
  const candidates = recipes.filter((r) => !excluded.has(r.id));

  const scored = candidates.map((recipe) => {
    const { score, matchedCriteria, seasonalMatches } = scoreRecipe(recipe, criteria, inSeasonIngredients);
    return { recipe, score, matchedCriteria, seasonalMatches };
  });

  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.recipe.ratingSum / Math.max(1, b.recipe.ratingCount) - a.recipe.ratingSum / Math.max(1, a.recipe.ratingCount) ||
      (b.recipe.totalTimeMinutes == null ? 0 : -b.recipe.totalTimeMinutes) -
        (a.recipe.totalTimeMinutes == null ? 0 : -a.recipe.totalTimeMinutes),
  );
}

const REASON_PHRASES_NO: { test: (m: string[]) => boolean; text: string }[] = [
  {
    test: (m) => m.includes("time") && (m.includes("vibe:kosemat") || m.includes("featured")),
    text: "Rask nok til en hverdag, men føles fortsatt som en ordentlig middag.",
  },
  {
    test: (m) => m.includes("ambition:imponer") && m.includes("featured"),
    text: "Litt mer ambisiøs, akkurat passe for anledningen.",
  },
  {
    test: (m) => m.includes("season"),
    text: "Bruker råvarer som er på sitt beste akkurat nå.",
  },
  {
    test: (m) => m.includes("vibe:rask") || m.includes("time"),
    text: "Rask å få på bordet uten at det føles hastverk.",
  },
  {
    test: (m) => m.some((c) => c.startsWith("protein:")),
    text: "Rett i blinken for det du hadde lyst på.",
  },
  {
    test: (m) => m.includes("ambition:enkelt"),
    text: "Enkel, pålitelig, ingen overraskelser.",
  },
  {
    test: (m) => m.includes("favorite"),
    text: "En du har likt før.",
  },
];

const REASON_PHRASES_EN: { test: (m: string[]) => boolean; text: string }[] = [
  {
    test: (m) => m.includes("time") && (m.includes("vibe:kosemat") || m.includes("featured")),
    text: "Quick enough for a weeknight, but still feels like a proper dinner.",
  },
  {
    test: (m) => m.includes("ambition:imponer") && m.includes("featured"),
    text: "A little more ambitious, just right for the occasion.",
  },
  {
    test: (m) => m.includes("season"),
    text: "Uses ingredients that are at their best right now.",
  },
  {
    test: (m) => m.includes("vibe:rask") || m.includes("time"),
    text: "Quick to get on the table without feeling rushed.",
  },
  {
    test: (m) => m.some((c) => c.startsWith("protein:")),
    text: "Right in line with what you were after.",
  },
  {
    test: (m) => m.includes("ambition:enkelt"),
    text: "Simple, reliable, no surprises.",
  },
  {
    test: (m) => m.includes("favorite"),
    text: "One you've liked before.",
  },
];

const FALLBACK_REASON_NO = "Et godt, pålitelig valg akkurat nå.";
const FALLBACK_REASON_EN = "A solid, reliable choice right now.";

/** Deterministisk, mal-basert begrunnelsestekst (spesifikasjon punkt 4) –
 * INGEN AI-kall, se filheaderen. Velger den FØRSTE regelen (i prioritert
 * rekkefølge over) hvis test slår til for denne oppskriftens matchede
 * kriterier, ellers en nøytral standardtekst. */
export function buildReasonText(matchedCriteria: string[], lang: Lang): string {
  const rules = lang === "en" ? REASON_PHRASES_EN : REASON_PHRASES_NO;
  const rule = rules.find((r) => r.test(matchedCriteria));
  return rule?.text ?? (lang === "en" ? FALLBACK_REASON_EN : FALLBACK_REASON_NO);
}
