"use client";

import { useEffect } from "react";

/**
 * Måler den FAKTISKE høyden på alt det faste/innledende "chrome"-innholdet
 * over selve siden – den sticky headeren, og den faste bunnmenyen
 * (BottomNav, kun synlig på mobil) – og eksponerer dem som CSS-variabler
 * (--header-h / --bottom-nav-h) på <html>. Brukt av heroen på forsiden
 * (app/page.tsx) til å regne ut sin egen høyde presist – 100svh minus disse
 * to – i stedet for å gjette et fast pikselantall.
 *
 * (26.09.2026: målte tidligere også en egen --app-banner-h for
 * "Legg til på hjemskjerm"-bannerlinjen som lå over headeren – linjen er nå
 * fjernet til fordel for et lite ikon INNI headeren (se
 * AppDownloadIconButton.tsx), så den chrome-høyden er borte av seg selv og
 * trenger ikke lenger måles separat.)
 *
 * Hvorfor ikke bare et hardkodet tall: disse høydene varierer litt på tvers
 * av iPhone-modeller (ulik safe-area-inset-bottom pga. hakk/Dynamic Island),
 * og et par piksler feil var akkurat det som gjorde at heroen enten var litt
 * for kort (neste seksjon tittet opp) eller litt for høy (bla nedover-pilen
 * ble skjøvet under bunnmenyen/utenfor skjermen) i tidligere forsøk. Ekte
 * målte verdier treffer alltid nøyaktig, uansett enhet.
 *
 * --bottom-nav-h blir automatisk 0 på skjermer der BottomNav er skjult
 * (md:hidden), siden offsetHeight da er 0 – ingen egen breakpoint-logikk
 * nødvendig her, CSS-en på forsiden bruker samme variabel uansett
 * skjermstørrelse.
 */
export function ChromeHeightVars() {
  useEffect(() => {
    function measure() {
      const header = document.getElementById("site-header");
      const bottomNav = document.getElementById("bottom-nav");
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
