"use server";

import { callClaudeJSON } from "@/lib/ai/anthropic";
import {
  fetchVinmonopoletProductDetails,
  fetchVinmonopoletProductPriceNok,
  extractVinmonopoletProductId,
  searchVinmonopoletProducts,
  vinmonopoletProductImageUrl,
  vinmonopoletProductUrl,
  type VinmonopoletProduct,
} from "@/lib/ai/vinmonopolet";
import type { Lang } from "@/lib/i18n/lang";

interface RecipeContext {
  title: string;
  description: string;
  ingredientNames: string[];
}

/** Ett av de andre høyt rangerte, IKKE valgte kandidatene fra samme søk (se
 * VinmonopoletSuggestion.alternates) – kun navn/lenke/bilde, prisen deres er
 * IKKE sjekket (se MAX_PRICE_CHECKS under) for å holde belastningen mot
 * Vinmonopolets forbrukerside lav. Brukt av "vis et annet forslag" i admin
 * (components/admin/RecipeForm.tsx) – resolveVinmonopoletProductById henter
 * ekte pris for akkurat DEN admin faktisk velger å se nærmere på. */
export interface VinmonopoletAlternate {
  productName: string;
  productId: string;
  url: string;
  imageUrl: string;
}

export interface VinmonopoletSuggestion {
  productName: string;
  productId: string;
  url: string;
  imageUrl: string;
  reasoning: string;
  /** EKTE pris i kr, lest av direkte fra produktsiden akkurat nå (se
   * fetchVinmonopoletProductPriceNok) – null hvis vi ikke klarte å bekrefte
   * prisen (f.eks. hvis produktet er utgått/fjernet). IKKE et AI-anslag. */
  priceNok: number | null;
  /** true hvis vi faktisk klarte å bekrefte EKTE pris for akkurat DETTE
   * produktet innen MAX_PRICE_CHECKS forsøk (dvs. trolig fortsatt i
   * sortimentet) – false hvis INGEN av kandidatene lot seg bekrefte, og
   * dette derfor er en UBEKREFTET beste gjetning (chosen falt tilbake til
   * orderedCandidates[0]). Besøkende på selve oppskriftssiden vises ALDRI
   * et ubekreftet forslag (se DrinkPairingSection.tsx) – kun admin sitt
   * kuraterings-UI (RecipeForm.tsx) viser det, med "vis et annet
   * forslag"/søk-selv-fallback (alternates/searchTerm under). */
  confirmed: boolean;
  /** Søkeordet AI-en brukte for å finne fram til dette (se keywordSystem
   * under) – vist som "søk selv på Vinmonopolet etter"-fallback i admin når
   * ingen av kandidatene passer/lar seg bekrefte. */
  searchTerm: string;
  /** De neste 2-3 høyest rangerte kandidatene (ikke den valgte) fra samme
   * søk, til "vis et annet forslag i stedet"-knappen i admin. */
  alternates: VinmonopoletAlternate[];
}

/** Maks antall kandidater vi henter ekte pris/bekrefter fortsatt-i-salg for
 * per forespørsel, for å holde belastningen mot Vinmonopolets forbrukerside
 * lav (se merknad i lib/ai/vinmonopolet.ts). Vi stopper så fort én lykkes. */
const MAX_PRICE_CHECKS = 4;

/** Tar AI-ens rangerte navneliste og bygger den faktiske rekkefølgen vi
 * sjekker ekte pris i – ukjente/uteglemte navn faller tilbake til
 * kandidatenes opprinnelige (nylig-oppdatert-først) rekkefølge på slutten,
 * så vi alltid har noe å sjekke selv om rangeringen er kort eller rar. */
function resolveRankedOrder(rankedNames: string[], candidates: VinmonopoletProduct[]): VinmonopoletProduct[] {
  const used = new Set<string>();
  const ordered: VinmonopoletProduct[] = [];

  for (const name of rankedNames || []) {
    const normalized = (name || "").trim().toLowerCase();
    if (!normalized) continue;
    const match = candidates.find((c) => !used.has(c.productId) && c.productShortName.trim().toLowerCase() === normalized);
    if (match) {
      ordered.push(match);
      used.add(match.productId);
    }
  }

  for (const candidate of candidates) {
    if (!used.has(candidate.productId)) {
      ordered.push(candidate);
      used.add(candidate.productId);
    }
  }

  return ordered;
}

