/**
 * Kun typen – ingen imports. Ligger i en egen fil UTEN avhengighet til
 * next/headers, slik at "use client"-komponenter kan importere Lang (og
 * ordboken i dictionary.ts, som også bruker denne fila) uten at Next sin
 * "next/headers i en klientkomponent"-sjekk slår ut. lib/i18n/lang.ts
 * (som faktisk leser cookien via next/headers) importeres KUN fra Server
 * Components – aldri via barrel-fila lib/i18n/index.ts.
 */
export type Lang = "no" | "en";
