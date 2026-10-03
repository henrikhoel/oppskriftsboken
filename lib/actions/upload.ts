"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { compressRecipeImage } from "@/lib/utils/image-processing";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "recipe-images";
// 10 MB (hevet fra 8 MB, 29.09.2026, Henrik) – selve filen sendes som
// FormData til denne Server Action-en, så next.config.ts sin
// `serverActions.bodySizeLimit` må ha nok margin OVER denne grensen (hevet
// til 12 MB i samme slag) til å romme multipart-overheaden rundt filen.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
// Supabase-varsel (02.10.2026): "org Henriks matside exceeded its usage
// quota" – gratiskvoten for CACHED EGRESS BANDWIDTH (5,5 GB) ble sprengt.
// Uten en eksplisitt cacheControl-verdi setter Supabase Storage standard
// Cache-Control: max-age=3600 (KUN 1 TIME) på hver opplastet fil – det
// betyr at CDN-en/nettleseren til en besøkende må hente den samme
// råfilen fra Supabase på nytt (og bruke av egress-kvoten) hvert eneste
// klokketime det fortsatt er trafikk på bildet, akkurat samme problem
// som Next.js sin egen `images.minimumCacheTTL` i next.config.ts allerede
// er satt opp for å unngå (se kommentaren der, 28.09.2026-episoden med
// Vercel sin bilde-transformasjonskvote). Oppskriftsbilder endres så
// godt som aldri etter opplasting (samme begrunnelse som der), så 31
// dager (2 678 400 sekunder) er trygt her også. MERK: dette påvirker kun
// FILER LASTET OPP ETTER denne endringen – eksisterende bilder i bøtta
// beholder sin opprinnelige 1-times Cache-Control til de evt. lastes opp
// på nytt.
const STORAGE_CACHE_CONTROL = "2678400";

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export async function uploadRecipeImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Ingen fil mottatt." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Ugyldig filtype. Bruk JPG, PNG, WebP eller AVIF." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Bildet er for stort (maks 10 MB)." };
  }

  // Komprimering (03.10.2026) – se lib/utils/image-processing.ts sin
  // filheader for hele bakgrunnen (Henrik: "hvert bilde er på 8,5 mb ca",
  // ofte PNG). MAX_BYTES-sjekken over er bevisst mot ORIGINALEN (admin skal
  // fortsatt kunne laste opp rett fra telefon/kamera uten å måtte
  // komprimere selv først) – selve filen som havner i Supabase er alltid
  // det komprimerte JPEG-resultatet, typisk noen hundre KB.
  let compressed;
  try {
    const original = Buffer.from(await file.arrayBuffer());
    compressed = await compressRecipeImage(original);
  } catch {
    return { success: false, error: "Kunne ikke lese bildefilen. Prøv et annet bilde." };
  }

  const supabase = await createClient();
  const path = `${crypto.randomUUID()}.${compressed.extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed.buffer, {
    contentType: compressed.contentType,
    upsert: false,
    cacheControl: STORAGE_CACHE_CONTROL,
  });

  if (error) {
    return { success: false, error: `Opplasting feilet: ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { success: true, url: data.publicUrl, path };
}

/**
 * Som uploadRecipeImage, men tar imot rå bytes i stedet for en File – brukt
 * til å laste opp et AI-generert bilde (se generateRecipeHeroImage i
 * lib/actions/ai.ts), som kommer som base64 fra OpenAI sitt API i stedet
 * for fra en filvelger i nettleseren. `contentType`/`extension`-parameterne
 * som fantes her FØR 03.10.2026 er fjernet – siden alt uansett kjøres
 * gjennom compressRecipeImage (se uploadRecipeImage sin kommentar) er
 * resultatet alltid JPEG, uavhengig av hva OpenAI faktisk returnerte.
 */
export async function uploadGeneratedRecipeImage(bytes: Buffer): Promise<UploadResult> {
  await requireAdmin();

  if (bytes.byteLength > MAX_BYTES) {
    return { success: false, error: "Det genererte bildet er for stort." };
  }

  let compressed;
  try {
    compressed = await compressRecipeImage(bytes);
  } catch {
    return { success: false, error: "Kunne ikke behandle det genererte bildet." };
  }

  const supabase = await createClient();
  const path = `ai-${crypto.randomUUID()}.${compressed.extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed.buffer, {
    contentType: compressed.contentType,
    upsert: false,
    cacheControl: STORAGE_CACHE_CONTROL,
  });

  if (error) {
    return { success: false, error: `Opplasting feilet: ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { success: true, url: data.publicUrl, path };
}

export async function deleteRecipeImage(path: string): Promise<UploadResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
