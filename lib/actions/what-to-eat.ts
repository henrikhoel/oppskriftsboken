"use server";

import { getSearchableRecipes } from "@/lib/data/recipes";
import { getAllSeasonsWithIngredients } from "@/lib/data/seasons";
import { resolveInSeasonIngredients } from "@/lib/kitchen-intelligence/seasonal";
import {
  buildReasonText,
  scoreRecipesForDecision,
  type WhatToEatCriteria,
  type WhatToEatMatch,
} from "@/lib/kitchen-intelligence/what-to-eat";
import type { Lang } from "@/lib/i18n";

/**
 * Server action-wrapper for den DETERMINISTISKE "Hva skal vi spise?"-motoren
 * (lib/kitchen-intelligence/what-to-eat.ts). Samme mønster som
 * findRecipesForPantry i lib/actions/kitchen-intelligence.ts: ingen
 * requireAdmin (offentlig, besøkende-vendt funksjon), ingen try/catch (rene,
 * synkrone beregninger over data appen uansett henter – en feil her er en
 * ekte programmeringsfeil, ikke noe brukeren skal se en pen feilmelding
 * for), og INGEN AI-cache siden ingen AI-kall gjøres i det hele tatt.
 *
 * Henter både oppskrifter OG "hva er i sesong akkurat nå" i samme kall, slik
 * at kalleren (WhatToEatView.tsx) kun trenger å sende inn kriteriene
 * besøkende faktisk har valgt.
 */
export interface WhatToEatSuggestion extends WhatToEatMatch {
  /** Ferdig generert, deterministisk begrunnelsestekst – se
   * buildReasonText i motoren. Beregnet HER (server-side), ikke i
   * klienten, samme "ikke dupliser visningslogikk klient/server"-prinsipp
   * som matchPercent i PantryMatchView. */
  reason: string;
}

export async function getWhatToEatSuggestions(
  criteria: WhatToEatCriteria,
  lang: Lang,
  limit = 6,
): Promise<WhatToEatSuggestion[]> {
  const [recipes, seasons] = await Promise.all([getSearchableRecipes(), getAllSeasonsWithIngredients()]);
  const inSeasonIngredients = resolveInSeasonIngredients(seasons, new Date());

  const matches = scoreRecipesForDecision(recipes, criteria, inSeasonIngredients);

  return matches.slice(0, limit).map((match) => ({
    ...match,
    reason: buildReasonText(match.matchedCriteria, lang),
  }));
}
