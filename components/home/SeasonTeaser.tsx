import { getAllSeasonsWithIngredients } from "@/lib/data/seasons";
import { resolveCurrentSeason, resolveInSeasonIngredients } from "@/lib/kitchen-intelligence/seasonal";
import { localizedIngredientName, localizedSeasonName } from "@/lib/utils/season-format";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Forsidens "I sesong nå"-seksjon – omgjort 27.09.2026 fra et smalt,
 * sentrert lenke-kort til en full-bredde stemningsseksjon med samme plass
 * og oppsett som "Mat & vin" (WinePairing.tsx), på Henriks ønske: "'I
 * sesong nå' fortjener samme plass og oppsett som 'mat & vin'. Jeg vil at
 * seksjonen forblir der den er på siden." – POSISJONEN i app/page.tsx
 * (mellom CookModeShowcase og CategoryShowcase, der AtmosphereSection
 * tidligere lå – den seksjonen ble selv fjernet samme dag, se
 * app/page.tsx sin egen kommentar der) er derfor UENDRET, kun selve
 * seksjonens eget uttrykk er bygget om.
 *
 * Gjenbruker bevisst samme seksjons-"skall" som WinePairing.tsx
 * (bakgrunnsbilde satt via vanlig CSS background-image, ikke next/image,
 * med samme kraftige bg-cream-dark/80-overlegg) – se filheaderen der for
 * hvorfor: faller elegant tilbake til den rene bg-cream-dark-fargen uten
 * "broken image"-ikon om public/images/season.jpg skulle mangle, og
 * teksten beholder samme lesbarhet uansett hvor lyst/mørkt bildet selv er.
 * Bildet (rå grønnsaker på en mørk benk) er valgt av Henrik spesifikt til
 * denne seksjonen.
 *
 * py-verdien var opprinnelig identisk med WinePairing (py-16 sm:py-20),
 * men justert opp til py-20 sm:py-28 (samme som ClosingQuoteSection)
 * 27.09.2026 – Henrik, etter å ha sett den ved siden av de nyere
 * bilde-seksjonene: "nå syns jeg sesongdelen er hakket for smal, den er
 * smalere enn resten". WinePairing selv er UENDRET (py-16 sm:py-20) –
 * den var det opprinnelige referansepunktet ("samme plass og oppsett som
 * mat & vin"), men de to seksjonene som kom til SENERE
 * (ClosingQuoteSection, MoodModeSection) endte opp romsligere, og denne
 * skulle helst matche helhetsinntrykket av flertallet, ikke den ene
 * opprinnelige referansen.
 *
 * Innholdet selv er fortsatt EKTE, live data (ikke statisk mock-tekst som
 * CookModeShowcase) – henter sin egen minimale sesongdata direkte her, se
 * den opprinnelige filheader-begrunnelsen under for hvorfor. Selve
 * sesongnavnet (f.eks. "Høst") er nå hovedoverskriften, med et utvalg
 * råvarenavn som ingress under – samme informasjon som det tidligere
 * kortet viste, bare i seksjonens nye, større format. Returnerer null
 * (viser ingenting) i det usannsynlige tilfellet at ingen publisert
 * sesong dekker inneværende måned – robusthet fremfor en tom/ødelagt
 * seksjon, se filheaderen til resolveCurrentSeason.
 */
export async function SeasonTeaser({ lang }: { lang: Lang }) {
  const seasons = await getAllSeasonsWithIngredients();
  const now = new Date();
  const currentSeason = resolveCurrentSeason(seasons, now);
  if (!currentSeason) return null;

  const inSeason = resolveInSeasonIngredients(seasons, now).slice(0, 6);

  return (
    <section className="relative isolate overflow-hidden bg-cream-dark py-20 sm:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/season.jpg)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-cream-dark/80" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
          {t(lang, "home.seasonTeaser.eyebrow")}
        </p>
        <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">
          {localizedSeasonName(currentSeason, lang)}
        </h2>
        {inSeason.length > 0 && (
          <p className="mt-2 text-pretty text-sm text-ink-soft sm:text-base">
            {inSeason.map((entry) => localizedIngredientName(entry.ingredient, lang)).join(", ")}
          </p>
        )}

        <Button href="/sesong" variant="primary" size="md" className="mt-8">
          {t(lang, "home.seasonTeaser.cta")}
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
