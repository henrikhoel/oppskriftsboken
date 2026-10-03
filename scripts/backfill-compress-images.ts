/**
 * Komprimerer EKSISTERENDE bilder i Supabase Storage-bøtta i etterkant
 * (03.10.2026, se lib/utils/image-processing.ts sin filheader for hele
 * bakgrunnen). Opplastinger FRA NÅ AV komprimeres automatisk av
 * lib/actions/upload.ts – dette scriptet tar for seg de ~270 bildene som
 * allerede lå der FØR den endringen (Henrik: "hvert bilde er på 8,5 mb ca",
 * ofte PNG).
 *
 * Kjøres med:
 *   npx tsx scripts/backfill-compress-images.ts --dry-run
 *     → rører INGENTING, skriver kun ut hva som ville blitt gjort og
 *       forventet besparelse. Kjør denne FØRST.
 *
 *   npx tsx scripts/backfill-compress-images.ts
 *     → selve kjøringen, overskriver filene i bøtta.
 *
 *   npx tsx scripts/backfill-compress-images.ts --limit=50
 *     → begrenser til 50 filer denne kjøringen (med eller uten --dry-run).
 *       Trygt å kjøre på nytt – scriptet hopper automatisk over filer som
 *       allerede er under SKIP_THRESHOLD_BYTES (dvs. allerede komprimert av
 *       en tidligere kjøring), så en ny kjøring kun tar fatt på det som
 *       gjenstår.
 *
 * Krever NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i
 * .env.local – samme som scripts/seed.ts.
 *
 * SIKKERHET: tar en lokal sikkerhetskopi av HVER originalfil (selve
 * byte-innholdet, ikke bare en referanse) til scripts/backups/<tidsstempel>/
 * FØR filen overskrives i Supabase. Disse er IKKE med i git
 * (.gitignore ekskluderer scripts/backups/) – slett mappen selv når du har
 * sjekket at alt ser bra ut, eller behold den en stund som ekstra trygghet.
 *
 * VIKTIG: overskriver filen PÅ SAMME STI/filnavn i bøtta (upsert: true) –
 * ALDRI et nytt filnavn, siden `recipes`/`recipe_images`-radene i
 * databasen lagrer den fulle URL-en til filen og IKKE oppdateres av dette
 * scriptet. Det betyr at en fil som het "abc123.png" fortsatt heter
 * "abc123.png" etter kjøring, selv om innholdet nå faktisk er JPEG-kodet –
 * nettlesere/Next.js bryr seg kun om Content-Type-headeren (satt riktig til
 * "image/jpeg" under), ikke filendelsen, så dette er trygt.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compressRecipeImage } from "../lib/utils/image-processing";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "recipe-images";
// 31 dager – samme verdi/begrunnelse som STORAGE_CACHE_CONTROL i
// lib/actions/upload.ts. Denne kjøringen fikser dermed OGSÅ den gjenstående
// "eksisterende bilder har fortsatt kort cache-levetid"-bekymringen fra
// tidligere i dag, som et sideeffekt av at filene uansett skrives på nytt.
const STORAGE_CACHE_CONTROL = "2678400";

// Filer allerede under denne grensen hoppes over – sannsynligvis allerede
// komprimert av en tidligere kjøring av dette scriptet, eller bare naturlig
// et lite bilde som ikke trenger behandling.
const SKIP_THRESHOLD_BYTES = 1_200_000; // 1,2 MB

if (!url || !serviceKey) {
  console.error(
    "Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY i .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

interface StorageEntry {
  name: string;
  size: number;
}

async function listAllFiles(): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Kunne ikke liste bøtta: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const f of data) {
      const size = f.metadata?.size;
      if (typeof size === "number") entries.push({ name: f.name, size });
    }
    offset += data.length;
    if (data.length < pageSize) break;
  }
  return entries;
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : Number.POSITIVE_INFINITY;

  console.log(`Henter filliste fra bøtta "${BUCKET}" …`);
  const all = await listAllFiles();
  const overThreshold = all.filter((f) => f.size > SKIP_THRESHOLD_BYTES);
  const candidates = overThreshold.slice(0, limit);

  console.log(
    `${all.length} filer totalt i bøtta, ${overThreshold.length} over ${formatMB(SKIP_THRESHOLD_BYTES)}. ` +
      `Behandler ${candidates.length} nå${dryRun ? " (DRY RUN – ingenting skrives eller lastes opp)" : ""}.`,
  );

  if (candidates.length === 0) {
    console.log("Ingenting å gjøre.");
    return;
  }

  const backupDir = path.join(
    process.cwd(),
    "scripts",
    "backups",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  if (!dryRun) await mkdir(backupDir, { recursive: true });

  let totalBefore = 0;
  let totalAfter = 0;
  let ok = 0;
  let skippedNotSmaller = 0;
  let failed = 0;

  for (const [i, entry] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${entry.name} (${formatMB(entry.size)}) … `);
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(entry.name);
      if (downloadError || !blob) throw new Error(downloadError?.message ?? "tom nedlasting");
      const original = Buffer.from(await blob.arrayBuffer());

      const compressed = await compressRecipeImage(original);

      if (compressed.buffer.byteLength >= original.byteLength) {
        console.log(`hoppet over (komprimert ble ikke mindre – ${formatMB(compressed.buffer.byteLength)}).`);
        skippedNotSmaller++;
        continue;
      }

      totalBefore += original.byteLength;
      totalAfter += compressed.buffer.byteLength;

      if (dryRun) {
        console.log(`${formatMB(original.byteLength)} → ${formatMB(compressed.buffer.byteLength)} (dry run).`);
        continue;
      }

      await writeFile(path.join(backupDir, entry.name), original);

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(entry.name, compressed.buffer, {
        contentType: compressed.contentType,
        upsert: true,
        cacheControl: STORAGE_CACHE_CONTROL,
      });
      if (uploadError) throw new Error(uploadError.message);

      console.log(`${formatMB(original.byteLength)} → ${formatMB(compressed.buffer.byteLength)} OK.`);
      ok++;
    } catch (err) {
      console.log(`FEILET: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log("");
  console.log("=== Oppsummering ===");
  console.log(`Behandlet: ${ok} OK, ${skippedNotSmaller} hoppet over (ikke mindre), ${failed} feilet.`);
  if (totalBefore > 0) {
    const savedPct = (100 * (1 - totalAfter / totalBefore)).toFixed(1);
    console.log(
      `${formatMB(totalBefore)} → ${formatMB(totalAfter)} (${savedPct} % mindre)${dryRun ? " [DRY RUN]" : ""}.`,
    );
  }
  if (!dryRun && ok > 0) {
    console.log(`Originaler sikkerhetskopiert til: ${backupDir}`);
  }
  if (candidates.length === limit && overThreshold.length > limit) {
    console.log(`Merk: --limit=${limit} brukt – kjør scriptet på nytt for å fortsette med resten.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
