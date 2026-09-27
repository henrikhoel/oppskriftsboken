import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasDsvdvSession } from "@/lib/dsvdv/session";
import { DsvdvTopBar } from "@/components/dsvdv/DsvdvTopBar";

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
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * (27.09.2026) Henrik: "jeg vil at hele øverste linja, med 'i kjøleskapet'
 * osv skal forsvinne når man er inne her, dette er et eget lite sted
 * liksom. også må man ha en ut knapp" – det vanlige sideskallet (Header/
 * Footer/BottomNav) er nå skjult for HELE /dsvdv (se
 * components/layout/HideOnDsvdv.tsx i app/layout.tsx), og erstattet med
 * DsvdvTopBar sin egen, minimale "Ut"-knapp her.
 *
 * DsvdvTopBar vises KUN når man faktisk er logget inn – ikke oppå selve
 * innloggingsskjermaet (der `hasDsvdvSession()` er false), det gir ingen
 * mening å tilby "gå ut" av noe man ikke er inne i ennå. Dette er en ren
 * LESING (ingen redirect/skriving), trygt å gjøre her i tillegg til hver
 * beskyttede sides egen `requireDsvdvSession()`-vakt.
 */
export default async function DsvdvLayout({ children }: { children: ReactNode }) {
  const loggedIn = await hasDsvdvSession();

  return (
    <>
      {loggedIn && <DsvdvTopBar />}
      {children}
    </>
  );
}