/**
 * Finner et EKTE produkt fra Vinmonopolets sortiment som passer til retten.
 * Tre steg:
 *
 *   1. AI-en foreslår et konkret søkeord (drue/vinstil) ut fra retten og
 *      vinstil-anbefalingen.
 *   2. Vi søker i Vinmonopolets EKTE sortiment med det ordet (det
 *      offisielle API-et – se lib/ai/vinmonopolet.ts), og ber AI-en
 *      rangere kandidatene etter hvor godt navnet passer retten/vinstilen.
 *   3. Vi går gjennom den rangerte listen og henter EKTE pris direkte fra
 *      hver produktside (fetchVinmonopoletProductPriceNok) til vi finner
 *      én som fortsatt gir en lesbar pris (dvs. trolig fortsatt i salg),
 *      eller til vi når MAX_PRICE_CHECKS. Dette gir i tillegg en ekstra,
 *      mer pålitelig sjekk på at produktet faktisk fortsatt selges enn
 *      "sist oppdatert i masterdata" alene.
 *
 * Produktnavn, lenke, bilde og pris er alltid ekte. Vi ber IKKE AI-en
 * gjette noe kr-beløp (to tidligere forsøk på det bommet kraftig, bl.a. en
 * 2399 kr-vin anslått til 195 kr) – prisen som vises er alltid nettopp
 * hentet fra selve produktsiden. Ingen prisklasse å velge her – forslaget
 * er kun styrt av retten/vinstilen.
 *
 * Hvis INGEN av de sjekkede kandidatene lot seg bekrefte fortsatt i salg
 * (dvs. alle MAX_PRICE_CHECKS forsøk ga null pris), faller "chosen" tilbake
 * til orderedCandidates[0] som en BESTE GJETNING, og confirmed settes til
 * false – se feltets kommentar på VinmonopoletSuggestion for hvordan
 * kallerne bruker dette (ønsket av Henrik 11.09.2026 etter at et utgått
 * produkt – "Kan ikke bestilles" – ble foreslått som om det var i salg).
 */
export async function getVinmonopoletWineSuggestion(
  recipe: RecipeContext,
  wineStyleText: string,
  lang: Lang = "no",
): Promise<VinmonopoletSuggestion> {
  const keywordSystem =
    "You suggest a short search term for looking up real wines in a Norwegian retailer's (Vinmonopolet) product " +
    "catalog. Given a dish and a wine style recommendation, respond with ONLY JSON in exactly this shape: " +
    '{"searchTerm": "1-3 words, e.g. a grape variety or common wine style name as it would typically appear in a ' +
    'product name on Vinmonopolet, such as \\"Malbec\\", \\"Chianti\\", \\"Sauvignon Blanc\\" or \\"Ros\\u00e9\\""}';
  const keywordPrompt =
    `Dish: ${recipe.title}\nWine style recommendation: ${wineStyleText}\n\nSuggest the single best search term.`;

  const { searchTerm } = await callClaudeJSON<{ searchTerm: string }>(keywordSystem, keywordPrompt, 100);
  const cleanedTerm = (searchTerm || "").trim().slice(0, 40);
  if (!cleanedTerm) {
    throw new Error(
      lang === "en"
        ? "Couldn't figure out what to search for. Please try again."
        : "Klarte ikke å finne ut hva vi skulle søke etter. Prøv igjen.",
    );
  }

  const candidates = await searchVinmonopoletProducts(cleanedTerm, 30);
  if (candidates.length === 0) {
    throw new Error(
      lang === "en"
        ? `Found no matches for "${cleanedTerm}" in Vinmonopolet's assortment. Please try again.`
        : `Fant ingen treff på «${cleanedTerm}» i Vinmonopolets sortiment. Prøv igjen.`,
    );
  }

  const rankSystem =
    "You are a knowledgeable sommelier. You are given a dish and a list of REAL candidate wine products (name + " +
    "internal id + last-updated date) from a Norwegian retailer's (Vinmonopolet) master-data catalog, sorted with " +
    "the most recently updated first. The catalog has no price or stock-status data and can include discontinued " +
    "products, so treat recency as a light positive signal too. Rank up to 10 candidates from BEST to WORST fit " +
    "for the dish (grape/style match). You MUST copy each name EXACTLY as given in the list, character for " +
    "character.\n\n" +
    'Respond with ONLY JSON in exactly this shape: {"rankedNames": ["best match exact name", "next best exact ' +
    'name", ...]}';
  const rankPrompt =
    `Dish: ${recipe.title}\nDescription: ${recipe.description || "(none)"}\n\n` +
    `Real products from the catalog, most recently updated first:\n${candidates
      .map((c) => `- ${c.productShortName} (id: ${c.productId}, last updated: ${c.lastChangedDate ?? "unknown"})`)
      .join("\n")}`;

  const { rankedNames } = await callClaudeJSON<{ rankedNames: string[] }>(rankSystem, rankPrompt, 400);
  const orderedCandidates = resolveRankedOrder(rankedNames, candidates);

  let chosen: VinmonopoletProduct = orderedCandidates[0];
  let priceNok: number | null = null;
  let confirmed = false;

  for (let i = 0; i < Math.min(orderedCandidates.length, MAX_PRICE_CHECKS); i++) {
    const candidate = orderedCandidates[i];
    const price = await fetchVinmonopoletProductPriceNok(candidate.productId);
    if (price !== null) {
      chosen = candidate;
      priceNok = Math.round(price);
      confirmed = true;
      break;
    }
  }

  const reasonSystem =
    "You are a friendly sommelier writing a short note recommending a specific real wine for a dish, for a guest " +
    "who will click through to buy it. You are given the dish and the wine's real, verified name" +
    (priceNok !== null ? " and price in NOK (you may state this price confidently, it is verified real data)" : "") +
    `. Write 1-2 sentences. Respond with ONLY JSON in exactly this shape: {"reasoning": "1-2 sentences in ${lang === "en" ? "English" : "Norwegian"}"}`;
  const reasonPrompt =
    `Dish: ${recipe.title}\nWine: ${chosen.productShortName}\n` +
    (priceNok !== null ? `Verified price: ${priceNok} NOK` : "Price: not available this time");

  const { reasoning } = await callClaudeJSON<{ reasoning: string }>(reasonSystem, reasonPrompt, 200);

  // De 3 neste kandidatene EN ETTER chosen i den rangerte rekkefølgen (uansett
  // om chosen ble bekreftet eller ikke) – til "vis et annet forslag"-knappen
  // i admin. Ubekreftet pris/status her, se VinmonopoletAlternate sin
  // filheader – kun navn/lenke/bilde, ingen ekstra live-oppslag før admin
  // faktisk velger å se nærmere på én av dem.
  const alternates: VinmonopoletAlternate[] = orderedCandidates
    .filter((c) => c.productId !== chosen.productId)
    .slice(0, 3)
    .map((c) => ({
      productName: c.productShortName,
      productId: c.productId,
      url: vinmonopoletProductUrl(c.productId),
      imageUrl: vinmonopoletProductImageUrl(c.productId),
    }));

  return {
    productName: chosen.productShortName,
    productId: chosen.productId,
    url: vinmonopoletProductUrl(chosen.productId),
    imageUrl: vinmonopoletProductImageUrl(chosen.productId),
    reasoning: (reasoning || "").slice(0, 500),
    priceNok,
    confirmed,
    searchTerm: cleanedTerm,
    alternates,
  };
}

