"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { guideCategoryInputSchema } from "@/lib/validation/guide-schema";

/**
 * Skriveoperasjoner for "Hvordan gjør jeg det?"-kategorier
 * (guide_categories) – speiler lib/actions/categories.ts sitt mønster for
 * oppskrift-kategorier, men mot EGEN tabell (se filheaderen til
 * supabase/migrations/0013_knowledge_guides.sql for hvorfor kategoriene
 * ikke deler tabell med recipes sine kategorier).
 *
 * Bevisst UTEN en "generer engelsk navn med AI"-knapp i denne omgangen
 * (jf. spesifikasjonens punkt om manuelt kvalitetssikret innhold i denne
 * fasen) – kun manuell lagring av det engelske navnet, se
 * saveEnglishGuideCategoryName under. Kan legges til senere ved å følge
 * samme mønster som generateEnglishCategoryName i lib/actions/categories.ts
 * dersom det blir ønskelig.
 */

export interface GuideCategoryActionResult {
  success: boolean;
  error?: string;
}

export async function createGuideCategory(input: {
  name: string;
  slug: string;
}): Promise<GuideCategoryActionResult> {
  await requireAdmin();

  const parsed = guideCategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("guide_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("guide_categories").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/guider");
  revalidatePath("/hvordan-gjor-jeg-det");
  return { success: true };
}

export interface EnglishGuideCategoryNameResult {
  success: boolean;
  nameEn?: string;
  error?: string;
}

/** Lagrer et engelsk kategorinavn manuelt (ingen AI-generering i denne
 * fasen, se filheader). */
export async function saveEnglishGuideCategoryName(
  id: string,
  nameEn: string,
): Promise<EnglishGuideCategoryNameResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("guide_categories")
    .update({ name_en: nameEn.trim() || null })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/guider");
  revalidatePath("/hvordan-gjor-jeg-det");
  return { success: true, nameEn };
}

export async function deleteGuideCategory(id: string): Promise<GuideCategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("guide_categories").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/guider");
  revalidatePath("/hvordan-gjor-jeg-det");
  return { success: true };
}
