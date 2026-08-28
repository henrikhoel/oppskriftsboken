"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllRecipeSlugsForCollisionCheck, getPublishedRecipeSummaries } from "@/lib/data/recipes";
import { ensureUniqueSlug, slugify } from "@/lib/utils/slug";
import { recipeInputSchema, type RecipeInput } from "@/lib/validation/recipe-schema";
import {
  translateTitleAndDescription,
  getVegetarianVariant,
  getRecipeDraft,
  estimateRecipeTiming as estimateRecipeTimingAi,
  generateRecipeTipsAndWarnings as generateRecipeTipsAndWarningsAi,
  generateRecipeDescription as generateRecipeDescriptionAi,
  suggestNewDishIdeas as suggestNewDishIdeasAi,
  findExternalRecipeMatches as findExternalRecipeMatchesAi,
  suggestRecipeImprovements as suggestRecipeImprovementsAi,
  integrateStepsWithImprovements as integrateStepsWithImprovementsAi,
  findRecipesByDishName as findRecipesByDishNameAi,
  suggestIngredientGrouping as suggestIngredientGroupingAi,
  type IntegratedRecipeStep,
  type IngredientGroupingSuggestion,
} from "@/lib/actions/ai";
import { callClaudeJSON } from "@/lib/ai/anthropic";
import { clampTasteValue, type TasteDimensionId, type TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { clampNutritionValue, type NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import type {
  VegetarianVariant,
  RecipeDraft,
  RecipeTimingEstimate,
  RecipeTipsAndWarnings,
  NewDishSuggestion,
  ExternalRecipeMatch,
  RecipeImprovementSuggestion,
} from "@/lib/types";

export interface RecipeActionResult {
  success: boolean;
  error?: string;
  slug?: string;
  // Lagt til 25.08.2026 slik at RecipeForm.tsx kan lagre vegetarversjonen
  // rett etter opprettelse av en HELT NY oppskrift (der recipe.id ikke
  // finnes fra før – se createRecipe/updateRecipe under, og handleSubmit i
  // RecipeForm.tsx som nå lagrer vegetarversjonen sammen med resten av
  // skjemaet i samme handling).
  id?: string;
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
      cook_time_minutes_max: input.cookTimeMinutesMax,
      total_time_minutes: input.totalTimeMinutes,
      difficulty: input.difficulty,
      notes: input.notes,
      tips: input.tips,
      warnings: input.warnings,
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
  return { success: true, slug: recipeRow.slug, id: recipeRow.id };
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
      cook_time_minutes_max: input.cookTimeMinutesMax,
      total_time_minutes: input.totalTimeMinutes,
      difficulty: input.difficulty,
      notes: input.notes,
      tips: input.tips,
      warnings: input.warnings,
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
  return { success: true, slug: recipeRow.slug, id: recipeRow.id };
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

/** Fjerner en lagret smaksprofil helt (tilbake til "ingen smaksprofil
 * generert ennå") – for de som genererte den og ombestemte seg, samme
 * "fjern det man ikke vil ha likevel"-mønster som clearVegetarianVariant
 * lenger ned i denne filen (ønsket av Henrik 26.08.2026, for smaksprofil OG
 * næringsinnhold begge). */
export async function clearTasteProfile(recipeId: string): Promise<RecipeActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({ taste_profile: null })
    .eq("id", recipeId)
    .select("slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke fjerne smaksprofilen." };
  }

  revalidatePath(`/admin/oppskrifter/${recipeId}`);
  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
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

/** Fjerner et lagret næringsinnhold helt (tilbake til "ingen næringsinnhold
 * generert ennå") – se kommentaren på clearTasteProfile over. */
export async function clearNutritionInfo(recipeId: string): Promise<RecipeActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({ nutrition_info: null })
    .eq("id", recipeId)
    .select("slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke fjerne næringsinnholdet." };
  }

  revalidatePath(`/admin/oppskrifter/${recipeId}`);
  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
}

export interface VegetarianVariantActionResult {
  success: boolean;
  vegetarianVariant?: VegetarianVariant;
  error?: string;
}

