import type {
  IngredientCategory,
  IngredientOrigin,
  IngredientOriginGroup,
  Season,
  SeasonalIngredient,
} from "@/lib/types";

/**
 * Rå radform slik Supabase returnerer seasons/seasonal_ingredients – samme
 * håndskrevet-fremfor-utledet begrunnelse som RawGuideRow i
 * lib/data/guide-mappers.ts. Feltene under speiler seasonal_ingredients
 * etter 0016_season_ingredient_richness.sql – se filheaderen der og i
 * lib/types.ts for den fulle begrunnelsen for hvert nytt felt.
 */
export interface RawSeasonRow {
  id: string;
  slug: string;
  name_no: string;
  name_en: string | null;
  months: number[] | null;
  intro_no: string;
  intro_en: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawSeasonalIngredientRow {
  id: string;
  season_id: string;
  slug: string;
  name_no: string;
  name_en: string | null;
  aliases: string[] | null;
  category: string;
  origin_group: string;
  origin: string;
  available_start_month: number | null;
  available_end_month: number | null;
  season_start_month: number | null;
  season_end_month: number | null;
  peak_start_month: number | null;
  peak_end_month: number | null;
  description_no: string | null;
  description_en: string | null;
  season_note_no: string | null;
  season_note_en: string | null;
  source_name: string | null;
  source_url: string | null;
  source_note: string | null;
  verified_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const SEASON_SELECT =
  "id, slug, name_no, name_en, months, intro_no, intro_en, sort_order, is_published, created_at, updated_at";

export const SEASONAL_INGREDIENT_SELECT =
  "id, season_id, slug, name_no, name_en, aliases, category, origin_group, origin, available_start_month, available_end_month, season_start_month, season_end_month, peak_start_month, peak_end_month, description_no, description_en, season_note_no, season_note_en, source_name, source_url, source_note, verified_at, sort_order, created_at, updated_at";

export function mapSeasonRow(row: RawSeasonRow): Season {
  return {
    id: row.id,
    slug: row.slug,
    nameNo: row.name_no,
    nameEn: row.name_en,
    months: row.months ?? [],
    introNo: row.intro_no,
    introEn: row.intro_en,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Databasen lagrer category/origin_group/origin som fri `text` (med
 * check-constraints, se 0016) i stedet for Postgres-enum – disse cast-ene
 * er derfor trygge så lenge check-constraintene holder data konsistent, men
 * TypeScript kan ikke vite det selv. Samme mønster brukes ikke andre
 * steder i data-laget siden dette er de eneste enum-lignende text-feltene
 * på denne tabellen. */
function castCategory(value: string): IngredientCategory {
  return value as IngredientCategory;
}
function castOriginGroup(value: string): IngredientOriginGroup {
  return value as IngredientOriginGroup;
}
function castOrigin(value: string): IngredientOrigin {
  return value as IngredientOrigin;
}

export function mapSeasonalIngredientRow(row: RawSeasonalIngredientRow): SeasonalIngredient {
  return {
    id: row.id,
    seasonId: row.season_id,
    slug: row.slug,
    nameNo: row.name_no,
    nameEn: row.name_en,
    aliases: row.aliases ?? [],
    category: castCategory(row.category),
    originGroup: castOriginGroup(row.origin_group),
    origin: castOrigin(row.origin),
    availableStartMonth: row.available_start_month,
    availableEndMonth: row.available_end_month,
    seasonStartMonth: row.season_start_month,
    seasonEndMonth: row.season_end_month,
    peakStartMonth: row.peak_start_month,
    peakEndMonth: row.peak_end_month,
    descriptionNo: row.description_no,
    descriptionEn: row.description_en,
    seasonNoteNo: row.season_note_no,
    seasonNoteEn: row.season_note_en,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceNote: row.source_note,
    verifiedAt: row.verified_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
