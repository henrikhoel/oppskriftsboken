/**
 * Delt register for "Velg stil for uken" på /ukesmeny (30.09.2026). Fire
 * faste stiler – IKKE fritekst, samme "lite, fast sett fremfor AI-gjetting
 * eller frie tagger"-begrunnelse som lib/kitchen-intelligence/moods.ts.
 * Henrik: "Jeg vil at brukeren skal få muligheten til å velge hvordan uken
 * skal være ... dette blir igjen, likt som de andre kategoriene og humør,
 * noe jeg kan velge inne på admin siden selv, slik at det kun genereres ut
 * ifra rettene i den bestemte kategorien brukeren velger."
 *
 * "Variert" (standardvalget) er BEVISST IKKE med i denne listen – det er
 * ikke en admin-satt kategori en oppskrift kan tagges med, men en
 * pseudo-stil som betyr "ingen stilfilter, bruk hele den kvalifiserte
 * poolen" (dagens opprinnelige oppførsel). Se WeeklyMenuView.tsx sin
 * WeeklyMenuChoice-type, som legger "variert" til ved siden av denne
 * listens fire id-er på klientsiden.
 */

export const WEEKLY_MENU_STYLE_DEFINITIONS = [
  { id: "sunt_enkelt", labelKey: "weeklyMenu.style.sunt_enkelt" },
  { id: "rask", labelKey: "weeklyMenu.style.rask" },
  { id: "familievennlig", labelKey: "weeklyMenu.style.familievennlig" },
  { id: "litt_ekstra", labelKey: "weeklyMenu.style.litt_ekstra" },
] as const;

export type WeeklyMenuStyleId = (typeof WEEKLY_MENU_STYLE_DEFINITIONS)[number]["id"];
