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

// "Variert" OG den kombinerte WeeklyMenuChoice-typen flyttet hit fra
// WeeklyMenuView.tsx (28.09.2026) – "lagre ukesmeny"/"se lagrede
// ukesmenyer" (se lib/hooks/useSavedWeeklyMenus.ts og
// SavedWeeklyMenusList.tsx) trenger å kjenne igjen/vise akkurat den samme
// stil-typen som selve genereringen bruker, uten å måtte importere den fra
// en klientkomponent (WeeklyMenuView.tsx er "use client" og eier UI-et for
// selve pille-raden, ikke et sted andre moduler bør hente en TYPE fra).
export const VARIED_CHOICE = "variert" as const;
export type WeeklyMenuChoice = typeof VARIED_CHOICE | WeeklyMenuStyleId;
