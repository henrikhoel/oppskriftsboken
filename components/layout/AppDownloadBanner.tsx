import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { AppQrCode } from "@/components/layout/AppQrCode";
import { SmartphoneIcon } from "@/components/ui/icons";

/**
 * Ren FORHÅNDSVISNING av "har vi en app"-tanken (se samtale 25.08.2026) –
 * ligger over <Header/> i app/layout.tsx (samme plassering/mønster som
 * DemoModeBanner), synlig med det samme man kommer inn på siden, men
 * bevisst holdt slank/lav (én tekstlinje høy) – ikke en stor reklameplakat.
 *
 * To ulike uttrykk avhengig av skjermbredde, IKKE samme innhold skjult/vist:
 *   - Fra sm og opp (Mac/nettbrett): en liten, skannbar QR-kode
 *     (AppQrCode.tsx) – man skanner den MED telefonen.
 *   - Under sm (mobilen selv): ingen vits i en QR-kode på skjermen man
 *     allerede holder – i stedet en direkte, kompakt lenke.
 *
 * Verken QR-koden eller lenken peker på noe ekte ennå (ingen publisert app),
 * derfor href="#" og en fremtidsrettet tekst ("Snart som app") i stedet for
 * "Last ned nå" – unngår å love noe som ikke stemmer den dagen banneret
 * faktisk vises for besøkende. Bytt href til de ekte butikk-lenkene (og
 * AppQrCode til en kode som peker på en av dem) den dagen appen finnes.
 */
export async function AppDownloadBanner() {
  const lang = await getLang();

  return (
    // NB: --color-cream er den nesten-svarte bakgrunnsfargen og --color-ink
    // er den lyse tekstfargen i denne siden sitt (bevisst inverterte)
    // fargesystem – bg-cream/text-ink under gir altså en mørk linje med lys
    // tekst, ikke omvendt.
    <div id="app-download-banner" className="border-b border-clay/15 bg-cream text-ink">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 sm:justify-between sm:px-6 lg:px-8">
        <p className="hidden text-xs font-medium uppercase tracking-[0.15em] text-ink-faint sm:block">
          {t(lang, "appBanner.text")}
        </p>

        {/* Mac/nettbrett: skann med telefonen. */}
        <a
          href="#"
          className="hidden items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-ink/90 transition-colors hover:text-ink sm:flex"
        >
          {/* QR-koden selv skal ha vanlig, lesbar polaritet (mørke moduler på
              lys bunn) uansett hvor den ligger – derfor bg-ink/text-cream her
              (lys bunn/mørke firkanter), motsatt av linjens egen bg-cream. */}
          <AppQrCode className="h-8 w-8 shrink-0 rounded-[3px] bg-ink p-0.5 text-cream" />
          <span className="text-xs text-ink-faint">{t(lang, "appBanner.scanHint")}</span>
        </a>

        {/* Mobil: ingen QR-kode å skanne med telefonen man allerede holder –
            bare en direkte lenke. */}
        <a
          href="#"
          className="flex items-center gap-1.5 rounded-full py-1 text-xs font-medium text-ink/90 transition-colors hover:text-ink sm:hidden"
        >
          <SmartphoneIcon className="h-3.5 w-3.5" />
          {t(lang, "appBanner.mobileCta")}
        </a>
      </div>
    </div>
  );
}
