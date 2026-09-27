"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * (27.09.2026) Henrik: "jeg vil at hele øverste linja, med 'i kjøleskapet'
 * osv skal forsvinne når man er inne her, dette er et eget lite sted
 * liksom" – DSVDV (app/dsvdv/) skal ikke ha noe av det vanlige
 * sideskallet rundt seg (Header/Footer/BottomNav), kun sin egen minimale
 * "Ut"-knapp (components/dsvdv/DsvdvTopBar.tsx, satt opp i
 * app/dsvdv/layout.tsx).
 *
 * app/layout.tsx er DEN ENE rot-layouten for HELE appen (Next.js App
 * Router støtter ikke flere separate rot-layouts uten en mye større
 * omstrukturering av rutene, se vurderingen i git-historikken/oppdraget
 * dette ble bygget fra) – Header/Footer/BottomNav kan derfor ikke bare
 * fjernes fra rot-layouten for én bestemt rute uten enten (a) et eget
 * proxy.ts/Edge-matcher-hack, som vi bevisst styrer unna her (se
 * filheaderen i lib/dsvdv/session.ts for hvorfor), eller (b) nettopp
 * denne enkle klient-side pathname-sjekken. `usePathname()` krever "use
 * client" – app/layout.tsx sin RootLayout er fortsatt en vanlig, rask
 * Server Component, kun DENNE tynne wrapperen rundt Header-blokken og
 * Footer+BottomNav-blokken er klient-kode. Server Components (Header,
 * Footer, BottomNav) kan fortsatt sendes inn som `children` her – det er
 * fullt støttet Next.js-komposisjon, selve renderingen deres skjer likevel
 * på serveren, kun av/på-valget er klient-side.
 */
export function HideOnDsvdv({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/dsvdv")) return null;
  return <>{children}</>;
}
