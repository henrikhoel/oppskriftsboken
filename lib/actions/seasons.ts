"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllIngredientSlugsForCollisionCheck, getAllSeasonSlugsForCollisionCheck } from "@/lib/data/seasons";
import { ensureUniqueSlug, slugify } from "@/lib/utils/slug";
import { seasonInputSchema, type SeasonInput } from "@/lib/validation/season-schema";

/**
 * Skriveoperasjoner (admin-CRUD) for "I sesong" – speiler
 * lib/actions/guides.ts sitt createGuide/updateGuide/deleteGuide-mønster
 * tett (slett-og-sett-inn-på-nytt for seasonal_ingredients, samme
 * slug-kollisjons-håndtering, samme requireAdmin()-gating og
 * revalidatePath-mønster) mot tabellene fra
 * supabase/migrations/0014_seasons.sql. Leseoperasjoner ligger i
 * lib/data/seasons.ts, ikke her.
 *
 * Sesongens råvarer redigeres INNI samme skjema som sesongen selv (ikke
 * egne create/update/delete-actions per råvare) – en sesong har typisk
 * 4-6 råvarer, og "send hele lista på nytt hver gang" er enklere å
 * resonnere om enn å synkronisere enkeltrad-endringer, samme avveining
 * som writeGuideChildren gjør for guide-steg.
 */

export interface SeasonActionResult {
  success: boolean;
  error?: string;
  slug?: string;
  id?: string;
}

export async function suggestSeasonSlug(name: string, excludeId?: string): Promise<string> {
  await requireAdmin();
  const base = slugify(name);
  const existing = await getAllSeasonSlugsForCollisionCheck(excludeId);
  return ensureUniqueSlug(base || "sesong", existing);
}

/** Samme mønster som suggestSeasonSlug over, men for én råvare. `seasonId`
 * (kan være undefined for en helt ny, ikke-lagret sesong) utelater
 * søsken-råvarer i SAMME sesong fra kollisjonssjekken, se filheaderen til
 * getAllIngredientSlugsForCollisionCheck() i lib/data/seasons.ts – de blir
 * uansett slettet og satt inn på nytt idet sesongen lagres. */
export async function suggestIngredientSlug(name: string, seasonId?: string): Promise<string> {
  await requireAdmin();
  const base = slugify(name);
  const existing = await getAllIngredientSlugsForCollisionCheck(undefined, seasonId);
  return ensureUniqueSlug(base || "ravare", existing);
}

async function writeSeasonIngredients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string,
  input: SeasonInput,
) {
  await supabase.from("seasonal_ingredients").delete().eq("season_id", seasonId);

  if (input.ingredients.length === 0) return [];

  // Slug må være unikt PÅ TVERS av alle råvarer (ikke bare innad i denne
  // sesongen) – se filheaderen til getAllIngredientSlugsForCollisionCheck()
  // i lib/data/seasons.ts. `excludeSeasonId: seasonId` utelater denne
  // sesongens EGNE, nettopp slettede råvarer fra sjekken, siden hele lista
  // uansett skrives på nytt her.
  const existingSlugsElsewhere = await getAllIngredientSlugsForCollisionCheck(undefined, seasonId);
  const usedSlugs = new Set(existingSlugsElsewhere);
  const payload = input.ingredients.map((ingredient, index) => {
    const finalSlug = ensureUniqueSlug(ingredient.slug, [...usedSlugs]);
    usedSlugs.add(finalSlug);
    return {
      season_id: seasonId,
      slug: finalSlug,
      name_no: ingredient.nameNo,
      name_en: ingredient.nameEn,
      aliases: ingredient.aliases,
      category: ingredient.category,
      origin_group: ingredient.originGroup,
      origin: ingredient.origin,
      available_start_month: ingredient.availableStartMonth,
      available_end_month: ingredient.availableEndMonth,
      season_start_month: ingredient.seasonStartMonth,
      season_end_month: ingredient.seasonEndMonth,
      peak_start_month: ingredient.peakStartMonth,
      peak_end_month: ingredient.peakEndMonth,
      description_no: ingredient.descriptionNo,
      description_en: ingredient.descriptionEn,
      season_note_no: ingredient.seasonNoteNo,
      season_note_en: ingredient.seasonNoteEn,
      source_name: ingredient.sourceName,
      source_url: ingredient.sourceUrl,
      source_note: ingredient.sourceNote,
      verified_at: ingredient.verifiedAt,
      sort_order: index,
    };
  });

  const { error } = await supabase.from("seasonal_ingredients").insert(payload);
  if (error) throw new Error(`Kunne ikke lagre sesongråvarer: ${error.message}`);

  return payload.map((row) => row.slug);
}

