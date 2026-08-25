import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n/types";

/**
 * SERVER-ONLY. Importeres direkte fra "@/lib/i18n/lang" i Server
 * Components/pages – ALDRI via barrel-fila "@/lib/i18n" (den re-eksporterer
 * bevisst ikke dette), fordi next/headers ikke kan havne i en
 * "use client"-komponents modulgraf uten at build-en feiler.
 *
 * Enkel to-språks støtte (norsk/engelsk) uten full i18n-rute-omlegging
 * (ingen /en/... -ruter). Valget lagres i en cookie slik at Server
 * Components kan lese det synkront ved rendering (ingen "flash" av norsk
 * før klienten har rukket å hydrere). Server Actions setter cookien –
 * se lib/actions/lang.ts.
 */

export const LANG_COOKIE = "lang";
export type { Lang };

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "no";
}
