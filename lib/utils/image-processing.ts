import sharp from "sharp";

/**
 * Serverside bilde-komprimering (03.10.2026) – Henrik: "hvert bilde er på
 * 8,5 mb ca" (opplastet rett fra telefon/kamera, ukomprimert). Se
 * lib/actions/upload.ts sin STORAGE_CACHE_CONTROL-kommentar for hele
 * bakgrunnen (Supabase-kvoteoverskridelsen 02.10.2026): et 8,5 MB
 * originalbilde betyr at ALT som noensinne henter filen direkte fra
 * Supabase (Next.js sin bildeoptimalisering FØRSTE gang/etter at Vercel sin
 * edge-cache er nullstilt av en ny deploy, og – viktigst – og:image/
 * Twitter-forhåndsvisninger og søkemotor-crawlere, som ALLTID henter
 * originalen direkte, aldri en optimalisert versjon) drar med seg 8,5 MB
 * hver gang. Et 2000px/kvalitet 82-JPEG av et matfoto ligger typisk på noen
 * hundre KB – godt over det en skjerm faktisk trenger for en
 * oppskriftsside, uten synlig kvalitetstap.
 *
 * Delt mellom lib/actions/upload.ts (nye opplastinger) og
 * scripts/backfill-compress-images.ts (eksisterende bilder) – samme
 * innstillinger begge steder, så "nye opplastinger" og "allerede
 * opplastede, komprimert i etterkant" ender opp identiske.
 */

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

export interface CompressedImage {
  buffer: Buffer;
  contentType: string;
  /** Alltid "jpg" – se compressRecipeImage sin filheader for hvorfor output
   * alltid er JPEG uansett hva slags bilde som kom inn. */
  extension: string;
}

/**
 * Skalerer ned til maks MAX_WIDTH bredde (aldri opp – `withoutEnlargement`)
 * og komprimerer til JPEG. `.rotate()` uten argumenter leser EXIF-
 * orienteringen (f.eks. et stående mobilbilde som er lagret liggende med et
 * "roter 90°"-flagg) og brenner den inn FØR selve skaleringen/
 * omkodingen fjerner EXIF-dataene – uten dette ville bilder fra enkelte
 * telefoner/kameraer dukket opp liggende på siden etter komprimering, selv
 * om de så riktige ut før.
 *
 * Konverterer BEVISST alt til JPEG (ikke PNG/WebP/AVIF, uansett hva
 * originalen var) – matfotografier trenger så godt som aldri transparens,
 * og ett format holder denne funksjonen og backfill-scriptet enkle og
 * forutsigbare. Kaster videre om sharp ikke klarer å lese filen (f.eks. en
 * korrupt opplasting) – kalleren viser da feilmeldingen til brukeren i
 * stedet for å lagre en ødelagt fil.
 */
export async function compressRecipeImage(input: Buffer): Promise<CompressedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, contentType: "image/jpeg", extension: "jpg" };
}
