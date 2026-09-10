"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SmartphoneIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Legg til på hjemskjerm"-bannerlinjen (opprinnelig 25.08.2026, gjort om
 * til en ekte, interaktiv PWA-hjelper 10.09.2026 etter tilbakemelding).
 * Splittet ut som EGEN "use client"-fil fra AppDownloadBanner.tsx (som nå
 * kun er en tynn server-wrapper som henter `lang`), fordi denne versjonen
 * trenger to ekte nettleser-signaler ingen server kan vite på forhånd:
 *
 * 1. Er siden allerede åpnet SOM den installerte PWA-en (fra
 *    hjemskjerm-ikonet)? `display-mode: standalone` (Android/Chrome) og
 *    `navigator.standalone` (eldre, men fortsatt det iOS Safari faktisk
 *    setter) er begge rene runtime-verdier i nettleseren – umulig å vite
 *    server-side. Er man ALLEREDE i den installerte appen, er hele
 *    "installer meg"-linjen overflødig og fjernes helt (ikke bare skjules
 *    visuelt) – "fjern den linja helt på selve appen".
 * 2. Selve installasjonen kan IKKE trigges programmatisk med ett trykk fra
 *    JavaScript – verken iOS Safari eller Android Chrome eksponerer noe slikt
 *    for vanlige nettsider (Chrome sin `beforeinstallprompt` finnes, men
 *    Safari støtter den ikke i det hele tatt, så en ren "trykk for å
 *    installere"-knapp ville aldri fungert konsekvent på tvers av
 *    telefoner). Nest beste, ekte løsning: et trykk åpner et lite,
 *    stegvis hjelpe-ark (gjenbruker den delte Drawer.tsx-primitiven) med
 *    riktig fremgangsmåte for AKKURAT den telefonen – enkel
 *    user-agent-gjetning (iOS vs. Android vs. ukjent) styrer hvilken tekst
 *    som vises, siden stegene er reelt forskjellige mellom Safari og Chrome.
 *
 * Skjult på Mac/PC (sm:hidden) – "må bort fra nettsiden på mac og pc":
 * "Legg til på hjemskjerm" er uansett en ren mobil-handling (ingen
 * hjemskjerm å legge noe til på en datamaskin), så QR-kode-varianten som lå
 * her tidligere for desktop er fjernet i samme runde, ikke bare skjult.
 *
 * `standalone` starter som `null` (ukjent, kun kjent etter mount) – både
 * `null` og `true` gir `return null` under, slik at banneret aldri blafrer
 * synlig et øyeblikk på desktop eller inni den installerte appen før
 * effekten rekker å kjøre.
 */
export function AppDownloadBannerClient({ lang }: { lang: Lang }) {
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);

    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");
  }, []);

  if (standalone !== false) return null;

  const helpText =
    platform === "ios"
      ? t(lang, "appBanner.helpIOS")
      : platform === "android"
        ? t(lang, "appBanner.helpAndroid")
        : t(lang, "appBanner.helpGeneric");

  return (
    <>
      {/* NB: --color-cream er den nesten-svarte bakgrunnsfargen og --color-ink
          er den lyse tekstfargen i denne siden sitt (bevisst inverterte)
          fargesystem – bg-cream/text-ink under gir altså en mørk linje med
          lys tekst, ikke omvendt. */}
      <div id="app-download-banner" className="border-b border-clay/15 bg-cream text-ink sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 rounded-full py-1 text-xs font-medium text-ink/90 underline decoration-ink/30 underline-offset-4 transition-colors hover:text-ink"
          >
            <SmartphoneIcon className="h-3.5 w-3.5" />
            {t(lang, "appBanner.mobileCta")}
          </button>
        </div>
      </div>

      <Drawer
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title={t(lang, "appBanner.helpTitle")}
        closeLabel={t(lang, "appBanner.closeAria")}
      >
        <p className="text-sm leading-relaxed text-ink-soft">{helpText}</p>
      </Drawer>
    </>
  );
}
