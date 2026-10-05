/**
 * (05.10.2026, Henrik: "er det mulig å ha 6 bakgrunnsbilder som endres
 * sammen med sesongene?") Bakgrunnsbilde-mapping for "I sesong"-heroen
 * (se SeasonHeroImage.tsx) – ETT bilde per sesong-slug (samme 6 sesongene
 * som lib/demo-data/seasons.ts: var/forsommer/sommer/sensommer/host/
 * vinter). Bevisst en enkel, statisk mapping i kode (ikke et databasefelt)
 * – det er alltid nøyaktig disse 6 sesongene (se migrations/0014_seasons.sql
 * sin kommentar), og Henrik sender bildene direkte til committing, samme
 * mønster som det tidligere "I kjøleskapet"-bildet
 * (public/images/pantry-hero.jpg).
 *
 * Bevisst DELVIS utfylt inntil videre – kun "host", "vinter", "var" og
 * "forsommer" har bilde per nå. SeasonHeroImage.tsx returnerer ingenting
 * (ingen hero, siden ser ut som før) for en sesong som mangler et bilde
 * her, så resten av sesongene fungerer helt normalt mens Henrik sender
 * flere bilder etter hvert.
 */
export const SEASON_HERO_IMAGES: Partial<Record<string, string>> = {
  host: "/images/seasons/host.jpg",
  vinter: "/images/seasons/vinter.jpg",
  var: "/images/seasons/var.jpg",
  forsommer: "/images/seasons/forsommer.jpg",
};
