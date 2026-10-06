"use client";

import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * Erstatter det tidligere faste `<main>`-elementet i app/layout.tsx. Selve
 * `pb-20 md:pb-0` der finnes KUN for å gi plass til BottomNav (den faste
 * bunnmenyen på mobil) – nå som BottomNav er skjult inne i DSVDV (se
 * HideOnDsvdv.tsx), ville den samme polstringen bare vært unødvendig tomt
 * rom under innholdet der, nøyaktig samme type problem vi nettopp ryddet
 * opp i på den vanlige oppskriftssiden (se app/oppskrifter/[slug]/
 * page.tsx sin filheader, 27.09.2026-rettelsen). Samme pathname-sjekk som
 * HideOnDsvdv.tsx – se filheaderen der for hvorfor dette må være en tynn
 * klient-komponent i stedet for et proxy.ts/Edge-hack.
 *
 * (06.10.2026) `flex-1` FJERNET – Henrik, med skjermbilde av "i sesong" på
 * en rolig dag med lite innhold: "den mørkegrå delen nederst inne på 'i
 * sesong' må fjernes [...] sånn at footeren kommer lenger opp". `flex-1`
 * (sammen med `min-h-screen flex flex-col` på <body>, se app/layout.tsx)
 * er det klassiske "sticky footer"-grepet – <main> strekkes til å fylle
 * ALL gjenværende høyde opp til skjermhøyden på en KORT side, slik at
 * footeren alltid står nederst i viewporten i stedet for å flyte rett
 * under innholdet. Problemet: en sides EGEN bakgrunnsfarge (f.eks.
 * app/sesong/page.tsx sin `bg-black`-wrapper) dekker kun selve INNHOLDET,
 * ikke resten av det kunstig oppstrekte <main>-elementet – det tomme
 * mellomrommet viste i stedet <body> sin egen `bg-cream` (nesten, men ikke
 * helt, samme sort som `bg-black`), altså akkurat den synlige "mørkegrå"
 * sømmen/det tomme feltet Henrik så. Uten `flex-1` får <main> nå alltid sin
 * naturlige, innholdsbestemte høyde – footeren følger rett etter, uansett
 * hvor kort siden er. Trygt sidedekkende (ikke en engangsfiks kun for
 * /sesong): hele CONVITE-paletten er allerede gjennomgående nesten-sort
 * (--color-cream, se app/globals.css), så et evt. synlig <body>-felt under
 * en kort side sitt innhold på en høy skjerm er uansett i praksis
 * umulig å skille fra resten av siden – helt annerledes enn det hvite
 * "hull"-problemet dette mønsteret normalt løser på lyse design.
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDsvdv = pathname?.startsWith("/dsvdv");

  return (
    <main id="main-content" className={clsx("print:pb-0", !isDsvdv && "pb-20 md:pb-0")}>
      {children}
    </main>
  );
}
