/**
 * Delt mellom lib/actions/ai.ts (server) og komponenter som viser
 * resultatet (klient). Ligger i en egen fil UTEN "use server", fordi en
 * "use server"-fil kun får eksportere async-funksjoner – en vanlig
 * konstant/type-eksport derfra ville feilet i build.
 */
export const WINE_VERDICTS = ["ikke_bra", "greit", "bra", "meget_bra"] as const;
export type WineVerdict = (typeof WINE_VERDICTS)[number];

export const WINE_VERDICT_LABELS: Record<WineVerdict, string> = {
  ikke_bra: "Ikke bra",
  greit: "Greit",
  bra: "Bra",
  meget_bra: "Meget bra",
};

export const WINE_VERDICT_LABELS_EN: Record<WineVerdict, string> = {
  ikke_bra: "Not great",
  greit: "Fine",
  bra: "Good",
  meget_bra: "Very good",
};
