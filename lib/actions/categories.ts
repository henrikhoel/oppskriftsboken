"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categoryInputSchema } from "@/lib/validation/recipe-schema";
import { translateCategoryName } from "@/lib/actions/ai";

export interface CategoryActionResult {
  success: boolean;
  error?: string;
}

export async function createCategory(input: {
  name: string;
  slug: string;
}): Promise<CategoryActionResult> {
  await requireAdmin();

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/oppskrifter");
  return { success: true };
}

export interface EnglishCategoryNameResult {
  success: boolean;
  nameEn?: string;
  error?: string;
}

/** Genererer et engelsk kategorinavn med AI og lagrer det i
 * categories.name_en – brukt av "Generer med AI"-knappen per kategori i
 * admin (se components/admin/CategoryManager.tsx). Samme mønster som
 * generateEnglishTitleDescription i lib/actions/recipes.ts. */
export async function generateEnglishCategoryName(
  id: string,
  name: string,
): Promise<EnglishCategoryNameResult> {
  await requireAdmin();

  if (!name.trim()) {
    return { success: false, error: "Kategorien mangler navn." };
  }

  try {
    const nameEn = await translateCategoryName(name);
    return await saveEnglishCategoryName(id, nameEn);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere engelsk navn. Prøv igjen.",
    };
  }
}

/** Lagrer et engelsk kategorinavn direkte (uten AI) – brukt til å lagre
 * manuelle justeringer, eller til å skrive det inn helt for hånd. */
export async function saveEnglishCategoryName(
  id: string,
  nameEn: string,
): Promise<EnglishCategoryNameResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name_en: nameEn.trim() || null })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/oppskrifter");
  revalidatePath("/");
  return { success: true, nameEn };
}

export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/kategorier");
  revalidatePath("/oppskrifter");
  return { success: true };
}
