/**
 * Klient-trygg barrel. Bevisst UTEN getLang/LANG_COOKIE (de bor i
 * lib/i18n/lang.ts, som importerer next/headers) – en "use client"-fil kan
 * IKKE ha next/headers noe sted i sin modulgraf, selv ikke via en ubrukt
 * re-eksport i en barrel-fil, uten at Next feiler build-en. Server
 * Components som trenger getLang() importerer den direkte fra
 * "@/lib/i18n/lang" i stedet for herfra.
 */
export type { Lang } from "@/lib/i18n/types";
export { t, recipeCountLabel, type DictKey } from "@/lib/i18n/dictionary";
