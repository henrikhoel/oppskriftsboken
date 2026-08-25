"use client";

import { useEffect } from "react";

/**
 * Måler den FAKTISKE høyden på alt det faste/innledende "chrome"-innholdet
 * over selve siden – AppDownloadBanner (ikke sticky, men opptar plass over
 * heroen ved lasting), den sticky headeren, og den faste bunnmenyen
 * (BottomNav, kun synlig på mobil) – og eksponerer dem som CSS-variabler
 * (--app-banner-h / --header-h / --bottom-nav-h) på <html>. Brukt av heroen
 * på forsiden (app/page.tsx) til å regne ut sin egen høyde presist – 100svh
 * minus disse tre – i stedet for å gjette et fast pikselantall.
 *
 * Hvorfor ikke bare et hardkodet tall: disse høydene varierer litt på tvers
 * av iPhone-modeller (ulik safe-area-inset-bottom pga. hakk/Dynamic Island)
 * og med innholdet i AppDownloadBanner, og et par piksler feil var akkurat
 * det som gjorde at heroen enten var litt for kort (neste seksjon tittet
 * opp) eller litt for høy (bla nedover-pilen ble skjøvet under
 * bunnmenyen/utenfor skjermen – se tilbakemelding 25.08.2026, da
 * AppDownloadBanner ble lagt til over headeren uten at denne målingen fulgte
 * med) i tidligere forsøk. Ekte målte verdier treffer alltid nøyaktig,
 * uansett enhet.
 *
 * --bottom-nav-h blir automatisk 0 på skjermer der BottomNav er skjult
 * (md:hidden), siden offsetHeight da er 0 – ingen egen breakpoint-logikk
 * nødvendig her, CSS-en på forsiden bruker samme variabel uansett
 * skjermstørrelse.
 */
export function ChromeHeightVars() {
  useEffect(() => {
    function measure() {
      const appBanner = document.getElementById("app-download-banner");
      const header = document.getElementById("site-header");
      const bottomNav = document.getElementById("bottom-nav");
      document.documentElement.style.setProperty("--app-banner-h", `${appBanner?.offsetHeight ?? 0}px`);
      document.documentElement.style.setProperty("--header-h", `${header?.offsetHeight ?? 0}px`);
      document.documentElement.style.setProperty("--bottom-nav-h", `${bottomNav?.offsetHeight ?? 0}px`);
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return null;
}