/**
 * VEGETARVERSJON (fjernet fra live oppskriftsside-generering 25.08.2026 –
 * se filheaderen til VegetarianVariant i lib/types.ts for begrunnelsen).
 * Samme mønster som generateNutritionInfo over: admin-gatet, genererer med
 * AI (gjenbruker getVegetarianVariant sin AI-logikk UENDRET fra
 * lib/actions/ai.ts – den funksjonen er nå bare ment kalt herfra, ikke
 * direkte fra en besøkendes knapp), og lagrer resultatet FAST i
 * recipes.vegetarian_variant. Admin kan redigere resultatet (via
 * IngredientGroupsEditor/StepsEditor i RecipeForm.tsx) FØR det faktisk
 * lagres – se saveVegetarianVariant under, som er det som faktisk skriver
 * til databasen.
 */
export async function generateVegetarianVariant(input: {
  title: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string; note: string | null }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}): Promise<VegetarianVariantActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer en vegetarversjon." };
  }
  if (input.ingredientGroups.every((g) => g.items.length === 0)) {
    return { success: false, error: "Legg inn minst én ingrediens før du genererer en vegetarversjon." };
  }

  // IKKE lagret i databasen her – kun det AI-genererte forslaget returneres,
  // slik at admin får sjansen til å se over/redigere det (via
  // IngredientGroupsEditor/StepsEditor i RecipeForm.tsx) FØR det faktisk
  // lagres via saveVegetarianVariant under.
  try {
    const result = await getVegetarianVariant(input);
    return { success: true, vegetarianVariant: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere vegetarversjon. Prøv igjen.",
    };
  }
}

export interface RecipeDraftActionResult {
  success: boolean;
  recipeDraft?: RecipeDraft;
  error?: string;
}

/**
 * "Generer resten med AI" – fyller ut ingredienser, fremgangsmåte, tid og
 * vanskelighetsgrad ut fra tittel/beskrivelse/porsjoner admin allerede har
 * skrevet inn i skjemaet (se handleGenerateDraft i RecipeForm.tsx). Typisk
 * brukt rett etter "Opprett som oppskrift" fra et AI-menyforslag (se
 * components/meal/MealView.tsx og app/admin/(dashboard)/oppskrifter/ny/page.tsx),
 * der tittel/beskrivelse/porsjoner allerede er forhåndsutfylt, men resten av
 * oppskriften er tom – ønsket av Henrik 26.08.2026: "jeg vil ha muligheten
 * til å generere resten av oppskriften også, så jeg har noe mer å jobbe ut
 * ifra". Fungerer likevel like fint på et HELT tomt/manuelt skjema.
 *
 * Samme "kun et forslag, IKKE lagret noe sted"-mønster som
 * generateVegetarianVariant under: resultatet returneres kun til skjemaet
 * (fyller inn groups/steps/prepTime/cookTime/difficulty), admin ser over og
 * redigerer videre FØR faktisk lagring via "Opprett oppskrift"-knappen.
 */
export async function generateRecipeDraft(input: {
  title: string;
  description: string;
  servings: number;
  categoryName?: string | null;
}): Promise<RecipeDraftActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer resten av oppskriften." };
  }

  try {
    const recipeDraft = await getRecipeDraft(input);
    return { success: true, recipeDraft };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere oppskriften. Prøv igjen.",
    };
  }
}

export interface RecipeTimingEstimateActionResult {
  success: boolean;
  timingEstimate?: RecipeTimingEstimate;
  error?: string;
}

/**
 * "Estimer tid og vanskelighetsgrad" – leser den FAKTISKE, allerede skrevne
 * ingredienslisten og fremgangsmåten i skjemaet (uansett om den kom dit ved
 * håndskriving, import eller "Generer resten med AI" over) og fyller ut
 * forberedelse/tilberedning/vanskelighetsgrad ut fra det – ønsket av Henrik
 * 26.08.2026: "når jeg oppretter en oppskrift så vil jeg at den skal se
 * gjennom oppskriften, bruke informasjonen til å legge inn ca. tidsbruk...
 * i tillegg til vanskelighetsgrad". Samme "kun et forslag, IKKE lagret noe
 * sted"-mønster som generateRecipeDraft over – fungerer derfor like fint
 * for en helt ny, ikke-lagret oppskrift som for en admin redigerer.
 */
