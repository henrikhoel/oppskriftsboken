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
import type { NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import type { DrinkPairing } from "@/lib/kitchen-intelligence/drink-pairing";

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
  // jsonb – se lib/kitchen-intelligence/nutrition.ts. `unknown` her (ikke
  // NutritionInfo direkte) siden PostgREST/Supabase ikke kan garantere formen
  // på en jsonb-kolonne på typenivå; mapRecipeRow gjør den faktiske castingen,
  // samme prinsipp som ai-cache.ts sin payload.
  nutrition_info: unknown | null;
  // jsonb – se lib/kitchen-intelligence/drink-pairing.ts. Samme
  // unknown-frem-for-egen-type-begrunnelse som nutrition_info over.
  drink_pairing: unknown | null;
  // jsonb – se VegetarianVariant i lib/types.ts. Samme
  // unknown-frem-for-egen-type-begrunnelse som nutrition_info over.
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
  // smallint, 1-3 eller null – se spiceLevel sin filheader i lib/types.ts.
  spice_level: number | null;
  notes: string | null;
  tips: string | null;
  warnings: string | null;
  source: string | null;
  is_published: boolean;
  is_featured: boolean;
  moods: string[];
  // Se lib/types.ts sin Recipe["courses"] – migrasjon 0022, samme
  // rå-array-mønster som moods over.
  courses: string[];
  // To uavhengige synlighetsbrytere – se migrasjon 0018 sin kommentar for
  // begrunnelse (passer ikke for alle oppskrifter, f.eks. cookies/rundstykker).
  show_beverage_match_checker: boolean;
  show_meal_builder: boolean;
  featured_sort_order: number | null;
  favorited_by_admin: boolean;
  weekly_menu_excluded: boolean;
  weekly_menu_styles: string[];
  is_vegetarian: boolean;
  // Se Recipe["weekendGuests"]/["weekendGuestsOccasions"] i lib/types.ts –
  // migrasjon 0030_recipe_weekend_guests.sql.
  weekend_guests: boolean;
  weekend_guests_occasions: string[];
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
    nutritionInfo: raw.nutrition_info as NutritionInfo | null,
    drinkPairing: raw.drink_pairing as DrinkPairing | null,
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
    spiceLevel: raw.spice_level,
    ingredientGroups: mapIngredientGroups(raw.ingredient_groups),
    steps: mapSteps(raw.recipe_steps),
    notes: raw.notes,
    tips: raw.tips,
    warnings: raw.warnings,
    source: raw.source,
    isPublished: raw.is_published,
    isFeatured: raw.is_featured,
    moods: raw.moods as Recipe["moods"],
    courses: raw.courses as Recipe["courses"],
    showBeverageMatchChecker: raw.show_beverage_match_checker,
    showMealBuilder: raw.show_meal_builder,
    featuredSortOrder: raw.featured_sort_order,
    favoritedByAdmin: raw.favorited_by_admin,
    weeklyMenuExcluded: raw.weekly_menu_excluded,
    weeklyMenuStyles: raw.weekly_menu_styles as Recipe["weeklyMenuStyles"],
    isVegetarian: raw.is_vegetarian,
    weekendGuests: raw.weekend_guests,
    weekendGuestsOccasions: raw.weekend_guests_occasions as Recipe["weekendGuestsOccasions"],
    ratingSum: raw.rating_sum,
    ratingCount: raw.rating_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export const RECIPE_SELECT = `
  id, slug, title, description, title_en, description_en, nutrition_info, drink_pairing, vegetarian_variant, hero_image_url, hero_image_alt, hero_image_is_ai_generated, servings,
  prep_time_minutes, cook_time_minutes, cook_time_minutes_max, total_time_minutes, difficulty, spice_level,
  notes, tips, warnings, source, is_published, is_featured, moods, courses, show_beverage_match_checker, show_meal_builder, featured_sort_order, favorited_by_admin, weekly_menu_excluded, weekly_menu_styles, is_vegetarian, weekend_guests, weekend_guests_occasions,
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
    spiceLevel: recipe.spiceLevel,
    isFeatured: recipe.isFeatured,
    featuredSortOrder: recipe.featuredSortOrder,
    moods: recipe.moods,
    courses: recipe.courses,
    favoritedByAdmin: recipe.favoritedByAdmin,
    weeklyMenuExcluded: recipe.weeklyMenuExcluded,
    weeklyMenuStyles: recipe.weeklyMenuStyles,
    isVegetarian: recipe.isVegetarian,
    weekendGuests: recipe.weekendGuests,
    weekendGuestsOccasions: recipe.weekendGuestsOccasions,
    createdAt: recipe.createdAt,
    displayOrder: recipe.displayOrder,
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

/**
 * Lett radform KUN for listevisninger (forsiden/oppskrift-oversikten/søk/
 * ukesmeny m.fl., se getPublishedRecipeRows i lib/data/recipes.ts) – fikser
 * en runtime-feil fra 03.10.2026: "Failed to set Next.js data cache for
 * unstable_cache ..., items over 2MB can not be cached (2258302 bytes)".
 *
 * Årsaken var at getPublishedRecipeRows cachet den FULLE RawRecipeRow (hele
 * fremgangsmåten, AI-genererte smaksprofil/næringsinnhold/drikkeparring-
 * blobs, alle bilder, hver ingrediens' mengde/enhet/notat osv.) for ALLE
 * ~270+ publiserte oppskrifter i ÉN cache-oppføring – selv om
 * RecipeSummary/SearchableRecipe (alt getPublishedRecipeSummaries og
 * getSearchableRecipes faktisk bruker) kun trenger en brøkdel av feltene.
 * Next.js sin innebygde data-cache har en hard, ukonfigurerbar 2MB-grense
 * per oppføring. RawRecipeListRow/RECIPE_LIST_SELECT/mapRecipeListRow
 * dropper derfor alt listevisningene uansett ikke bruker – recipe_steps
 * (hele fremgangsmåten), nutrition_info/drink_pairing/vegetarian_variant
 * (jsonb-blobs), recipe_images (full liste – kun
 * hero-bildet trengs), prep/cook-tidsfelter (kun total_time_minutes),
 * notes/tips/warnings/source, show_beverage_match_checker/
 * show_meal_builder, updated_at, og det meste av ingredient_groups (kun
 * ingrediensNAVNET beholdes, til søk – ikke mengde/enhet/notat/
 * sortering/gruppetittel). Samme gevinst som tidligere fiks av
 * `unoptimized`-miniatyrene i admin-listene: mindre payload per spørring,
 * ikke bare et cache-problem løst.
 */
export interface RawRecipeListRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  title_en: string | null;
  description_en: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  servings: number;
  total_time_minutes: number | null;
  difficulty: Difficulty;
  spice_level: number | null;
  is_published: boolean;
  is_featured: boolean;
  moods: string[];
  courses: string[];
  featured_sort_order: number | null;
  favorited_by_admin: boolean;
  weekly_menu_excluded: boolean;
  weekly_menu_styles: string[];
  is_vegetarian: boolean;
  // Se Recipe["weekendGuests"]/["weekendGuestsOccasions"] i lib/types.ts –
  // migrasjon 0030_recipe_weekend_guests.sql. Må være med i listevisningen
  // (ikke kun RECIPE_SELECT) siden /helg-og-gjester henter sitt utvalg fra
  // samme delte, cachede liste som /oppskrifter (se getWeekendGuestsRecipes
  // i lib/data/recipes.ts).
  weekend_guests: boolean;
  weekend_guests_occasions: string[];
  rating_sum: number;
  rating_count: number;
  created_at: string;
  // Se displayOrder sin filheader i lib/types.ts og migrasjon 0029 – KUN
  // brukt til å sortere /oppskrifter + "Nyeste oppskrifter" på forsiden.
  display_order: number;
  category: RawRecipeRow["category"];
  recipe_tags: RawRecipeRow["recipe_tags"];
  ingredient_groups: { ingredient_items: { name: string }[] | null }[] | null;
}

export const RECIPE_LIST_SELECT = `
  id, slug, title, description, title_en, description_en, hero_image_url, hero_image_alt, servings,
  total_time_minutes, difficulty, spice_level,
  is_published, is_featured, moods, courses, featured_sort_order, favorited_by_admin, weekly_menu_excluded, weekly_menu_styles, is_vegetarian, weekend_guests, weekend_guests_occasions,
  rating_sum, rating_count,
  created_at, display_order,
  category:categories(id, slug, name, name_en, sort_order),
  recipe_tags(tags(id, slug, name)),
  ingredient_groups(ingredient_items(name))
`;

export function mapRecipeListRow(raw: RawRecipeListRow): SearchableRecipe {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    titleEn: raw.title_en,
    descriptionEn: raw.description_en,
    heroImageUrl: raw.hero_image_url,
    heroImageAlt: raw.hero_image_alt,
    category: mapCategory(raw.category),
    tags: mapTags(raw.recipe_tags),
    totalTimeMinutes: raw.total_time_minutes,
    difficulty: raw.difficulty,
    spiceLevel: raw.spice_level,
    isFeatured: raw.is_featured,
    featuredSortOrder: raw.featured_sort_order,
    moods: raw.moods as RecipeSummary["moods"],
    courses: raw.courses as RecipeSummary["courses"],
    favoritedByAdmin: raw.favorited_by_admin,
    weeklyMenuExcluded: raw.weekly_menu_excluded,
    weeklyMenuStyles: raw.weekly_menu_styles as RecipeSummary["weeklyMenuStyles"],
    isVegetarian: raw.is_vegetarian,
    weekendGuests: raw.weekend_guests,
    weekendGuestsOccasions: raw.weekend_guests_occasions as RecipeSummary["weekendGuestsOccasions"],
    createdAt: raw.created_at,
    displayOrder: raw.display_order,
    isPublished: raw.is_published,
    ratingSum: raw.rating_sum,
    ratingCount: raw.rating_count,
    servings: raw.servings,
    ingredientNames: (raw.ingredient_groups ?? []).flatMap((g) => (g.ingredient_items ?? []).map((i) => i.name)),
  };
}
