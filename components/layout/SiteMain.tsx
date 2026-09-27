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
 */
export function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDsvdv = pathname?.startsWith("/dsvdv");

  return (
    <main id="main-content" className={clsx("flex-1 print:pb-0", !isDsvdv && "pb-20 md:pb-0")}>
      {children}
    </main>
  );
}