export interface ResolvedVinmonopoletProduct {
  productId: string;
  productName: string;
  url: string;
  imageUrl: string;
  /** Se VinmonopoletSuggestion.priceNok – samme "alltid ekte, aldri
   * AI-gjettet"-prinsipp, bare for ETT konkret, admin-valgt produkt i
   * stedet for et AI-rangert søk. */
  priceNok: number | null;
}

/** Henter EKTE navn/pris/bilde for ett KJENT produkt-ID – ingen AI, ingen
 * søk, kun ett direkte produktside-oppslag (se
 * fetchVinmonopoletProductDetails). Brukt av admin til å (a) slå opp et
 * alternativ fra VinmonopoletSuggestion.alternates før det pinnes, og (b)
 * som siste steg i resolveVinmonopoletProductFromUrl under. Krever ikke
 * innlogging (rent lese-oppslag, ingen hemmeligheter/skriving involvert) –
 * samme tillitsnivå som getVinmonopoletWineSuggestion over, men kalt fra
 * admin-UI-et i praksis. */
export async function resolveVinmonopoletProductById(
  productId: string,
): Promise<{ success: boolean; product?: ResolvedVinmonopoletProduct; error?: string }> {
  const trimmedId = productId.trim();
  if (!trimmedId) {
    return { success: false, error: "Mangler produkt-ID." };
  }

  const details = await fetchVinmonopoletProductDetails(trimmedId);
  if (!details) {
    return {
      success: false,
      error: "Fant ikke produktet hos Vinmonopolet – sjekk at ID-en/lenken faktisk peker på en gyldig produktside.",
    };
  }

  return {
    success: true,
    product: {
      productId: trimmedId,
      productName: details.productName,
      url: vinmonopoletProductUrl(trimmedId),
      imageUrl: vinmonopoletProductImageUrl(trimmedId),
      priceNok: details.priceNok,
    },
  };
}

/**
 * Samme som resolveVinmonopoletProductById over, men starter fra en HEL
 * produktlenke admin har limt inn (kopiert rett fra adresselinja på en ekte
 * Vinmonopolet-produktside) i stedet for en kjent ID – se
 * extractVinmonopoletProductId i lib/ai/vinmonopolet.ts for hvordan ID-en
 * trekkes ut. Dette er den tredje veien til et konkret vinforslag (ønsket av
 * Henrik 11.09.2026: "gå inn på vinmonopolet, hente linken til en vin, og
 * lime den inn på siden"), helt uavhengig av AI-søket over – admin har
 * allerede funnet nøyaktig riktig flaske selv.
 */
export async function resolveVinmonopoletProductFromUrl(
  url: string,
): Promise<{ success: boolean; product?: ResolvedVinmonopoletProduct; error?: string }> {
  const productId = extractVinmonopoletProductId(url);
  if (!productId) {
    return {
      success: false,
      error: "Fant ingen gjenkjennelig Vinmonopolet-produktlenke i teksten (ser etter et «/p/<tall>»-mønster).",
    };
  }
  return resolveVinmonopoletProductById(productId);
}
