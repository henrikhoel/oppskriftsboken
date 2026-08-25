"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllRecipeSlugsForCollisionCheck } from "@/lib/data/recipes";
import { ensureUniqueSlug, slugify } from "@/lib/utils/slug";
import { recipeInputSchema, type RecipeInput } from "@/lib/validation/recipe-schema";
import { translateTitleAndDescription } from "@/lib/actions/ai";
import { callClaudeJSON } from "@/lib/ai/anthropic";
import { clampTasteValue, type TasteDimensionId, type TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { clampNutritionValue, type NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";

export interface RecipeActionResult {
  success: boolean;
  error?: string;
  slug?: string;
}

/** Foreslår en unik slug fra tittelen – brukt av admin-skjemaet mens du skriver. */
export async function suggestSlug(title: string, excludeId?: string): Promise<string> {
  await requireAdmin();
  const base = slugify(title);
  const existing = await getAllRecipeSlugsForCollisionCheck(excludeId);
  return ensureUniqueSlug(base || "oppskrift", existing);
}

async function resolveTagIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagNames: string[],
): Promise<string[]> {
  if (tagNames.length === 0) return [];
  const ids: string[] = [];

  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;
    const slug = slugify(name);

    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabase
      .from("tags")
      .insert({ name, slug })
      .select("id")
      .single();

    if (error) {
      // Kan skje ved race conditions – prøv å hente på nytt før vi gir opp.
      const { data: retry } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (retry) {
        ids.push(retry.id);
      }
      continue;
    }

    ids.push(created.id);
  }

  return ids;
}

/**
 * Skriver alle "barne-tabeller" (ingrediensgrupper/-linjer, steg, bilder,
 * tags) for en oppskrift på nytt. Enklest robuste tilnærming uten ekte
 * databasetransaksjoner i supabase-js: slett alt eksisterende og sett inn
 * på nytt i riktig rekkefølge. Trygt her siden hele skjemaet uansett
 * sendes samlet fra admin-UI-et hver gang.
 */
async function writeRecipeChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  input: RecipeInput,
) {
  await supabase.from("ingredient_groups").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_images").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_tags").delete().eq("recipe_id", recipeId);

  for (const [groupIndex, group] of input.ingredientGroups.entries()) {
    const { data: groupRow, error: groupError } = await supabase
      .from("ingredient_groups")
      .insert({ recipe_id: recipeId, title: group.title, sort_order: groupIndex })
      .select("id")
      .single();

    if (groupError || !groupRow) {
      throw new Error(`Kunne ikke lagre ingrediensgruppe: ${groupError?.message}`);
    }

    const itemsPayload = group.items.map((item, itemIndex) => ({
      group_id: groupRow.id,
      amount: item.amount || null,
      unit: item.unit || null,
      name: item.name,
      note: item.note || null,
      sort_order: itemIndex,
    }));

    if (itemsPayload.length > 0) {
      const { error: itemsError } = await supabase.from("ingredient_items").insert(itemsPayload);
      if (itemsError) throw new Error(`Kunne ikke lagre ingredienser: ${itemsError.message}`);
    }
  }

  const stepsPayload = input.steps.map((step, index) => ({
    recipe_id: recipeId,
    group_title: step.groupTitle,
    step_number: index + 1,
    text: step.text,
    sort_order: index,
  }));

  if (stepsPayload.length > 0) {
    const { error: stepsError } = await supabase.from("recipe_steps").insert(stepsPayload);
    if (stepsError) throw new Error(`Kunne ikke lagre fremgangsmåte: ${stepsError.message}`);
  }

  if (input.images.length > 0) {
    const imagesPayload = input.images.map((img, index) => ({
      recipe_id: recipeId,
      url: img.url,
      alt: img.alt,
      sort_order: index,
    }));
    const { error: imagesError } = await supabase.from("recipe_images").insert(imagesPayload);
    if (imagesError) throw new Error(`Kunne ikke lagre bilder: ${imagesError.message}`);
  }

  const tagIds = await resolveTagIds(supabase, input.tagNames);
  if (tagIds.length > 0) {
    const { error: tagLinkError } = await supabase
      .from("recipe_tags")
      .insert(tagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id })));
    if (tagLinkError) throw new Error(`Kunne ikke lagre tags: ${tagLinkError.message}`);
  }
}

function revalidateRecipePaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/oppskrifter");
  revalidatePath("/favoritter");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/oppskrifter/${slug}`);
}

export async function createRecipe(rawInput: unknown): Promise<RecipeActionResult> {
  await requireAdmin();

  const parsed = recipeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllRecipeSlugsForCollisionCheck();
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .insert({
      title: input.title,
      slug: finalSlug,
      description: input.description,
      hero_image_url: input.heroImageUrl,
      hero_image_alt: input.heroImageAlt,
      hero_image_is_ai_generated: input.heroImageIsAiGenerated,
      category_id: input.categoryId,
      servings: input.servings,
      prep_time_minutes: input.prepTimeMinutes,
      cook_time_minutes: input.cookTimeMinutes,
      total_time_minutes: input.totalTimeMinutes,
      difficulty: input.difficulty,
      notes: input.notes,
      tips: input.tips,
      source: input.source,
      is_published: input.isPublished,
      is_featured: input.isFeatured,
    })
    .select("id, slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke opprette oppskrift" };
  }

  try {
    await writeRecipeChildren(supabase, recipeRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
}

export async function updateRecipe(
  recipeId: string,
  rawInput: unknown,
): Promise<RecipeActionResult> {
  await requireAdmin();

  const parsed = recipeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllRecipeSlugsForCollisionCheck(recipeId);
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({
      title: input.title,
      slug: finalSlug,
      description: input.description,
      hero_image_url: input.heroImageUrl,
      hero_image_alt: input.heroImageAlt,
      hero_image_is_ai_generated: input.heroImageIsAiGenerated,
      category_id: input.categoryId,
      servings: input.servings,
      prep_time_minutes: input.prepTimeMinutes,
      cook_time_minutes: input.cookTimeMinutes,
      total_time_minutes: input.totalTimeMinutes,
      difficulty: input.difficulty,
      notes: input.notes,
      tips: input.tips,
      source: input.source,
      is_published: input.isPublished,
      is_featured: input.isFeatured,
    })
    .eq("id", recipeId)
    .select("id, slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke oppdatere oppskrift" };
  }

  try {
    await writeRecipeChildren(supabase, recipeRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) {
    throw new Error(`Kunne ikke slette oppskrift: ${error.message}`);
  }
  revalidateRecipePaths();
  redirect("/admin");
}

export interface EnglishTextActionResult {
  success: boolean;
  titleEn?: string;
  descriptionEn?: string;
  error?: string;
}

/** Genererer engelsk tittel/beskrivelse med AI (lib/actions/ai.ts ->
 * translateTitleAndDescription) og lagrer dem i recipes.title_en/
 * description_en – brukt av "Generer med AI"-knappen i admin-skjemaet (se
 * components/admin/RecipeForm.tsx). Trigger revalidering samme sted som
 * updateRecipe, siden dette påvirker hvordan oppskriften vises i lister på
 * engelsk (lib/utils/format.ts -> localizedTitle/localizedDescription). */
export async function generateEnglishTitleDescription(
  recipeId: string,
  input: { title: string; description: string },
): Promise<EnglishTextActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en norsk tittel før du genererer engelsk tekst." };
  }

  try {
    const translated = await translateTitleAndDescription(input);
    return await saveEnglishTitleDescription(recipeId, {
      titleEn: translated.title,
      descriptionEn: translated.description,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere engelsk tekst. Prøv igjen.",
    };
  }
}

/** Lagrer engelsk tittel/beskrivelse direkte (uten AI) – brukt til å lagre
 * manuelle justeringer av teksten generateEnglishTitleDescription fylte
 * inn over, eller til å skrive den inn helt for hånd. */
export async function saveEnglishTitleDescription(
  recipeId: string,
  input: { titleEn: string; descriptionEn: string },
): Promise<EnglishTextActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({
      title_en: input.titleEn.trim() || null,
      description_en: input.descriptionEn.trim() || null,
    })
    .eq("id", recipeId)
    .select("slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke lagre engelsk tekst." };
  }

  revalidateRecipePaths(recipeRow.slug);
  return { success: true, titleEn: input.titleEn, descriptionEn: input.descriptionEn };
}

export interface TasteProfileActionResult {
  success: boolean;
  tasteProfile?: TasteProfile;
  error?: string;
}

/**
 * Genererer en smaksprofil med AI og lagrer den fast i
 * recipes.taste_profile – brukt av "Generer smaksprofil"-knappen i
 * admin-skjemaet (se components/admin/RecipeForm.tsx). I MOTSETNING til de
 * fleste andre kjøkkenintelligens-AI-kallene er dette BEVISST ikke en live,
 * per-besøk beregning: smaksprofilen er en redaksjonell, forhåndsgenerert
 * egenskap ved oppskriften (samme mønster som titleEn/descriptionEn under
 * generateEnglishTitleDescription over), ikke noe som skal regnes ut på
 * nytt for hver besøkende. Genererer både norsk og engelsk oppsummering i
 * samme kall, se TasteProfile sin filheader i
 * lib/kitchen-intelligence/taste.ts for hvorfor kun oppsummeringen (ikke
 * selve 0-5-tallene) trenger en egen engelsk variant.
 */
export async function generateTasteProfile(
  recipeId: string,
  input: { title: string; description: string; ingredientNames: string[] },
): Promise<TasteProfileActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer smaksprofil." };
  }
  if (input.ingredientNames.length === 0) {
    return { success: false, error: "Legg inn minst én ingrediens før du genererer smaksprofil." };
  }

  try {
    const system =
      "Du er en erfaren kokk som beskriver SMAKSPROFILEN til en rett for noen som vurderer om de skal lage den. " +
      'Svar KUN med JSON: {"dimensions": {"sweet": 0-5, "salty": 0-5, "sour": 0-5, "bitter": 0-5, "umami": 0-5, ' +
      '"spicy": 0-5}, "summary": "én kort setning på norsk som oppsummerer smaksbildet", "summaryEn": "samme ' +
      'setning på engelsk"}. 0 = ikke til stede i det hele tatt, 5 = en dominerende, definerende egenskap. De ' +
      "fleste retter bør ha flere lave/null-verdier – ikke bland opp alle dimensjonene.";

    const prompt = `Rett: ${input.title}\n${input.description}\nIngredienser: ${input.ingredientNames.join(", ")}`;

    const result = await callClaudeJSON<{
      dimensions?: Partial<Record<TasteDimensionId, number>>;
      summary?: string;
      summaryEn?: string;
    }>(system, prompt, 400, 0.3);

    const tasteProfile: TasteProfile = {
      dimensions: {
        sweet: clampTasteValue(result.dimensions?.sweet),
        salty: clampTasteValue(result.dimensions?.salty),
        sour: clampTasteValue(result.dimensions?.sour),
        bitter: clampTasteValue(result.dimensions?.bitter),
        umami: clampTasteValue(result.dimensions?.umami),
        spicy: clampTasteValue(result.dimensions?.spicy),
      },
      summary: (result.summary ?? "").trim().slice(0, 200),
      summaryEn: (result.summaryEn ?? "").trim().slice(0, 200),
    };

    const supabase = await createClient();
    const { data: recipeRow, error } = await supabase
      .from("recipes")
      .update({ taste_profile: tasteProfile as unknown })
      .eq("id", recipeId)
      .select("slug")
      .single();

    if (error || !recipeRow) {
      return { success: false, error: error?.message ?? "Kunne ikke lagre smaksprofilen." };
    }

    revalidateRecipePaths(recipeRow.slug);
    return { success: true, tasteProfile };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere smaksprofil. Prøv igjen.",
    };
  }
}

export interface NutritionActionResult {
  success: boolean;
  nutritionInfo?: NutritionInfo;
  error?: string;
}

/**
 * Genererer en kalori-/makro-oversikt PER PORSJON med AI og lagrer den fast
 * i recipes.nutrition_info – brukt av "Generer næringsinnhold"-knappen i
 * admin-skjemaet (se components/admin/RecipeForm.tsx). Samme
 * admin-genererer-én-gang-mønster som generateTasteProfile over, IKKE en
 * live per-besøk beregning – ønsket av Henrik 25.08.2026, samtidig med at
 * han ba om at det skal vises bak en "vis"-knapp på selve oppskriftssiden
 * (se components/recipe/NutritionPanel.tsx), ikke stå fast synlig som
 * smaksprofilen – "det er ikke alle som vil ha det".
 *
 * I MOTSETNING til generateTasteProfile trenger dette de FAKTISKE MENGDENE
 * (amount/unit), ikke bare ingrediensnavnene – 200 g kjøttdeig og 800 g
 * kjøttdeig gir svært ulikt kaloriinnhold selv om ingrediensnavnet er
 * identisk. Kalleren (RecipeForm.tsx) sender derfor med hele
 * ingredienslisten, ikke bare navnene.
 */
export async function generateNutritionInfo(
  recipeId: string,
  input: {
    title: string;
    description: string;
    servings: number;
    ingredients: { amount: string | null; unit: string | null; name: string }[];
  },
): Promise<NutritionActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer næringsinnhold." };
  }
  if (input.ingredients.length === 0) {
    return { success: false, error: "Legg inn minst én ingrediens før du genererer næringsinnhold." };
  }
  if (!input.servings || input.servings < 1) {
    return { success: false, error: "Legg inn antall porsjoner før du genererer næringsinnhold." };
  }

  try {
    const system =
      "Du er en ernæringsfysiolog som estimerer næringsinnhold PER PORSJON for en oppskrift, ut fra hele " +
      "ingredienslisten (mengder for HELE oppskriften) og antall porsjoner den deles i. Dette er et " +
      "estimat basert på vanlige næringsverdier for matvarene – IKKE en laboratoriemåling – gjør fornuftige " +
      "antagelser (f.eks. vanlig fettprosent i kjøttdeig, vanlig sukkerinnhold i ferdigprodukter) der noe " +
      'er upresist oppgitt. Svar KUN med JSON: {"calories": tall (kcal), "fat": tall (g), "saturatedFat": ' +
      'tall (g), "carbs": tall (g), "sugar": tall (g), "fiber": tall (g), "protein": tall (g), "salt": ' +
      "tall (g)}. ALLE tall er PER PORSJON (regn ut totalen for hele oppskriften først, del deretter på " +
      "antall porsjoner), avrundet til hele tall (salt kan ha én desimal).";

    const ingredientLines = input.ingredients
      .map((i) => [i.amount, i.unit, i.name].filter((part) => part && part.trim()).join(" "))
      .join("\n");

    const prompt =
      `Rett: ${input.title}\n${input.description}\nPorsjoner: ${input.servings}\n\n` +
      `Ingredienser (hele oppskriften, ikke per porsjon):\n${ingredientLines}`;

    const result = await callClaudeJSON<{
      calories?: number;
      fat?: number;
      saturatedFat?: number;
      carbs?: number;
      sugar?: number;
      fiber?: number;
      protein?: number;
      salt?: number;
    }>(system, prompt, 800, 0.2);

    const nutritionInfo: NutritionInfo = {
      calories: clampNutritionValue(result.calories, 3000),
      fat: clampNutritionValue(result.fat, 300),
      saturatedFat: clampNutritionValue(result.saturatedFat, 300),
      carbs: clampNutritionValue(result.carbs, 300),
      sugar: clampNutritionValue(result.sugar, 300),
      fiber: clampNutritionValue(result.fiber, 100),
      protein: clampNutritionValue(result.protein, 300),
      salt: clampNutritionValue(result.salt, 20),
    };

    const supabase = await createClient();
    const { data: recipeRow, error } = await supabase
      .from("recipes")
      .update({ nutrition_info: nutritionInfo as unknown })
      .eq("id", recipeId)
      .select("slug")
      .single();

    if (error || !recipeRow) {
      return { success: false, error: error?.message ?? "Kunne ikke lagre næringsinnholdet." };
    }

    revalidateRecipePaths(recipeRow.slug);
    return { success: true, nutritionInfo };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere næringsinnhold. Prøv igjen.",
    };
  }
}

export async function setPublished(recipeId: string, isPublished: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_published: isPublished })
    .eq("id", recipeId);
  if (error) {
    throw new Error(`Kunne ikke endre publiseringsstatus: ${error.message}`);
  }
  revalidateRecipePaths();
}