export async function estimateRecipeTiming(input: {
  title: string;
  description: string;
  servings: number;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}): Promise<RecipeTimingEstimateActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du estimerer tid og vanskelighetsgrad." };
  }
  if (input.ingredientGroups.every((g) => g.items.length === 0)) {
    return { success: false, error: "Legg inn minst én ingrediens før du estimerer tid og vanskelighetsgrad." };
  }
  if (input.steps.length === 0) {
    return { success: false, error: "Legg inn fremgangsmåten før du estimerer tid og vanskelighetsgrad." };
  }

  try {
    const timingEstimate = await estimateRecipeTimingAi(input);
    return { success: true, timingEstimate };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke estimere tid og vanskelighetsgrad. Prøv igjen.",
    };
  }
}

export interface RecipeTipsAndWarningsActionResult {
  success: boolean;
  tipsAndWarnings?: RecipeTipsAndWarnings;
  error?: string;
}

/**
 * "Generer tips og pass på" (27.08.2026, ønsket av Henrik) – leser den
 * FAKTISKE ingredienslisten og fremgangsmåten i skjemaet og fyller ut
 * "Tips"- og "Pass på"-feltene i "Notater og kilde"-seksjonen. Samme
 * "kun et forslag, IKKE lagret noe sted"-mønster som estimateRecipeTiming
 * over – fungerer derfor like fint for en helt ny, ikke-lagret oppskrift
 * som for en admin redigerer.
 */
export async function generateRecipeTipsAndWarnings(input: {
  title: string;
  description: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}): Promise<RecipeTipsAndWarningsActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer tips og pass på." };
  }
  if (input.ingredientGroups.every((g) => g.items.length === 0)) {
    return { success: false, error: "Legg inn minst én ingrediens før du genererer tips og pass på." };
  }
  if (input.steps.length === 0) {
    return { success: false, error: "Legg inn fremgangsmåten før du genererer tips og pass på." };
  }

  try {
    const tipsAndWarnings = await generateRecipeTipsAndWarningsAi(input);
    return { success: true, tipsAndWarnings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere tips og pass på. Prøv igjen.",
    };
  }
}

export interface RecipeDescriptionActionResult {
  success: boolean;
  description?: string;
  error?: string;
}

/**
 * "Generer kort beskrivelse" (27.08.2026, ønsket av Henrik: "jeg vil også
 * kunne generere 'Kort beskrivelse' av retten etter å ha fylt ut resten") –
 * leser den FAKTISKE ingredienslisten og fremgangsmåten i skjemaet og
 * foreslår "Kort beskrivelse"-teksten øverst i skjemaet. Samme "kun et
 * forslag, IKKE lagret noe sted"-mønster som estimateRecipeTiming/
 * generateRecipeTipsAndWarnings over – fungerer derfor like fint for en
 * helt ny, ikke-lagret oppskrift som for en admin redigerer.
 */
export async function generateRecipeDescription(input: {
  title: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
  categoryName: string | null;
}): Promise<RecipeDescriptionActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer en beskrivelse." };
  }
  if (input.ingredientGroups.every((g) => g.items.length === 0)) {
    return { success: false, error: "Legg inn minst én ingrediens før du genererer en beskrivelse." };
  }
  if (input.steps.length === 0) {
    return { success: false, error: "Legg inn fremgangsmåten før du genererer en beskrivelse." };
  }

  try {
    const description = await generateRecipeDescriptionAi(input);
    if (!description) {
      return { success: false, error: "Fant ikke noe å foreslå. Prøv igjen." };
    }
    return { success: true, description };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere beskrivelse. Prøv igjen.",
    };
  }
}

export interface NewDishSuggestionActionResult {
  success: boolean;
  suggestions?: NewDishSuggestion[];
  error?: string;
}

