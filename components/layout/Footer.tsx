import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { BackToTopLink } from "@/components/layout/BackToTopLink";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { t, type Lang } from "@/lib/i18n";

export function Footer({ lang }: { lang: Lang }) {
  return (
    // mt-20 (5rem) – forsiden (app/page.tsx) kansellerer nøyaktig denne
    // (pluss <main> sin egen pb-20 på mobil, se app/layout.tsx) med sin egen
    // -mb-40 md:-mb-20 på siden sin ytterste div, siden den (og kun den)
    // alltid slutter med et fullbredde bakgrunnsbilde helt ut til kantene
    // (ClosingQuoteSection) og IKKE skal ha noen bar, svart avstand foran
    // footeren. Endres denne verdien, må regnestykket i app/page.tsx sin
    // egen kommentar oppdateres likt.
    <footer className="mt-20 border-t border-line bg-cream-dark/60 pb-24 md:pb-0">
      {/* "Til toppen"-pil – motstykket til "bla nedover"-pilen i heroen
          (app/page.tsx sin ScrollDownHint.tsx). Egen liten "use client"-fil
          (BackToTopLink.tsx) siden den nå gjør sin egen smooth-scroll i JS
          i stedet for å lene seg på det globale scroll-behavior: smooth
          som ble fjernet 10.09.2026 – se filheaderen i globals.css/
          BackToTopLink.tsx for hvorfor. Lenker til id="top" på <body>
          (app/layout.tsx), så den fungerer fra bunnen av enhver side, ikke
          bare forsiden. */}
      <BackToTopLink lang={lang} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-xl text-ink">{siteConfig.name}</p>
            {/* Brukte tidligere home.eyebrow ("Din digitale kokebok"), som ble
             * tatt bort fra selve heroen til fordel for home.subtitleRest
             * ("Det beste skjer rundt bordet.") – footeren viste da fortsatt
             * den gamle frasen, inkonsekvent med resten av siden. Samme
             * frase som heroen nå, for ett konsistent avsluttende inntrykk. */}
            <p className="mt-2 max-w-sm text-sm italic text-ink-soft">{t(lang, "home.subtitleRest")}</p>
          </div>
          <nav aria-label={t(lang, "footer.ariaLabel")} className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/oppskrifter" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.allRecipes")}
            </Link>
            <Link href="/favoritter" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.favorites")}
            </Link>
            <Link href="/handleliste" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.shoppingList")}
            </Link>
            <Link href="/admin/login" className="text-ink-soft hover:text-ink">
              {t(lang, "footer.admin")}
            </Link>
            {/* (27.09.2026) Svært diskret inngang til DSVDV – det skjulte,
             * passordbeskyttede jobbmat-området for kolleger (se
             * app/dsvdv/ og lib/dsvdv/session.ts). Bevisst IKKE i
             * hovednavigasjonen (Header.tsx) – kun her, plassert sammen med
             * de minst fremtredende lenkene. Ingen forklaring/tooltip/
             * undertittel ("de som vet, de vet") – derfor heller ingen
             * t(lang, ...)-oversettelse, aria-label eller title-attributt,
             * bare den nakne teksten "DSVDV". text-ink-faint (mattere enn
             * text-ink-soft de andre lenkene bruker) for at den skal synke
             * enda lenger ned i bakgrunnen visuelt. */}
            <Link href="/dsvdv" className="text-ink-faint hover:text-ink-soft">
              DSVDV
            </Link>
          </nav>
        </div>
        {/* NO/EN flyttet hit fra Header.tsx (28.09.2026) – Henrik: "du kan
            godt legge NO/EN nede på siden i stedet for". Bakgrunn: header-
            navigasjonen (logo + søk + alle lenkene + handleliste/+/logg ut
            + NO/EN) ble for bred til å få plass på vanlige skjermbredder
            (1024–1500px), og NO/EN – som det siste elementet i raden – ble
            dermed skjøvet helt utenfor synlig område i stedet for å brytes
            til ny linje eller krympe ("NO/EN ligger utenfor"). Enklere å
            fjerne den fra den trange headerraden helt enn å presse den inn
            med enda strammere paddinger. Samme LanguageSwitcher-komponent
            som før, bare et annet sted. */}
        <div className="mt-10 flex items-center justify-between">
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <LanguageSwitcher lang={lang} />
        </div>
      </div>
    </footer>
  );
}
