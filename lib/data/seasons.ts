import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import {
  demoSeasons,
  demoSeasonalIngredients,
  findDemoSeason,
  findDemoSeasonalIngredient,
  getDemoSeasonalIngredients,
} from "@/lib/demo-data/seasons";
import {
  SEASON_SELECT,
  SEASONAL_INGREDIENT_SELECT,
  mapSeasonRow,
  mapSeasonalIngredientRow,
  type RawSeasonRow,
  type RawSeasonalIngredientRow,
} from "@/lib/data/season-mappers";
import type { Season, SeasonalIngredient, SeasonWithIngredients } from "@/lib/types";

/**
 * Datatilgangslag for "I sesong" – samme demo-modus-fallback-mønster som
 * lib/data/guide-categories.ts/guides.ts. Skriveoperasjoner ligger i
 * lib/actions/seasons.ts, ikke her. Selve "hvilken sesong er det nå"-logikken
 * ligger IKKE her (ren datahenting), men i
 * lib/kitchen-intelligence/seasonal.ts – disse funksjonene henter bare rådata,
 * de fleste kallere trenger resolveCurrentSeason() fra den filen i tillegg.
 */

export async function getAllPublishedSeasons(): Promise<Season[]> {
  if (!isSupabaseConfigured) {
    return demoSeasons.filter((s) => s.isPublished).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select(SEASON_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente sesonger:", error.message);
    return [];
  }

  return ((data ?? []) as RawSeasonRow[]).map(mapSeasonRow);
}

export async function getAllSeasonsForAdmin(): Promise<Season[]> {
  if (!isSupabaseConfigured) {
    return [...demoSeasons].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select(SEASON_SELECT).order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente sesonger (admin):", error.message);
    return [];
  }

  return ((data ?? []) as RawSeasonRow[]).map(mapSeasonRow);
}

async function getIngredientsForSeason(seasonId: string) {
  if (!isSupabaseConfigured) {
    return getDemoSeasonalIngredients(seasonId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_ingredients")
    .select(SEASONAL_INGREDIENT_SELECT)
    .eq("season_id", seasonId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente sesongråvarer:", error.message);
    return [];
  }

  return ((data ?? []) as RawSeasonalIngredientRow[]).map(mapSeasonalIngredientRow);
}

export async function getSeasonBySlugWithIngredients(slug: string): Promise<SeasonWithIngredients | null> {
  if (!isSupabaseConfigured) {
    const season = findDemoSeason(slug);
    if (!season || !season.isPublished) return null;
    return { ...season, ingredients: getDemoSeasonalIngredients(season.id) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select(SEASON_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const season = mapSeasonRow(data as RawSeasonRow);
  const ingredients = await getIngredientsForSeason(season.id);
  return { ...season, ingredients };
}

export async function getSeasonByIdForAdmin(id: string): Promise<SeasonWithIngredients | null> {
  if (!isSupabaseConfigured) {
    const season = demoSeasons.find((s) => s.id === id);
    if (!season) return null;
    return { ...season, ingredients: getDemoSeasonalIngredients(season.id) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select(SEASON_SELECT).eq("id", id).maybeSingle();

  if (error || !data) return null;

  const season = mapSeasonRow(data as RawSeasonRow);
  const ingredients = await getIngredientsForSeason(season.id);
  return { ...season, ingredients };
}

export async function getAllSeasonSlugsForCollisionCheck(excludeId?: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return demoSeasons.filter((s) => s.id !== excludeId).map((s) => s.slug);
  }

  const supabase = await createClient();
  let query = supabase.from("seasons").select("id, slug");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((s) => s.slug);
}

/** Alle publiserte sesonger, hver med sine råvarer embeddet – grunnlaget
 * for resolveCurrentSeason()/resolveInSeasonIngredients() i
 * lib/kitchen-intelligence/seasonal.ts. Ett lite, sjelden-endret datasett
 * (maks noen titalls rader totalt), så det er trygt å hente alt på én gang
 * i stedet for å bygge et eget "gjeldende måned"-spørring server-side. */
export async function getAllSeasonsWithIngredients(): Promise<SeasonWithIngredients[]> {
  const seasons = await getAllPublishedSeasons();
  const withIngredients = await Promise.all(
    seasons.map(async (season) => ({ ...season, ingredients: await getIngredientsForSeason(season.id) })),
  );
  return withIngredients;
}

/** ALLE råvarer på tvers av ALLE publiserte sesonger, flatt (ikke gruppert
 * per sesong) – grunnlaget for råvaresøket (spesifikasjonens punkt 26/27)
 * og for resolveIngredientsForSeasonPage() sin flersesong-visning i
 * lib/kitchen-intelligence/seasonal.ts, som må kunne sjekke ALLE råvarer
 * mot én gitt sesongs måneder, ikke bare den sesongens "hjemme"-råvarer.
 * Kun råvarer fra PUBLISERTE sesonger – en råvare under en upublisert
 * sesong skal ikke kunne dukke opp i søket eller på andre sesongsider. */
export async function getAllSeasonalIngredientsFlat(): Promise<SeasonalIngredient[]> {
  const publishedSeasonIds = new Set((await getAllPublishedSeasons()).map((s) => s.id));

  if (!isSupabaseConfigured) {
    return demoSeasonalIngredients
      .filter((i) => publishedSeasonIds.has(i.seasonId))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  if (publishedSeasonIds.size === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_ingredients")
    .select(SEASONAL_INGREDIENT_SELECT)
    .in("season_id", [...publishedSeasonIds])
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente alle sesongråvarer:", error.message);
    return [];
  }

  return ((data ?? []) as RawSeasonalIngredientRow[]).map(mapSeasonalIngredientRow);
}

/** Slår opp ÉN råvare på slug, kun blant publiserte sesongers råvarer –
 * grunnlaget for /sesong/[slug] sin dual-purpose-oppslag (prøv sesong
 * først, så råvare, se app/sesong/[slug]/page.tsx). */
export async function getPublishedSeasonalIngredientBySlug(slug: string): Promise<SeasonalIngredient | null> {
  if (!isSupabaseConfigured) {
    const ingredient = findDemoSeasonalIngredient(slug);
    if (!ingredient) return null;
    const season = demoSeasons.find((s) => s.id === ingredient.seasonId);
    if (!season || !season.isPublished) return null;
    return ingredient;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_ingredients")
    .select(SEASONAL_INGREDIENT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  const ingredient = mapSeasonalIngredientRow(data as RawSeasonalIngredientRow);
  const publishedSeasonIds = new Set((await getAllPublishedSeasons()).map((s) => s.id));
  if (!publishedSeasonIds.has(ingredient.seasonId)) return null;
  return ingredient;
}

/** Slår opp ÉN råvare på slug for ADMIN – i motsetning til
 * getPublishedSeasonalIngredientBySlug over, uavhengig av om
 * hjemme-sesongen er publisert (admin skal kunne forhåndsvise/redigere
 * råvarer under upubliserte sesonger). */
export async function getSeasonalIngredientBySlugForAdmin(slug: string): Promise<SeasonalIngredient | null> {
  if (!isSupabaseConfigured) {
    return findDemoSeasonalIngredient(slug) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasonal_ingredients")
    .select(SEASONAL_INGREDIENT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapSeasonalIngredientRow(data as RawSeasonalIngredientRow);
}

/** Alle råvare-slugs på tvers av ALLE sesonger (ikke bare publiserte) –
 * brukes til slug-kollisjonssjekk i lib/actions/seasons.ts, samme mønster
 * som getAllSeasonSlugsForCollisionCheck() over. Slug er unikt PÅ TVERS av
 * alle råvarer (ikke bare innad i én sesong), se
 * supabase/migrations/0016_season_ingredient_richness.sql.
 *
 * `excludeSeasonId` utelater ALLE råvarer under én gitt sesong fra
 * resultatet – writeSeasonIngredients() i lib/actions/seasons.ts sletter
 * og setter inn hele sesongens råvareliste på nytt ved hver lagring, så
 * søskenrader i SAMME sesong skal ikke telle som kollisjon mot seg selv. */
export async function getAllIngredientSlugsForCollisionCheck(
  excludeId?: string,
  excludeSeasonId?: string,
): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return demoSeasonalIngredients
      .filter((i) => i.id !== excludeId && i.seasonId !== excludeSeasonId)
      .map((i) => i.slug);
  }

  const supabase = await createClient();
  let query = supabase.from("seasonal_ingredients").select("id, slug, season_id");
  if (excludeId) query = query.neq("id", excludeId);
  if (excludeSeasonId) query = query.neq("season_id", excludeSeasonId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((i) => i.slug);
}