/** `ingredientSlugs` revalideres i tillegg til selve sesongsiden – hver
 * råvare har sin egen /sesong/[slug]-side (dual-purpose-ruting, se
 * app/sesong/[slug]/page.tsx), som ellers ville vist utdatert innhold til
 * neste full rebuild. */
function revalidateSeasonPaths(slug?: string, ingredientSlugs: string[] = []) {
  revalidatePath("/sesong");
  revalidatePath("/admin/sesonger");
  revalidatePath("/");
  if (slug) revalidatePath(`/sesong/${slug}`);
  for (const ingredientSlug of ingredientSlugs) {
    revalidatePath(`/sesong/${ingredientSlug}`);
  }
}

export async function createSeason(rawInput: unknown): Promise<SeasonActionResult> {
  await requireAdmin();

  const parsed = seasonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllSeasonSlugsForCollisionCheck();
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: seasonRow, error } = await supabase
    .from("seasons")
    .insert({
      slug: finalSlug,
      name_no: input.nameNo,
      name_en: input.nameEn,
      months: input.months,
      intro_no: input.introNo,
      intro_en: input.introEn,
      is_published: input.isPublished,
    })
    .select("id, slug")
    .single();

  if (error || !seasonRow) {
    return { success: false, error: error?.message ?? "Kunne ikke opprette sesong" };
  }

  let ingredientSlugs: string[] = [];
  try {
    ingredientSlugs = await writeSeasonIngredients(supabase, seasonRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateSeasonPaths(seasonRow.slug, ingredientSlugs);
  return { success: true, slug: seasonRow.slug, id: seasonRow.id };
}

export async function updateSeason(seasonId: string, rawInput: unknown): Promise<SeasonActionResult> {
  await requireAdmin();

  const parsed = seasonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const existingSlugs = await getAllSeasonSlugsForCollisionCheck(seasonId);
  const finalSlug = ensureUniqueSlug(input.slug, existingSlugs);

  const { data: seasonRow, error } = await supabase
    .from("seasons")
    .update({
      slug: finalSlug,
      name_no: input.nameNo,
      name_en: input.nameEn,
      months: input.months,
      intro_no: input.introNo,
      intro_en: input.introEn,
      is_published: input.isPublished,
    })
    .eq("id", seasonId)
    .select("id, slug")
    .single();

  if (error || !seasonRow) {
    return { success: false, error: error?.message ?? "Kunne ikke oppdatere sesong" };
  }

  let ingredientSlugs: string[] = [];
  try {
    ingredientSlugs = await writeSeasonIngredients(supabase, seasonRow.id, input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Ukjent feil" };
  }

  revalidateSeasonPaths(seasonRow.slug, ingredientSlugs);
  return { success: true, slug: seasonRow.slug, id: seasonRow.id };
}

export async function setSeasonPublished(seasonId: string, isPublished: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("seasons").update({ is_published: isPublished }).eq("id", seasonId);
  if (error) {
    throw new Error(`Kunne ikke endre publiseringsstatus: ${error.message}`);
  }
  revalidateSeasonPaths();
}

export async function deleteSeason(seasonId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("seasons").delete().eq("id", seasonId);
  if (error) {
    throw new Error(`Kunne ikke slette sesong: ${error.message}`);
  }
  revalidateSeasonPaths();
  redirect("/admin/sesonger");
}
