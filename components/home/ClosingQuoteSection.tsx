import { t, type Lang } from "@/lib/i18n";

/**
 * Avsluttende sitat, aller sist på forsiden – flyttet ut av
 * NewestRecipesFeed.tsx (som tidligere rendret det som et nakent, venstre-
 * stilt tekstavsnitt via en lokal ClosingQuote-komponent, se den filens
 * git-historikk) til sin egen, selvstendige seksjon her 27.09.2026, på
 * Henriks ønske: "nederst på siden har vi en quote fra en kokk, denne
 * quoten skal få et bakbrunnsbilde og quoten skal midtstilles. bakgrunnsbildet
 * skal være det jeg har lagt ved her" (bordet med stearinlys/vinglass/
 * spor etter et avsluttet måltid, se public/images/closing-quote.jpg).
 *
 * Gjenbruker bevisst samme seksjons-"skall" som WinePairing.tsx/
 * SeasonTeaser.tsx (bakgrunnsbilde satt via vanlig CSS background-image,
 * ikke next/image, med samme kraftige bg-cream-dark/80-overlegg) – se
 * WinePairing.tsx sin filheader for hvorfor: faller elegant tilbake til
 * den rene bg-cream-dark-fargen uten "broken image"-ikon om bildet skulle
 * mangle, og teksten beholder samme lesbarhet uansett hvor lyst/mørkt
 * bildet selv er.
 *
 * Selve rekkefølgen på siden (knappen "Bla gjennom alle oppskrifter" rett
 * over, sitatet rett under der igjen) er UENDRET fra før – kun EIERSKAPET
 * til selve sitat-rendringen har flyttet fra NewestRecipesFeed til denne
 * egne seksjonen, kalt rett etter i app/page.tsx.
 *
 * Sitatet/attribusjonen er bevisst alltid på fransk (matcher "CONVITE"-
 * navnet); kun den lille oversettelseslinjen bytter språk med resten av
 * siden.
 *
 * KRYMPET (27.09.2026 – Henrik, med skjermbilde av mobilvisningen: "jeg
 * syns teksten her er alt for stor") – selve sitatet var text-xl/2xl/3xl
 * og attribusjonslinjen text-sm; begge ett hakk ned (text-lg/xl/2xl og
 * text-xs) på alle brekkpunkt – seksjonen er helt ny (lagt til tidligere i
 * dag) og har ingen tidligere godkjent desktop-visning å bevare uendret,
 * så justeringen gjelder hele skalaen, ikke bare mobil. Den vesle
 * uppercase-oversettelseslinjen (allerede `text-[10px]`) er urørt.
 */
export function ClosingQuoteSection({ lang }: { lang: Lang }) {
  return (
    <section className="relative isolate overflow-hidden bg-cream-dark py-20 sm:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/closing-quote.jpg)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-cream-dark/80" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-balance font-serif text-lg italic leading-snug text-ink sm:text-xl lg:text-2xl">
          «Dis-moi ce que tu manges, je te dirai ce que tu es.»
        </p>
        <p className="mt-4 text-xs tracking-wide text-clay-dark">Jean Anthelme Brillat-Savarin, 1825</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          {t(lang, "home.editorial.closingQuoteTranslation")}
        </p>
      </div>
    </section>
  );
}
