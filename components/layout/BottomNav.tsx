"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BookIcon, CalendarIcon, CameraIcon, HelpCircleIcon, HomeIcon, LeafIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Handleliste og Favoritter fjernet herfra 26.09.2026 (Henrik: "'handleliste'
// kan fjernes fra linja nede siden den allerede er oppe på siden" / "Favoritter
// kan flyttes fra linja nede til å kun være et hjerte øverst ved siden av
// handlelista og søksymbolet") – begge nås nå kun via ikonene øverst i Header
// (handleliste-bag-ikonet fantes der fra før, hjerte-ikonet er nytt, se
// Header.tsx). Frigjorde plass i bunnmenyen brukt til "I sesong" i stedet
// (samme tilbakemelding, punkt 4: "Nå som vi har fått plass på linja nede kan
// vi legge inn 'i sesong' på telefon også").
//
// "Ukesmeny" lagt til (28.09.2026, Henrik: "eeeh hvor er ukesmeny på
// telefon???") – funksjonen ble lagt i Header.tsx sin desktop-nav tidligere
// i samme økt, men BottomNav (selve mobilnavigasjonen) ble aldri oppdatert
// samtidig, så den var i praksis helt utilgjengelig på telefon uten å taste
// inn /ukesmeny direkte. Lagt inn rett etter Oppskrifter – samme rekkefølge
// som Henrik nettopp valgte for desktop-headeren (Oppskrifter → Ukesmeny →
// …). grid-cols-5 → grid-cols-6 under for å gi den plass uten å fjerne noe
// annet fra bunnmenyen.
const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: HomeIcon },
  { href: "/oppskrifter", labelKey: "nav.recipes", icon: BookIcon },
  { href: "/ukesmeny", labelKey: "nav.weeklyMenu", icon: CalendarIcon },
  { href: "/hva-kan-jeg-lage", labelKey: "nav.pantryShort", icon: CameraIcon },
  // "Hvordan gjør jeg det?" (27.08.2026) – kunnskapsbiblioteket for
  // kjøkkenteknikker, se app/hvordan-gjor-jeg-det/*. Bruker den KORTE
  // nav.guidesShort-teksten her (samme nøkkel spesifikasjonen egentlig kun
  // ga unntak for i desktop-headeren) fordi 6 like brede kolonner i
  // bunnmenyen ikke har plass til hele "Hvordan gjør jeg det?" på én linje
  // uten å bryte layouten – selve siden sin <h1> viser fortsatt hele,
  // riktige konseptnavnet uendret, se app/hvordan-gjor-jeg-det/page.tsx.
  { href: "/hvordan-gjor-jeg-det", labelKey: "nav.guidesShort", icon: HelpCircleIcon },
  { href: "/sesong", labelKey: "nav.season", icon: LeafIcon },
] as const;

/**
 * Fast bunnmeny for mobil – dette er den viktigste navigasjonen når man
 * faktisk lager mat med telefonen i hånden. Skjules på større skjermer der
 * Header sin vanlige nav (inkl. språkbryteren) er synlig i stedet.
 */
export function BottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname();

  return (
    <nav
      id="bottom-nav"
      aria-label={t(lang, "nav.mainNavMobile")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-[calc(env(safe-area-inset-bottom)+6px)] md:hidden"
    >
      {/* px-3 på selve rutenettet (IKKE på <nav>, som fortsatt skal ha
       * bakgrunn/border helt ut til kantene) – uten denne satt den ytterste
       * kolonnens tekst ("Hjem" til venstre, "I sesong" til høyre) helt
       * inntil skjermkanten, midt i den avrundede hjørne-sonen nederst på
       * en ekte iPhone. env(safe-area-inset-bottom) over dekker kun
       * hjem-indikatoren (avstand fra BUNNEN), ikke selve hjørne-
       * avrundingen (avstand fra SIDEN nær bunnen) – det finnes ingen egen
       * CSS-variabel for hjørneradiusen, så en fast px-verdi er det
       * pragmatiske svaret (samme løsning som er vanlig i native apper).
       * Henrik, 27.09.2026, med skjermbilde: "telefonen er rund i kantene
       * og kutter derfor ganske mye av den linja. feks så kutter den
       * omtrent litt av 'g'en i 'I sesong'."
       *
       * REGRESJON OG RETTET (28.09.2026) – da Ukesmeny ble lagt til (grid-
       * cols-5 → 6, se lenger opp), ble denne px-3-en midlertidig satt ned
       * til px-1.5 under sm for å gi de seks kolonnene mer bredde. Det
       * fungerte fint i vanlig nettleser (Henrik: "det ser veldig bra ut i
       * nettleseren nå"), men gjeninnførte akkurat 27.09-bugen i den
       * hjemme-skjerm-installerte PWA-en ("appen"): "den kutter litt av
       * 'hjem' og 'i sesong' fordi skjermen er buet [...] det skjer kun i
       * appen fordi linja er helt nede på skjermen, det er den ikke i
       * nettleseren" – i en installert PWA (display: standalone) er det
       * ingen Safari-kant som demper mot skjermens avrundede hjørner slik
       * det er i en vanlig nettleserfane, så den samme rette px-3-marginen
       * som opprinnelig løste dette trengs igjen. Satt tilbake til fast
       * px-3 (droppet sm-reduksjonen) – nav.pantryShort (se over) frigjorde
       * nok bredde til at seks kolonner uansett har plass på én linje med
       * full px-3, se skjermbildet fra vanlig nettleser.
       *
       * BEHOLDER (28.09.2026) – nytt, separat problem, samme rot-årsak
       * (ingen Safari-kant i den installerte "appen"): Henrik, med
       * skjermbilde av "appen": "ser du den streken helt nederst? den
       * kommer noen ganger opp og blokkerer teksten på den nederste linja"
       * – hjem-indikator-streken (swipe-baren iOS tegner rett over selve
       * appen i standalone-modus) lå for tett inntil "Kjøleskapet"-
       * teksten. `pb-[env(safe-area-inset-bottom)]` på <nav> over gir i
       * teorien nøyaktig nok klaring, men iOS sin egen rapporterte
       * safe-area-verdi er tydeligvis for knapp til å alltid unngå visuell
       * overlapp i praksis (bekreftet av Henrik: "på appen altså" – kun i
       * den installerte PWA-en, ikke i vanlig nettleser, samme mønster som
       * px-3-fiksen over). Lagt til 6px ekstra klaring utover selve
       * safe-area-verdien (`calc(env(safe-area-inset-bottom)+6px)`), en
       * vanlig og trygg buffer for akkurat dette – ingen ulempe i
       * nettlesere uten hjem-indikator (safe-area-inset-bottom er da bare
       * 0, så det blir 6px fast bunnmargin der, knapt merkbart). */}
      <ul className="grid grid-cols-6 px-3">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-clay" : "text-ink-faint hover:text-ink-soft",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                </span>
                {t(lang, labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
