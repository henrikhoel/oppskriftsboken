/**
 * Prisklasser brukt av det konkrete Vinmonopolet-forslaget (se
 * lib/actions/vinmonopolet.ts og components/recipe/WineSection.tsx).
 * Samme mønster som lib/wine-verdict.ts – enkle no/en-label-maps ved
 * siden av selve unionen, ikke en del av t()-ordboken.
 *
 * Grensene under (WINE_PRICE_BAND_BOUNDS) brukes til å sjekke EKTE priser
 * hentet direkte fra Vinmonopolets egne produktsider (se
 * fetchVinmonopoletProductPriceNok i lib/ai/vinmonopolet.ts) – IKKE til å
 * be en AI gjette en pris. To tidligere forsøk med AI-gjetting (både et
 * konkret kr-tall og en løsere stilvurdering) bommet for kraftig i praksis
 * (bl.a. en 2399 kr-vin for "under 150 kr") til å være til å stole på.
 */

export type WinePriceBand = "under_150" | "150_250" | "250_400" | "over_400";

export const WINE_PRICE_BANDS: WinePriceBand[] = ["under_150", "150_250", "250_400", "over_400"];

export const WINE_PRICE_BAND_LABELS: Record<WinePriceBand, string> = {
  under_150: "Under 150 kr",
  "150_250": "150–250 kr",
  "250_400": "250–400 kr",
  over_400: "Over 400 kr",
};

export const WINE_PRICE_BAND_LABELS_EN: Record<WinePriceBand, string> = {
  under_150: "Under 150 NOK",
  "150_250": "150–250 NOK",
  "250_400": "250–400 NOK",
  over_400: "Over 400 NOK",
};

/** Brukt i AI-prompten (lib/actions/vinmonopolet.ts) – på engelsk uansett
 * visningsspråk, siden modellen resonnerer mer presist rundt tallområder
 * skrevet på ett fast format. Brukes KUN til å styre søkeordet (steg 1),
 * ikke til noen prisgjetning. */
export const WINE_PRICE_BAND_PROMPT_TEXT: Record<WinePriceBand, string> = {
  under_150: "under 150 NOK",
  "150_250": "between 150 and 250 NOK",
  "250_400": "between 250 and 400 NOK",
  over_400: "over 400 NOK",
};

/** Numeriske grenser (kr) brukt til å vurdere EKTE, hentede priser opp mot
 * ønsket prisklasse. `max: null` betyr ingen øvre grense (over_400). */
export const WINE_PRICE_BAND_BOUNDS: Record<WinePriceBand, { min: number; max: number | null }> = {
  under_150: { min: 0, max: 150 },
  "150_250": { min: 150, max: 250 },
  "250_400": { min: 250, max: 400 },
  over_400: { min: 400, max: null },
};