/**
 * "Foreslå nye retter" (27.08.2026, ønsket av Henrik – se filheaderen til
 * NewDishSuggestion i lib/types.ts) – admin-only funksjon på "Hva kan jeg
 * lage?"-siden (se PantryMatchView.tsx). Henter selv listen over
 * eksisterende, publiserte titler som kontekst (admin trenger ikke oppgi
 * dette) og sender videre til den faktiske AI-genereringen.
 *
 * Samme "kun et forslag, IKKE lagret noe sted"-mønster som
 * generateRecipeDraft over – hver idé kan overføres videre til
 * opprett-oppskrift-siden med tittel/beskrivelse forhåndsutfylt, akkurat som
 * et AI-menyforslag (se "Opprett som oppskrift" i components/meal/MealView.tsx).
 */
export async function suggestNewDishIdeas(input: {
  ingredients: string[];
  desiredType: string | null;
}): Promise<NewDishSuggestionActionResult> {
  await requireAdmin();

  if (input.ingredients.length === 0) {
    return { success: false, error: "Legg inn minst én ingrediens du har for hånden." };
  }

  try {
    const existing = await getPublishedRecipeSummaries();
    const suggestions = await suggestNewDishIdeasAi({
      availableIngredients: input.ingredients,
      desiredType: input.desiredType?.trim() || null,
      existingRecipeTitles: existing.map((r) => r.title),
    });
    if (suggestions.length === 0) {
      return { success: false, error: "Fant ingen gode forslag akkurat nå. Prøv med andre ingredienser." };
    }
    return { success: true, suggestions };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere retteforslag. Prøv igjen.",
    };
  }
}

export interface ExternalRecipeMatchActionResult {
  success: boolean;
  matches?: ExternalRecipeMatch[];
  error?: string;
}

/**
 * "Finn oppskrifter andre steder" (27.08.2026, ønsket av Henrik – se
 * filheaderen til ExternalRecipeMatch i lib/types.ts) – admin-only funksjon
 * på "Hva kan jeg lage?"-siden, samme sted som suggestNewDishIdeas over,
 * men søker EKTE eksterne matsider (via Anthropics hostede web-søk-
 * verktøy) fremfor å dikte opp noe selv.
 */
export async function findExternalRecipeMatches(input: {
  ingredients: string[];
  desiredType: string | null;
}): Promise<ExternalRecipeMatchActionResult> {
  await requireAdmin();

  if (input.ingredients.length === 0) {
    return { success: false, error: "Legg inn minst én ingrediens du har for hånden." };
  }

  try {
    const matches = await findExternalRecipeMatchesAi({
      availableIngredients: input.ingredients,
      desiredType: input.desiredType?.trim() || null,
    });
    if (matches.length === 0) {
      return { success: false, error: "Fant ingen gode treff akkurat nå. Prøv med andre ingredienser." };
    }
    return { success: true, matches };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke søke etter oppskrifter. Prøv igjen.",
    };
  }
}

export interface DishRecipeSearchActionResult {
  success: boolean;
  matches?: ExternalRecipeMatch[];
  error?: string;
}

/**
 * "Finn oppskrift" på "Ny oppskrift"-siden (27.08.2026, ønsket av Henrik –
 * se filheaderen til findRecipesByDishName i lib/actions/ai.ts) – admin-
 * only, alternativ til "Generer med AI" når admin vil finne en EKTE
 * oppskrift for en navngitt rett i stedet for å la AI-en dikte opp en.
 */
export async function findRecipesByDishName(input: { dishName: string }): Promise<DishRecipeSearchActionResult> {
  await requireAdmin();

  if (!input.dishName.trim()) {
    return { success: false, error: "Skriv inn navnet på retten du vil finne." };
  }

  try {
    const matches = await findRecipesByDishNameAi({ dishName: input.dishName });
    if (matches.length === 0) {
      return { success: false, error: "Fant ingen gode treff akkurat nå. Prøv et annet søk." };
    }
    return { success: true, matches };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke søke etter oppskrifter. Prøv igjen.",
    };
  }
}

export interface RecipeImprovementActionResult {
  success: boolean;
  improvement?: RecipeImprovementSuggestion;
  error?: string;
}

