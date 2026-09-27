"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BookIcon, CameraIcon, HelpCircleIcon, HomeIcon, LeafIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Handleliste og Favoritter fjernet herfra 26.09.2026 (Henrik: "'handleliste'
// kan fjernes fra linja nede siden den allerede er oppe på siden" / "Favoritter
// kan flyttes fra linja nede til å kun være et hjerte øverst ved siden av
// handlelista og søksymbolet") – begge nås nå kun via ikonene øverst i Header
// (handleliste-bag-ikonet fantes der fra før, hjerte-ikonet er nytt, se
// Header.tsx). Frigjorde plass i bunnmenyen brukt til "I sesong" i stedet
// (samme tilbakemelding, punkt 4: "Nå som vi har fått plass på linja nede kan
// vi legge inn 'i sesong' på telefon også").
const NAV_ITEMS = [
  { href: "/", labelKey: "nav.home", icon: HomeIcon },
  { href: "/oppskrifter", labelKey: "nav.recipes", icon: BookIcon },
  { href: "/hva-kan-jeg-lage", labelKey: "nav.pantry", icon: CameraIcon },
  // "Hvordan gjør jeg det?" (27.08.2026) – kunnskapsbiblioteket for
  // kjøkkenteknikker, se app/hvordan-gjor-jeg-det/*. Bruker den KORTE
  // nav.guidesShort-teksten her (samme nøkkel spesifikasjonen egentlig kun
  // ga unntak for i desktop-headeren) fordi 5 like brede kolonner i
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
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
       * omtrent litt av 'g'en i 'I sesong'." */}
      <ul className="grid grid-cols-5 px-3">
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
