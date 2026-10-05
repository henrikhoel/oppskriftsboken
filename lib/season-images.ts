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
 * Alle 6 sesongene har nå sitt eget bilde (siste, "sensommer", lagt til
 * 05.10.2026). SeasonHeroImage.tsx returnerer uansett ingenting (ingen
 * hero) for en eventuell FREMTIDIG sesong-slug som ikke finnes her, så
 * mappingen trenger ikke være i sync med databasen for at siden skal
 * fungere trygt – det er bare ikke lenger en forventet tilstand akkurat
 * nå.
 */
export const SEASON_HERO_IMAGES: Partial<Record<string, string>> = {
  host: "/images/seasons/host.jpg",
  vinter: "/images/seasons/vinter.jpg",
  var: "/images/seasons/var.jpg",
  forsommer: "/images/seasons/forsommer.jpg",
  sommer: "/images/seasons/sommer.jpg",
  sensommer: "/images/seasons/sensommer.jpg",
};
