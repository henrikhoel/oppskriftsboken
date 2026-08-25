"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "recipe-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

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
    return { success: false, error: "Bildet er for stort (maks 8 MB)." };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
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
 * for fra en filvelger i nettleseren.
 */
export async function uploadGeneratedRecipeImage(
  bytes: Buffer,
  contentType: string,
  extension: string,
): Promise<UploadResult> {
  await requireAdmin();

  if (bytes.byteLength > MAX_BYTES) {
    return { success: false, error: "Det genererte bildet er for stort." };
  }

  const supabase = await createClient();
  const path = `ai-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
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
