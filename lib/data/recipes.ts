import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { demoRecipes, findDemoRecipe } from "@/lib/demo-data/recipes";
import { mapRecipeRow, RECIPE_SELECT, toSearchable, toSummary } from "@/lib/data/mappers";
import type { RawRecipeRow } from "@/lib/data/mappers";
import type { Recipe, RecipeSummary } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";

/**
 * Datatilgangslag for oppskrifter. Alle funksjoner her faller automatisk
 * tilbake til lib/demo-data når Supabase ikke er konfigurert (se
 * lib/supabase/is-configured.ts), slik at appen alltid har noe å vise –
 * også helt uten miljøvariabler satt opp.
 *
 * Skriveoperasjoner (opprette/redigere/slette) ligger i lib/actions/, ikke
 * her – dette laget er kun for lesing.
 */

async function getPublishedDemoRecipes(): Promise<Recipe[]> {
  return demoRecipes.filter((r) => r.isPublished);
}

export async function getPublishedRecipeSummaries(): Promise<RecipeSummary[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoRecipes()).map(toSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente oppskrifter:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawRecipeRow[]).map((row) => toSummary(mapRecipeRow(row)));
}

/** Full søkbar liste (inkl. ingrediensnavn) over publiserte oppskrifter. */
export async function getSearchableRecipes(): Promise<SearchableRecipe[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoRecipes()).map(toSearchable);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente søkbare oppskrifter:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawRecipeRow[]).map((row) => toSearchable(mapRecipeRow(row)));
}

export async function getFeaturedRecipes(limit = 3): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.isFeatured).slice(0, limit);
}

export async function getNewestRecipes(limit = 6): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.slice(0, limit);
}

export async function getAdminFavoriteRecipes(): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.favoritedByAdmin);
}

export async function getRecipesByCategory(categorySlug: string): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.category?.slug === categorySlug);
}

/**
 * Henter én oppskrift på slug. `includeUnpublished` brukes kun fra admin
 * (forhåndsvisning av utkast) – offentlige sider skal alltid la denne stå
 * som false.
 */
export async function getRecipeBySlug(
  slug: string,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): Promise<Recipe | null> {
  if (!isSupabaseConfigured) {
    const recipe = findDemoRecipe(slug);
    if (!recipe) return null;
    if (!recipe.isPublished && !includeUnpublished) return null;
    return recipe;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke hente oppskrift:", error.message);
    return null;
  }
  if (!data) return null;

  const recipe = mapRecipeRow(data as unknown as RawRecipeRow);
  if (!recipe.isPublished && !includeUnpublished) return null;
  return recipe;
}

/**
 * Kun slugs for publiserte oppskrifter – brukt av generateStaticParams og
 * app/sitemap.ts, som begge kjører UTEN en ekte HTTP-forespørsel. Bruker
 * derfor den cookie-frie klienten (se lib/supabase/static.ts) i stedet for
 * å gå via getPublishedRecipeSummaries/createClient, som ville kastet en
 * feil om cookies() i disse kontekstene.
 */
export async function getAllSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoRecipes()).map((r) => r.slug);
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase.from("recipes").select("slug").eq("is_published", true);

  if (error) {
    console.error("Kunne ikke hente slugs:", error.message);
    return [];
  }

  return (data ?? []).map((r) => r.slug);
}

/** Alle oppskrifter (også upubliserte), kun for admin-dashbordet. */
export async function getAllRecipesForAdmin(): Promise<RecipeSummary[]> {
  if (!isSupabaseConfigured) {
    return demoRecipes.map(toSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente oppskrifter for admin:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawRecipeRow[]).map((row) => toSummary(mapRecipeRow(row)));
}

export async function getRecipeByIdForAdmin(id: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured) {
    const recipe = demoRecipes.find((r) => r.id === id);
    return recipe ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRecipeRow(data as unknown as RawRecipeRow);
}

export async function getAllRecipeSlugsForCollisionCheck(excludeId?: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return demoRecipes.filter((r) => r.id !== excludeId).map((r) => r.slug);
  }

  const supabase = await createClient();
  let query = supabase.from("recipes").select("id, slug");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r) => r.slug);
}
