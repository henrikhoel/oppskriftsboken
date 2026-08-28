import type {
  Category,
  IngredientGroup,
  Recipe,
  RecipeImage,
  RecipeStep,
  RecipeSummary,
  Tag,
  VegetarianVariant,
} from "@/lib/types";
import type { Difficulty } from "@/lib/config";
import type { SearchableRecipe } from "@/lib/utils/search";
import type { TasteProfile } from "@/lib/kitchen-intelligence/taste";
import type { NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";

/**
 * Rå radform slik den kommer tilbake fra Supabase når vi embedder relaterte
 * tabeller i én spørring (se lib/data/recipes.ts -> RECIPE_SELECT). Holdt
 * som en egen, håndskrevet type fremfor å prøve å utlede den fra
 * Database-typen, siden PostgREST sin embedding-syntaks ikke lar seg
 * type-utlede automatisk uten kodegenerering.
 */
export interface RawRecipeRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  title_en: string | null;
  description_en: string | null;
  // jsonb – se lib/kitchen-intelligence/taste.ts. `unknown` her (ikke
  // TasteProfile direkte) siden PostgREST/Supabase ikke kan garantere formen
  // på en jsonb-kolonne på typenivå; mapRecipeRow gjør den faktiske castingen,
  // samme prinsipp som ai-cache.ts sin payload.
  taste_profile: unknown | null;
  // jsonb – se lib/kitchen-intelligence/nutrition.ts. Samme
  // unknown-frem-for-NutritionInfo-begrunnelse som taste_profile over.
  nutrition_info: unknown | null;
  // jsonb – se VegetarianVariant i lib/types.ts. Samme
  // unknown-frem-for-egen-type-begrunnelse som taste_profile/nutrition_info over.
  vegetarian_variant: unknown | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  hero_image_is_ai_generated: boolean;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  cook_time_minutes_max: number | null;
  total_time_minutes: number | null;
  difficulty: Difficulty;
  notes: string | null;
  tips: string | null;
  warnings: string | null;
  source: string | null;
  is_published: boolean;
  is_featured: boolean;
  featured_sort_order: number | null;
  favorited_by_admin: boolean;
  rating_sum: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  category: { id: string; slug: string; name: string; name_en: string | null; sort_order: number } | null;
  recipe_tags: { tags: { id: string; slug: string; name: string } | null }[] | null;
  recipe_images: { id: string; url: string; alt: string | null; sort_order: number }[] | null;
  ingredient_groups:
    | {
        id: string;
        title: string | null;
        sort_order: number;
        ingredient_items:
          | {
              id: string;
              amount: string | null;
              unit: string | null;
              name: string;
              note: string | null;
              sort_order: number;
            }[]
          | null;
      }[]
    | null;
  recipe_steps:
    | {
        id: string;
        group_title: string | null;
        step_number: number;
        text: string;
        sort_order: number;
      }[]
    | null;
}

function mapCategory(raw: RawRecipeRow["category"]): Category | null {
  if (!raw) return null;
  return { id: raw.id, slug: raw.slug, name: raw.name, nameEn: raw.name_en, sortOrder: raw.sort_order };
}

function mapTags(raw: RawRecipeRow["recipe_tags"]): Tag[] {
  if (!raw) return [];
  return raw
    .map((rt) => rt.tags)
    .filter((t): t is NonNullable<typeof t> => t != null)
    .map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
}

function mapImages(raw: RawRecipeRow["recipe_images"]): RecipeImage[] {
  if (!raw) return [];
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ id: img.id, url: img.url, alt: img.alt, sortOrder: img.sort_order }));
}

function mapIngredientGroups(raw: RawRecipeRow["ingredient_groups"]): IngredientGroup[] {
  if (!raw) return [];
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      id: g.id,
      title: g.title,
      sortOrder: g.sort_order,
      items: [...(g.ingredient_items ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((it) => ({
          id: it.id,
          amount: it.amount,
          unit: it.unit,
          name: it.name,
          note: it.note,
          sortOrder: it.sort_order,
        })),
    }));
}

function mapSteps(raw: RawRecipeRow["recipe_steps"]): RecipeStep[] {
  if (!raw) return [];
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      groupTitle: s.group_title,
      stepNumber: s.step_number,
      text: s.text,
      sortOrder: s.sort_order,
    }));
}

export function mapRecipeRow(raw: RawRecipeRow): Recipe {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    titleEn: raw.title_en,
    descriptionEn: raw.description_en,
    tasteProfile: raw.taste_profile as TasteProfile | null,
    nutritionInfo: raw.nutrition_info as NutritionInfo | null,
    vegetarianVariant: raw.vegetarian_variant as VegetarianVariant | null,
    heroImageUrl: raw.hero_image_url,
    heroImageAlt: raw.hero_image_alt,
    heroImageIsAiGenerated: raw.hero_image_is_ai_generated,
    images: mapImages(raw.recipe_images),
    category: mapCategory(raw.category),
    tags: mapTags(raw.recipe_tags),
    servings: raw.servings,
    prepTimeMinutes: raw.prep_time_minutes,
    cookTimeMinutes: raw.cook_time_minutes,
    cookTimeMinutesMax: raw.cook_time_minutes_max,
    totalTimeMinutes: raw.total_time_minutes,
    difficulty: raw.difficulty,
    ingredientGroups: mapIngredientGroups(raw.ingredient_groups),
    steps: mapSteps(raw.recipe_steps),
    notes: raw.notes,
    tips: raw.tips,
    warnings: raw.warnings,
    source: raw.source,
    isPublished: raw.is_published,
    isFeatured: raw.is_featured,
    featuredSortOrder: raw.featured_sort_order,
    favoritedByAdmin: raw.favorited_by_admin,
    ratingSum: raw.rating_sum,
    ratingCount: raw.rating_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export const RECIPE_SELECT = `
  id, slug, title, description, title_en, description_en, taste_profile, nutrition_info, vegetarian_variant, hero_image_url, hero_image_alt, hero_image_is_ai_generated, servings,
  prep_time_minutes, cook_time_minutes, cook_time_minutes_max, total_time_minutes, difficulty,
  notes, tips, warnings, source, is_published, is_featured, featured_sort_order, favorited_by_admin,
  rating_sum, rating_count,
  created_at, updated_at,
  category:categories(id, slug, name, name_en, sort_order),
  recipe_tags(tags(id, slug, name)),
  recipe_images(id, url, alt, sort_order),
  ingredient_groups(id, title, sort_order, ingredient_items(id, amount, unit, name, note, sort_order)),
  recipe_steps(id, group_title, step_number, text, sort_order)
`;

export function toSummary(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    titleEn: recipe.titleEn,
    descriptionEn: recipe.descriptionEn,
    heroImageUrl: recipe.heroImageUrl,
    heroImageAlt: recipe.heroImageAlt,
    category: recipe.category,
    tags: recipe.tags,
    totalTimeMinutes: recipe.totalTimeMinutes,
    difficulty: recipe.difficulty,
    isFeatured: recipe.isFeatured,
    featuredSortOrder: recipe.featuredSortOrder,
    favoritedByAdmin: recipe.favoritedByAdmin,
    createdAt: recipe.createdAt,
    isPublished: recipe.isPublished,
    ratingSum: recipe.ratingSum,
    ratingCount: recipe.ratingCount,
    servings: recipe.servings,
  };
}

export function toSearchable(recipe: Recipe): SearchableRecipe {
  return {
    ...toSummary(recipe),
    ingredientNames: recipe.ingredientGroups.flatMap((g) => g.items.map((i) => i.name)),
  };
}
