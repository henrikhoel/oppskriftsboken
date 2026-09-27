import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Gjelder for HELE DSVDV-området (denne siden og alle undersider:
 * /dsvdv/mikro, /airfryer, /toastjern, /null-innsats) – én eksplisitt
 * noindex/nofollow her, i stedet for å måtte huske å gjenta den på hver
 * enkelt side. Next.js sin metadata-sammenslåing arver dette feltet ned
 * til alle barne-rutene siden ingen av dem eksporterer sin egen `robots`
 * (se app/oppskrifter/[slug]/page.tsx for et vanlig eksempel på en side
 * som IKKE trenger dette).
 *
 * Selve INNHOLDET beskyttes separat, server-side, av
 * lib/dsvdv/session.ts (requireDsvdvSession) – dette er kun søkemotor-
 * signalet ("ikke indekser"), ikke selve tilgangskontrollen. Se for øvrig
 * app/robots.ts, som for tiden disallow-er hele nettstedet av en
 * uavhengig, eldre grunn – denne eksplisitte noindex-en her er riktig og
 * ønsket uansett, og upåvirket om/når den globale disallow-en endres.
 *
 * Rent gjennomsyn – ingen egen <html>/<body>, ingen navigasjon lagt til
 * eller fjernet her. DSVDV-sidene rendres fortsatt inne i det vanlige
 * sideskallet (Header/Footer/BottomNav i app/layout.tsx), bevisst for å
 * ikke røre eksisterende funksjonalitet/design mer enn nødvendig.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DsvdvLayout({ children }: { children: ReactNode }) {
  return children;
}
