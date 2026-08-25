import type { Difficulty } from "@/lib/config";
import type { TasteProfile } from "@/lib/kitchen-intelligence/taste";
import type { NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";

/**
 * Domenetyper for oppskriftsboken. Disse speiler databaseskjemaet i
 * supabase/migrations/0001_init.sql. Feltnavn er camelCase her og
 * mappes til/fra snake_case i lib/data/mappers.ts, slik at resten av
 * appen slipper å tenke på databasens navnekonvensjon.
 */

export interface IngredientItem {
  id: string;
  /** F.eks. "200". Tom streng/undefined for "etter smak" o.l. */
  amount: string | null;
  /** F.eks. "g", "dl", "stk". */
  unit: string | null;
  /** F.eks. "rigatoni". */
  name: string;
  /** F.eks. "finhakket" eller "romtemperert". */
  note: string | null;
  sortOrder: number;
}

export interface IngredientGroup {
  id: string;
  /** F.eks. "Kjøttboller", "Saus". Null/"" for oppskrifter uten grupper. */
  title: string | null;
  sortOrder: number;
  items: IngredientItem[];
}

export interface RecipeStep {
  id: string;
  /** Gruppetittel, f.eks. "Saus", for oppskrifter med flere delsteg-sett. */
  groupTitle: string | null;
  stepNumber: number;
  text: string;
  sortOrder: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** Engelsk navn, generert med AI (eller manuelt redigert) i admin – se
   * lib/actions/categories.ts -> generateEnglishCategoryName. Null/ikke satt
   * = ingen engelsk variant ennå, bruk lib/utils/format.ts sin
   * localizedCategoryName, som faller tilbake til det norske navnet. */
  nameEn?: string | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface RecipeImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

/** Forenklet ingrediens-/steg-form uten id/sortOrder – brukt for den
 * AI-genererte vegetarvarianten (se lib/actions/ai.ts -> getVegetarianVariant).
 * Genereres på forespørsel av en besøkende og lagres ikke i databasen. */
export interface VegetarianIngredientItem {
  amount: string | null;
  unit: string | null;
  name: string;
  note: string | null;
}

export interface VegetarianIngredientGroup {
  title: string | null;
  items: VegetarianIngredientItem[];
}

export interface VegetarianStep {
  groupTitle: string | null;
  text: string;
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Forhåndsgenerert engelsk tittel/beskrivelse (admin -> "Generer med AI",
   * se lib/actions/recipes.ts -> generateEnglishTitleDescription). Null =
   * ingen engelsk variant lagret ennå – bruk lib/utils/format.ts sine
   * localizedTitle/localizedDescription, som faller tilbake til den norske
   * originalen. IKKE det samme som den fulle, live AI-oversettelsen på
   * selve oppskriftssiden (ingredienser/steg) – den er uendret. Valgfrie
   * felt (ikke satt på demo-oppskriftene i lib/demo-data/recipes.ts, som
   * ikke går via databasen). */
  titleEn?: string | null;
  descriptionEn?: string | null;
  /** Forhåndsgenerert smaksprofil (admin -> "Generer smaksprofil", se
   * lib/actions/recipes.ts -> generateTasteProfile). Null/undefined = ikke
   * generert ennå – vis da INGEN smaksprofil-seksjon på oppskriftssiden,
   * ikke en tom/lastende en. Samme "valgfritt, ikke satt i demo-data"-
   * mønster som titleEn/descriptionEn over. */
  tasteProfile?: TasteProfile | null;
  /** Forhåndsgenerert kalori-/makro-oversikt (admin -> "Generer
   * næringsinnhold", se lib/actions/recipes.ts -> generateNutritionInfo).
   * Null/undefined = ikke generert ennå – vis da INGEN "vis
   * næringsinnhold"-knapp på oppskriftssiden. Samme "valgfritt, ikke satt i
   * demo-data"-mønster som tasteProfile over. */
  nutritionInfo?: NutritionInfo | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  /** true = hovedbildet ble generert av AI i admin, ikke et ekte opplastet foto. */
  heroImageIsAiGenerated: boolean;
  images: RecipeImage[];
  category: Category | null;
  tags: Tag[];
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  difficulty: Difficulty;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  notes: string | null;
  tips: string | null;
  source: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  favoritedByAdmin: boolean;
  /** Sum av alle stjernevurderinger (1-5). Snitt = ratingSum / ratingCount. */
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Lettvekts-variant brukt i kort/lister der vi ikke trenger hele oppskriften. */
export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "titleEn"
  | "descriptionEn"
  | "heroImageUrl"
  | "heroImageAlt"
  | "category"
  | "tags"
  | "totalTimeMinutes"
  | "difficulty"
  | "isFeatured"
  | "favoritedByAdmin"
  | "createdAt"
  | "isPublished"
  | "ratingSum"
  | "ratingCount"
>;

export interface RecipeFilters {
  query?: string;
  categorySlug?: string;
  difficulty?: Difficulty;
  maxTotalTime?: number;
  favoritesOnly?: boolean;
  ingredient?: string;
}

export interface ShoppingListEntry {
  id: string;
  amount: number | null;
  /** Uskalert, opprinnelig tekstmengde – brukt når amount ikke kan parses. */
  displayAmount: string | null;
  unit: string | null;
  name: string;
  checked: boolean;
  /** Hvilke oppskrifter denne linjen stammer fra, for sporbarhet i UI. */
  fromRecipes: string[];
}
