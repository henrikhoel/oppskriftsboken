/**
 * Statisk, ferdig-generert QR-kode – brukt av AppDownloadBanner.tsx som en
 * forhåndsvisning av "har vi en app"-tanken (se samtale). Peker IKKE til
 * noen ekte App Store/Google Play-lenke ennå – koden er generert lokalt
 * (libqrencode, ikke noe eksternt QR-bibliotek i selve nettsiden) fra
 * teksten "A TABLE - appen kommer snart" og verifisert til å faktisk lese
 * riktig tilbake. Ren inline SVG (33x33 "moduler", inkl. 4-moduls stillesone
 * rundt kanten per QR-spesifikasjonen) – ingen ekstra npm-avhengighet,
 * ingen nettverkskall, skalerer skarpt i alle størrelser via viewBox.
 * Bytt ut med en ekte kode (samme oppskrift) den dagen appen faktisk finnes.
 */
export function AppQrCode({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 33 33"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <rect x="4" y="4" width="7" height="1" />
        <rect x="12" y="4" width="2" height="1" />
        <rect x="15" y="4" width="1" height="1" />
        <rect x="17" y="4" width="1" height="1" />
        <rect x="19" y="4" width="1" height="1" />
        <rect x="22" y="4" width="7" height="1" />
        <rect x="4" y="5" width="1" height="1" />
        <rect x="10" y="5" width="1" height="1" />
        <rect x="13" y="5" width="2" height="1" />
        <rect x="16" y="5" width="4" height="1" />
        <rect x="22" y="5" width="1" height="1" />
        <rect x="28" y="5" width="1" height="1" />
        <rect x="4" y="6" width="1" height="1" />
        <rect x="6" y="6" width="3" height="1" />
        <rect x="10" y="6" width="1" height="1" />
        <rect x="12" y="6" width="3" height="1" />
        <rect x="16" y="6" width="1" height="1" />
        <rect x="18" y="6" width="1" height="1" />
        <rect x="22" y="6" width="1" height="1" />
        <rect x="24" y="6" width="3" height="1" />
        <rect x="28" y="6" width="1" height="1" />
        <rect x="4" y="7" width="1" height="1" />
        <rect x="6" y="7" width="3" height="1" />
        <rect x="10" y="7" width="1" height="1" />
        <rect x="13" y="7" width="1" height="1" />
        <rect x="15" y="7" width="2" height="1" />
        <rect x="18" y="7" width="1" height="1" />
        <rect x="20" y="7" width="1" height="1" />
        <rect x="22" y="7" width="1" height="1" />
        <rect x="24" y="7" width="3" height="1" />
        <rect x="28" y="7" width="1" height="1" />
        <rect x="4" y="8" width="1" height="1" />
        <rect x="6" y="8" width="3" height="1" />
        <rect x="10" y="8" width="1" height="1" />
        <rect x="14" y="8" width="4" height="1" />
        <rect x="22" y="8" width="1" height="1" />
        <rect x="24" y="8" width="3" height="1" />
        <rect x="28" y="8" width="1" height="1" />
        <rect x="4" y="9" width="1" height="1" />
        <rect x="10" y="9" width="1" height="1" />
        <rect x="12" y="9" width="2" height="1" />
        <rect x="15" y="9" width="5" height="1" />
        <rect x="22" y="9" width="1" height="1" />
        <rect x="28" y="9" width="1" height="1" />
        <rect x="4" y="10" width="7" height="1" />
        <rect x="12" y="10" width="1" height="1" />
        <rect x="14" y="10" width="1" height="1" />
        <rect x="16" y="10" width="1" height="1" />
        <rect x="18" y="10" width="1" height="1" />
        <rect x="20" y="10" width="1" height="1" />
        <rect x="22" y="10" width="7" height="1" />
        <rect x="13" y="11" width="4" height="1" />
        <rect x="19" y="11" width="2" height="1" />
        <rect x="4" y="12" width="1" height="1" />
        <rect x="6" y="12" width="1" height="1" />
        <rect x="10" y="12" width="2" height="1" />
        <rect x="13" y="12" width="1" height="1" />
        <rect x="17" y="12" width="1" height="1" />
        <rect x="19" y="12" width="1" height="1" />
        <rect x="23" y="12" width="1" height="1" />
        <rect x="26" y="12" width="1" height="1" />
        <rect x="28" y="12" width="1" height="1" />
        <rect x="4" y="13" width="2" height="1" />
        <rect x="7" y="13" width="2" height="1" />
        <rect x="11" y="13" width="1" height="1" />
        <rect x="13" y="13" width="1" height="1" />
        <rect x="15" y="13" width="1" height="1" />
        <rect x="18" y="13" width="2" height="1" />
        <rect x="21" y="13" width="1" height="1" />
        <rect x="25" y="13" width="1" height="1" />
        <rect x="4" y="14" width="1" height="1" />
        <rect x="9" y="14" width="3" height="1" />
        <rect x="16" y="14" width="1" height="1" />
        <rect x="20" y="14" width="1" height="1" />
        <rect x="22" y="14" width="2" height="1" />
        <rect x="25" y="14" width="1" height="1" />
        <rect x="28" y="14" width="1" height="1" />
        <rect x="5" y="15" width="1" height="1" />
        <rect x="7" y="15" width="2" height="1" />
        <rect x="12" y="15" width="1" height="1" />
        <rect x="15" y="15" width="1" height="1" />
        <rect x="18" y="15" width="6" height="1" />
        <rect x="26" y="15" width="1" height="1" />
        <rect x="28" y="15" width="1" height="1" />
        <rect x="5" y="16" width="1" height="1" />
        <rect x="9" y="16" width="2" height="1" />
        <rect x="15" y="16" width="2" height="1" />
        <rect x="18" y="16" width="6" height="1" />
        <rect x="25" y="16" width="3" height="1" />
        <rect x="8" y="17" width="1" height="1" />
        <rect x="13" y="17" width="1" height="1" />
        <rect x="16" y="17" width="1" height="1" />
        <rect x="28" y="17" width="1" height="1" />
        <rect x="4" y="18" width="3" height="1" />
        <rect x="8" y="18" width="1" height="1" />
        <rect x="10" y="18" width="2" height="1" />
        <rect x="13" y="18" width="3" height="1" />
        <rect x="18" y="18" width="3" height="1" />
        <rect x="22" y="18" width="1" height="1" />
        <rect x="24" y="18" width="1" height="1" />
        <rect x="26" y="18" width="1" height="1" />
        <rect x="28" y="18" width="1" height="1" />
        <rect x="11" y="19" width="1" height="1" />
        <rect x="13" y="19" width="1" height="1" />
        <rect x="15" y="19" width="2" height="1" />
        <rect x="19" y="19" width="1" height="1" />
        <rect x="21" y="19" width="2" height="1" />
        <rect x="28" y="19" width="1" height="1" />
        <rect x="4" y="20" width="4" height="1" />
        <rect x="9" y="20" width="2" height="1" />
        <rect x="13" y="20" width="12" height="1" />
        <rect x="26" y="20" width="1" height="1" />
        <rect x="12" y="21" width="2" height="1" />
        <rect x="15" y="21" width="1" height="1" />
        <rect x="20" y="21" width="1" height="1" />
        <rect x="24" y="21" width="2" height="1" />
        <rect x="27" y="21" width="1" height="1" />
        <rect x="4" y="22" width="7" height="1" />
        <rect x="12" y="22" width="1" height="1" />
        <rect x="14" y="22" width="2" height="1" />
        <rect x="20" y="22" width="1" height="1" />
        <rect x="22" y="22" width="1" height="1" />
        <rect x="24" y="22" width="5" height="1" />
        <rect x="4" y="23" width="1" height="1" />
        <rect x="10" y="23" width="1" height="1" />
        <rect x="13" y="23" width="4" height="1" />
        <rect x="18" y="23" width="3" height="1" />
        <rect x="24" y="23" width="4" height="1" />
        <rect x="4" y="24" width="1" height="1" />
        <rect x="6" y="24" width="3" height="1" />
        <rect x="10" y="24" width="1" height="1" />
        <rect x="15" y="24" width="1" height="1" />
        <rect x="18" y="24" width="1" height="1" />
        <rect x="20" y="24" width="5" height="1" />
        <rect x="26" y="24" width="1" height="1" />
        <rect x="28" y="24" width="1" height="1" />
        <rect x="4" y="25" width="1" height="1" />
        <rect x="6" y="25" width="3" height="1" />
        <rect x="10" y="25" width="1" height="1" />
        <rect x="13" y="25" width="1" height="1" />
        <rect x="18" y="25" width="1" height="1" />
        <rect x="20" y="25" width="1" height="1" />
        <rect x="25" y="25" width="1" height="1" />
        <rect x="4" y="26" width="1" height="1" />
        <rect x="6" y="26" width="3" height="1" />
        <rect x="10" y="26" width="1" height="1" />
        <rect x="12" y="26" width="5" height="1" />
        <rect x="20" y="26" width="3" height="1" />
        <rect x="24" y="26" width="1" height="1" />
        <rect x="27" y="26" width="2" height="1" />
        <rect x="4" y="27" width="1" height="1" />
        <rect x="10" y="27" width="1" height="1" />
        <rect x="13" y="27" width="1" height="1" />
        <rect x="15" y="27" width="3" height="1" />
        <rect x="19" y="27" width="1" height="1" />
        <rect x="21" y="27" width="1" height="1" />
        <rect x="23" y="27" width="1" height="1" />
        <rect x="25" y="27" width="1" height="1" />
        <rect x="28" y="27" width="1" height="1" />
        <rect x="4" y="28" width="7" height="1" />
        <rect x="12" y="28" width="1" height="1" />
        <rect x="14" y="28" width="3" height="1" />
        <rect x="20" y="28" width="2" height="1" />
        <rect x="23" y="28" width="1" height="1" />
        <rect x="26" y="28" width="3" height="1" />
      </g>
    </svg>
  );
}