/**
 * "Forslag til forbedring" (27.08.2026, ønsket av Henrik – se filheaderen
 * til RecipeImprovementSuggestion i lib/types.ts) – admin-only, i
 * RecipeForm.tsx. Leser skjemaets NÅVÆRENDE ingredienser/fremgangsmåte
 * (uansett om de kom dit ved håndskriving, "Importer fra lenke" eller
 * "Generer resten med AI") og foreslår konkrete forbedringer – samme "kun
 * et forslag, IKKE lagret noe sted"-mønster som estimateRecipeTiming over.
 */
export async function suggestRecipeImprovements(input: {
  title: string;
  description: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}): Promise<RecipeImprovementActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du ber om forslag til forbedring." };
  }
  if (input.ingredientGroups.every((g) => g.items.length === 0)) {
    return { success: false, error: "Legg inn minst én ingrediens før du ber om forslag til forbedring." };
  }
  if (input.steps.length === 0) {
    return { success: false, error: "Legg inn fremgangsmåten før du ber om forslag til forbedring." };
  }

  try {
    const improvement = await suggestRecipeImprovementsAi(input);
    return { success: true, improvement };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke hente forslag til forbedring. Prøv igjen.",
    };
  }
}

export interface IntegrateStepsActionResult {
  success: boolean;
  steps?: IntegratedRecipeStep[];
  error?: string;
}

/**
 * "Implementer valgte" på "Forslag til forbedring" (27.08.2026, utvidet
 * etter ønske fra Henrik – se filheaderen til integrateStepsWithImprovements
 * i lib/actions/ai.ts) – admin-only, kalt fra
 * handleImplementSelectedImprovements i RecipeForm.tsx når minst ett av de
 * huket-av forslagene er en fremgangsmåte-forbedring. Leser skjemaets
 * NÅVÆRENDE fremgangsmåte og returnerer den HELE, oppdaterte listen –
 * samme "kun et forslag i skjemaet, IKKE lagret noe sted"-mønster som
 * suggestRecipeImprovements over.
 */
export async function integrateStepsWithImprovements(input: {
  steps: { groupTitle: string | null; text: string }[];
  improvements: string[];
}): Promise<IntegrateStepsActionResult> {
  await requireAdmin();

  if (input.steps.length === 0) {
    return { success: false, error: "Ingen fremgangsmåte å integrere forbedringer i." };
  }
  if (input.improvements.length === 0) {
    return { success: true, steps: input.steps.map((s) => ({ groupTitle: s.groupTitle, text: s.text })) };
  }

  try {
    const steps = await integrateStepsWithImprovementsAi(input);
    return { success: true, steps };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke integrere forbedringene i fremgangsmåten. Prøv igjen.",
    };
  }
}

export interface IngredientGroupingActionResult {
  success: boolean;
  groups?: IngredientGroupingSuggestion[];
  error?: string;
}

/**
 * "Del ingredienser inn i grupper" (27.08.2026, ønsket av Henrik – se
 * filheaderen til suggestIngredientGrouping i lib/actions/ai.ts) –
 * admin-only, kalt fra handleSuggestIngredientGrouping i RecipeForm.tsx.
 * Leser skjemaets NÅVÆRENDE, flate ingrediensliste (uansett eksisterende
 * gruppering) og fremgangsmåte, og foreslår en ny inndeling etter hvilken
 * del av retten hver ingrediens hører til – samme "kun et forslag i
 * skjemaet, IKKE lagret noe sted"-mønster som suggestRecipeImprovements over.
 */
export async function suggestIngredientGrouping(input: {
  title: string;
  ingredients: { amount: string | null; unit: string | null; name: string; note: string | null }[];
  steps: { groupTitle: string | null; text: string }[];
}): Promise<IngredientGroupingActionResult> {
  await requireAdmin();

  if (!input.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du deler ingrediensene inn i grupper." };
  }
  if (input.ingredients.length === 0) {
    return { success: false, error: "Legg inn minst én ingrediens før du deler dem inn i grupper." };
  }

  try {
    const groups = await suggestIngredientGroupingAi(input);
    return { success: true, groups };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke dele ingrediensene inn i grupper. Prøv igjen.",
    };
  }
}

/** Lagrer (eller oppdaterer) den faktiske vegetarversjonen på oppskriften –
 * enten et AI-forslag admin har godkjent (evt. redigert), eller en versjon
 * admin har skrevet helt selv fra bunnen. Se generateVegetarianVariant over
 * for AI-veien; denne funksjonen bryr seg ikke om hvor innholdet kom fra. */
