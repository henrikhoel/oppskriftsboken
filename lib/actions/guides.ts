"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllGuideSlugsForCollisionCheck } from "@/lib/data/guides";
import { ensureUniqueSlug, slugify } from "@/lib/utils/slug";
import { guideInputSchema, type GuideInput } from "@/lib/validation/guide-schema";

/**
 * Skriveoperasjoner (admin-CRUD) for "Hvordan gjør jeg det?"-guider –
 * speiler lib/actions/recipes.ts sitt createRecipe/updateRecipe/
 * deleteRecipe-mønster tett (slett-og-sett-inn-på-nytt for barnetabeller,
 * samme slug-kollisjons-håndtering, samme requireAdmin()-gating og
 * revalidatePath-mønster) mot de nye tabellene fra
 * supabase/migrations/0013_knowledge_guides.sql. Leseoperasjoner ligger i
 * lib/data/guides.ts, ikke her.
 */

export interface GuideActionResult {
  success: boolean;
  error?: string;
  slug?: string;
  id?: string;
}

/** Foreslår en unik slug fra tittelen – brukt av admin-skjemaet mens du skriver. */
export async function suggestGuideSlug(title: string, excludeId?: string): Promise<string> {
  await requireAdmin();
  const base = slugify(title);
  const existing = await getAllGuideSlugsForCollisionCheck(excludeId);
  return ensureUniqueSlug(base || "guide", existing);
}

/**
 * Skriver knowledge_guide_steps og knowledge_guide_relations for en guide
 * på nytt – samme "slett alt eksisterende, sett inn på nytt i riktig
 * rekkefølge"-tilnærming som writeRecipeChildren i lib/actions/recipes.ts,
 * av samme grunn (ingen ekte databasetransaksjoner tilgjengelig her, og
 * hele skjemaet sendes uansett samlet fra admin-UI-et hver gang).
 */
async function writeGuideChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  guideId: string,
  input: GuideInput,
) {
  await supabase.from("knowledge_guide_steps").delete().eq("guide_id", guideId);
  await supabase.from("knowledge_guide_relations").delete().eq("guide_id", guideId);

  const stepsPayload = input.steps.map((step, index) => ({
    guide_id: guideId,
    step_number: index + 1,
    text: step.text,
    text_en: step.textEn,
    note: step.note,
    note_en: step.noteEn,
    duration_minutes: step.durationMinutes,
    temperature: step.temperature,
    sort_order: index,
  }));

  if (stepsPayload.length > 0) {
    const { error: stepsError } = await supabase.from("knowledge_guide_steps").insert(stepsPayload);
    if (stepsError) throw new Error(`Kunne ikke lagre steg: ${stepsError.message}`);
  }

  // relatedGuideIds kan i teorien inneholde guideId selv (f.eks. hvis admin
  // ved en feil velger guiden selv i "relaterte guider"-velgeren) – filtrer
  // bort her i tillegg til databasens check (guide_id <> related_guide_id),
  // slik at hele lagringen ikke feiler på grunn av én ugyldig rad.
  const relatedIds = input.relatedGuideIds.filter((id) => id !== guideId);
  if (relatedIds.length > 0) {
    const relationsPayload = relatedIds.map((relatedGuideId, index) => ({
      guide_id: guideId,
      related_guide_id: relatedGuideId,
      sort_order: index,
    }));
    const { error: relationsError } = await supabase
      .from("knowledge_guide_relations")
      .insert(relationsPayload);
    if (relationsError) throw new Error(`Kunne ikke lagre relaterte guider: ${relationsError.message}`);
  }
}

function revalidateGuidePaths(slug?: string) {
  revalidatePath("/hvordan-gjor-jeg-det");
  revalidatePath("/admin/guider");
  if (slug) revalidatePath(`/hvordan-gjor-jeg-det/${slug}`);
}

export async function createGuide(rawInput: unknown): Promise<GuideActionResult> {
  await requireAdmin();

  const parsed = guideInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllGuideSlugsForCollisionCheck();
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: guideRow, error } = await supabase
    .from("knowledge_guides")
    .insert({
      title: input.title,
      title_en: input.titleEn,
      slug: finalSlug,
      intro: input.intro,
      intro_en: input.introEn,
      quick_answer_lines: input.quickAnswerLines,
      quick_answer_lines_en: input.quickAnswerLinesEn,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      estimated_time_minutes: input.estimatedTimeMinutes,
      estimated_time_minutes_max: input.estimatedTimeMinutesMax,
      tips: input.tips,
      tips_en: input.tipsEn,
      warnings: input.warnings,
      warnings_en: input.warningsEn,
      search_terms: input.searchTerms,
      search_terms_en: input.searchTermsEn,
      aliases: input.aliases,
      aliases_en: input.aliasesEn,
      is_published: input.isPublished,
      is_demo: input.isDemo,
    })
    .select("id, slug")
    .single();

  if (error || !guideRow) {
    return { success: false, error: error?.message ?? "Kunne ikke opprette guide" };
  }

  try {
    await writeGuideChildren(supabase, guideRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateGuidePaths(guideRow.slug);
  return { success: true, slug: guideRow.slug, id: guideRow.id };
}

export async function updateGuide(guideId: string, rawInput: unknown): Promise<GuideActionResult> {
  await requireAdmin();

  const parsed = guideInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllGuideSlugsForCollisionCheck(guideId);
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: guideRow, error } = await supabase
    .from("knowledge_guides")
    .update({
      title: input.title,
      title_en: input.titleEn,
      slug: finalSlug,
      intro: input.intro,
      intro_en: input.introEn,
      quick_answer_lines: input.quickAnswerLines,
      quick_answer_lines_en: input.quickAnswerLinesEn,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      estimated_time_minutes: input.estimatedTimeMinutes,
      estimated_time_minutes_max: input.estimatedTimeMinutesMax,
      tips: input.tips,
      tips_en: input.tipsEn,
      warnings: input.warnings,
      warnings_en: input.warningsEn,
      search_terms: input.searchTerms,
      search_terms_en: input.searchTermsEn,
      aliases: input.aliases,
      aliases_en: input.aliasesEn,
      is_published: input.isPublished,
      is_demo: input.isDemo,
    })
    .eq("id", guideId)
    .select("id, slug")
    .single();

  if (error || !guideRow) {
    return { success: false, error: error?.message ?? "Kunne ikke oppdatere guide" };
  }

  try {
    await writeGuideChildren(supabase, guideRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateGuidePaths(guideRow.slug);
  return { success: true, slug: guideRow.slug, id: guideRow.id };
}

/** Rask publiser/avpubliser-veksling fra guide-listen i admin (samme
 * lette mønster som setPublished i lib/actions/recipes.ts) – unngår å måtte
 * sende med hele guide-payloaden bare for å snu ett flagg. */
export async function setGuidePublished(guideId: string, isPublished: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_guides").update({ is_published: isPublished }).eq("id", guideId);
  if (error) {
    throw new Error(`Kunne ikke endre publiseringsstatus: ${error.message}`);
  }
  revalidateGuidePaths();
}

export async function deleteGuide(guideId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_guides").delete().eq("id", guideId);
  if (error) {
    throw new Error(`Kunne ikke slette guide: ${error.message}`);
  }
  revalidateGuidePaths();
  redirect("/admin/guider");
}
