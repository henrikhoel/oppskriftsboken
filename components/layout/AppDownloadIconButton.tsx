"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SmartphoneIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Legg til på hjemskjerm"-knapp i headeren, ved siden av C-logoen øverst
 * til venstre. Erstatter 26.09.2026 den tidligere egne bannerlinjen over
 * headeren (AppDownloadBannerClient.tsx, nå slettet) – Henrik: "'legg til
 * på hjemskjerm' tar for mye plass på nettleser versjonen. legg heller til
 * kun en liten klikkbar telefonsymbol ved siden av C symbolet øverst til
 * venstre. da vil også bildet av burgeren få mer plass" (heroen på
 * forsiden regner ut sin egen høyde ut fra bl.a. denne linjens høyde, se
 * ChromeHeightVars.tsx – en hel linje mindre chrome over heroen gir en
 * tilsvarende høyere/mer synlig hero på mobil).
 *
 * All logikk (standalone-/plattform-deteksjon, samme hjelpe-ark) er
 * UENDRET fra den tidligere bannerversjonen – kun selve visningen er
 * krympet fra en full bredde-linje til ett lite, rundt ikon. Se historikken
 * til AppDownloadBannerClient.tsx for hvorfor disse to signalene
 * (standalone/plattform) må sjekkes i nettleseren og ikke server-side, og
 * hvorfor selve installasjonen ikke kan trigges med ett trykk.
 */
export function AppDownloadIconButton({ lang }: { lang: Lang }) {
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

  // standalone === null (ukjent, kun kjent etter mount) og === true (allerede
  // i den installerte appen) gir begge ingen ikon – se samme begrunnelse i
  // den tidligere AppDownloadBannerClient.tsx.
  if (standalone !== false) return null;

  const helpText =
    platform === "ios"
      ? t(lang, "appBanner.helpIOS")
      : platform === "android"
        ? t(lang, "appBanner.helpAndroid")
        : t(lang, "appBanner.helpGeneric");

  return (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        aria-label={t(lang, "appBanner.mobileCta")}
        title={t(lang, "appBanner.mobileCta")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink sm:hidden"
      >
        <SmartphoneIcon className="h-4 w-4" />
      </button>

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
