import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

/**
 * PWA-manifest (10.09.2026, "vil teste følelsen av en app-snarvei på
 * hjemskjermen før vi evt. bygger en ekte native app senere"). Next.js sin
 * app/manifest.ts-filkonvensjon genererer automatisk /manifest.webmanifest
 * OG legger selv inn <link rel="manifest"> i <head> – ingen manuell
 * metadata.manifest-oppføring nødvendig i app/layout.tsx.
 *
 * display: "standalone" er selve poenget – det er DETTE som fjerner
 * nettleserens eget grensesnitt (adressefelt øverst, Safari sin bunn-bar med
 * del-/fane-/frem-tilbake-knapper på iPhone) når siden åpnes fra
 * hjemskjerm-ikonet, slik at det oppleves som en ordentlig app i stedet for
 * en nettleser-snarvei. iOS Safari trenger i tillegg de egne
 * apple-web-app-meta-taggene (satt via `appleWebApp` i
 * generateMetadata i app/layout.tsx) for samme resultat der – manifestet
 * alene er nok på Android/Chrome.
 *
 * Ikonene i /public/icons/ er samme gull-"C"-ikon som app/icon.png
 * (512x512), kun skalert ned til 192x192 i tillegg – Chrome sine
 * installer-kriterier krever begge størrelsene. purpose: "any" (IKKE
 * "maskable") siden ikonet allerede har sine egne avrundede hjørner bakt inn
 * (gjennomsiktige hjørner) – en "maskable"-flagging ville fått Android til å
 * legge SIN EGEN maske oppå i tillegg, med fare for at gull-flaten beskjæres
 * dobbelt. Bytt til ekte butikk-ikonografi/maskable-variant den dagen appen
 * faktisk publiseres i en butikk (se AppDownloadBanner.tsx sin filheader for
 * samme "ikke ekte ennå"-forbehold).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#15120d",
    theme_color: "#15120d",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
