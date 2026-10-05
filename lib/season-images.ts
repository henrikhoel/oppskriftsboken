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
type SeasonHeroImage = {
  src: string;
  /**
   * (05.10.2026, Henrik så live-rendringen av vår- og sommerbildet: "vår
   * ser nesten ut som snø" / "sommerbildet ser litt gulere ut enn det
   * faktisk er fordi kun det til høyre syns liksom") Heroen beskjærer et
   * SMALT, bredt vindu midt i bildet (object-cover i en kort, bred boks –
   * se filheaderen til SeasonHeroImage.tsx), så for et bilde der det mest
   * dekkende/fargeriktige partiet ikke er midt i bildet, må selve
   * beskjæringspunktet (CSS object-position) flyttes – ikke bare
   * mørkleggingen. Vårbildet er sterkt bakgrunnsbelyst med et disete,
   * nesten hvitt parti øverst; default senter-beskjæring traff rett i det
   * partiet. Sommerbildet har en kraftig solstråle til høyre; default
   * senter-beskjæring fikk den til å dominere fargeinntrykket. Utelatt
   * (undefined) betyr vanlig senter-beskjæring ("center"), som fungerer
   * fint for host/vinter/forsommer/sensommer.
   */
  position?: string;
};

export const SEASON_HERO_IMAGES: Partial<Record<string, SeasonHeroImage>> = {
  host: { src: "/images/seasons/host.jpg" },
  vinter: { src: "/images/seasons/vinter.jpg" },
  var: { src: "/images/seasons/var.jpg", position: "center 85%" },
  forsommer: { src: "/images/seasons/forsommer.jpg" },
  sommer: { src: "/images/seasons/sommer.jpg", position: "15% center" },
  sensommer: { src: "/images/seasons/sensommer.jpg" },
};