export async function saveVegetarianVariant(
  recipeId: string,
  variant: VegetarianVariant,
): Promise<RecipeActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({ vegetarian_variant: variant as unknown })
    .eq("id", recipeId)
    .select("slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke lagre vegetarversjonen." };
  }

  // revalidateRecipePaths(slug) alene revalidert IKKE denne dynamiske
  // admin-redigeringssiden (/admin/oppskrifter/[id]) – revalidatePath("/admin")
  // treffer kun selve listesiden, ikke undersider. Uten denne linjen viste
  // siden fortsatt den gamle (tomme) versjonen etter lagring helt til man
  // hard-refresha nettleseren (bug rapportert av Henrik 25.08.2026).
  revalidatePath(`/admin/oppskrifter/${recipeId}`);
  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
}

/** Fjerner en lagret vegetarversjon helt (tilbake til "ingen variant lagret
 * ennå") – f.eks. hvis admin vil starte helt på nytt. */
export async function clearVegetarianVariant(recipeId: string): Promise<RecipeActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: recipeRow, error } = await supabase
    .from("recipes")
    .update({ vegetarian_variant: null })
    .eq("id", recipeId)
    .select("slug")
    .single();

  if (error || !recipeRow) {
    return { success: false, error: error?.message ?? "Kunne ikke fjerne vegetarversjonen." };
  }

  // Se kommentaren i saveVegetarianVariant over.
  revalidatePath(`/admin/oppskrifter/${recipeId}`);
  revalidateRecipePaths(recipeRow.slug);
  return { success: true, slug: recipeRow.slug };
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

/**
 * "Ukens utvalg"-styring fra /admin/utvalg (ønsket av Henrik 26.08.2026 – en
 * enkel, EKSPLISITT måte å velge/rekkefølge forsidens utvalgte oppskrifter
 * på, helt atskilt fra hjerte-/favoritt-systemet). De tre under er bevisst
 * separate, små funksjoner (samme mønster som setPublished over) fremfor én
 * "oppdater alt"-handling – hver rad i admin-UI-et kaller nøyaktig én av
 * dem, direkte fra et enkelt knappetrykk.
 */
export async function addToFeatured(recipeId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: topRow } = await supabase
    .from("recipes")
    .select("featured_sort_order")
    .not("featured_sort_order", "is", null)
    .order("featured_sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (topRow?.featured_sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("recipes")
    .update({ is_featured: true, featured_sort_order: nextOrder })
    .eq("id", recipeId);
  if (error) {
    throw new Error(`Kunne ikke legge til i utvalget: ${error.message}`);
  }
  revalidateRecipePaths();
  revalidatePath("/admin/utvalg");
}

export async function removeFromFeatured(recipeId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_featured: false, featured_sort_order: null })
    .eq("id", recipeId);
  if (error) {
    throw new Error(`Kunne ikke fjerne fra utvalget: ${error.message}`);
  }
  revalidateRecipePaths();
  revalidatePath("/admin/utvalg");
}

export async function moveFeatured(recipeId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: featuredRows, error: fetchError } = await supabase
    .from("recipes")
    .select("id, featured_sort_order")
    .eq("is_featured", true)
    .order("featured_sort_order", { ascending: true });

  if (fetchError || !featuredRows) {
    throw new Error(fetchError?.message ?? "Kunne ikke hente utvalget");
  }

  const index = featuredRows.findIndex((r) => r.id === recipeId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= featuredRows.length) return;

  const current = featuredRows[index];
  const swapWith = featuredRows[swapIndex];

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase.from("recipes").update({ featured_sort_order: swapWith.featured_sort_order }).eq("id", current.id),
    supabase.from("recipes").update({ featured_sort_order: current.featured_sort_order }).eq("id", swapWith.id),
  ]);

  if (error1 || error2) {
    throw new Error(error1?.message ?? error2?.message ?? "Kunne ikke endre rekkefølgen");
  }
  revalidateRecipePaths();
  revalidatePath("/admin/utvalg");
}
