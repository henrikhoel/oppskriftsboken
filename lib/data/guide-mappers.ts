import type { Guide, GuideCategory, GuideRelatedSummary, GuideStep, GuideSummary } from "@/lib/types";
import type { Difficulty } from "@/lib/config";

/**
 * Rå radform for én guide med embeddede relasjoner, slik Supabase returnerer
 * den når GUIDE_SELECT brukes (se lib/data/guides.ts). Samme
 * håndskrevet-fremfor-utledet begrunnelse som RawRecipeRow i
 * lib/data/mappers.ts – PostgREST sin embedding-syntaks lar seg ikke
 * type-utlede automatisk.
 */
export interface RawGuideRow {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  intro: string;
  intro_en: string | null;
  quick_answer_lines: string[] | null;
  quick_answer_lines_en: string[] | null;
  difficulty: Difficulty;
  estimated_time_minutes: number | null;
  estimated_time_minutes_max: number | null;
  tips: string[] | null;
  tips_en: string[] | null;
  warnings: string[] | null;
  warnings_en: string[] | null;
  search_terms: string[] | null;
  search_terms_en: string[] | null;
  aliases: string[] | null;
  aliases_en: string[] | null;
  is_published: boolean;
  is_demo: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category: { id: string; slug: string; name: string; name_en: string | null; sort_order: number } | null;
  knowledge_guide_steps:
    | {
        id: string;
        step_number: number;
        text: string;
        text_en: string | null;
        note: string | null;
        note_en: string | null;
        duration_minutes: number | null;
        temperature: string | null;
        sort_order: number;
      }[]
    | null;
  // Embedded via knowledge_guide_relations -> related_guide_id -> knowledge_guides.
  // Nøstet to nivåer (relasjonsrad -> selve den relaterte guiden), se
  // GUIDE_SELECT sin `related:knowledge_guide_relations(...)`-streng.
  related:
    | {
        sort_order: number;
        related_guide: {
          id: string;
          slug: string;
          title: string;
          title_en: string | null;
          difficulty: Difficulty;
          estimated_time_minutes: number | null;
          estimated_time_minutes_max: number | null;
          category: { id: string; slug: string; name: string; name_en: string | null; sort_order: number } | null;
        } | null;
      }[]
    | null;
}

function mapCategory(raw: RawGuideRow["category"]): GuideCategory | null {
  if (!raw) return null;
  return { id: raw.id, slug: raw.slug, name: raw.name, nameEn: raw.name_en, sortOrder: raw.sort_order };
}

function mapSteps(raw: RawGuideRow["knowledge_guide_steps"]): GuideStep[] {
  if (!raw) return [];
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      stepNumber: s.step_number,
      text: s.text,
      textEn: s.text_en,
      note: s.note,
      noteEn: s.note_en,
      durationMinutes: s.duration_minutes,
      temperature: s.temperature,
      sortOrder: s.sort_order,
    }));
}

function mapRelated(raw: RawGuideRow["related"]): GuideRelatedSummary[] {
  if (!raw) return [];
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => r.related_guide)
    .filter((g): g is NonNullable<typeof g> => g != null)
    .map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      titleEn: g.title_en,
      category: mapCategory(g.category),
      difficulty: g.difficulty,
      estimatedTimeMinutes: g.estimated_time_minutes,
      estimatedTimeMinutesMax: g.estimated_time_minutes_max,
    }));
}

export function mapGuideRow(raw: RawGuideRow): Guide {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    titleEn: raw.title_en,
    intro: raw.intro,
    introEn: raw.intro_en,
    quickAnswerLines: raw.quick_answer_lines ?? [],
    quickAnswerLinesEn: raw.quick_answer_lines_en ?? [],
    category: mapCategory(raw.category),
    difficulty: raw.difficulty,
    estimatedTimeMinutes: raw.estimated_time_minutes,
    estimatedTimeMinutesMax: raw.estimated_time_minutes_max,
    steps: mapSteps(raw.knowledge_guide_steps),
    tips: raw.tips ?? [],
    tipsEn: raw.tips_en ?? [],
    warnings: raw.warnings ?? [],
    warningsEn: raw.warnings_en ?? [],
    searchTerms: raw.search_terms ?? [],
    searchTermsEn: raw.search_terms_en ?? [],
    aliases: raw.aliases ?? [],
    aliasesEn: raw.aliases_en ?? [],
    relatedGuides: mapRelated(raw.related),
    isPublished: raw.is_published,
    isDemo: raw.is_demo,
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** Full spørring – brukt for enkelt-guide-oppslag (guide-side, admin-redigering). */
export const GUIDE_SELECT = `
  id, slug, title, title_en, intro, intro_en, quick_answer_lines, quick_answer_lines_en,
  difficulty, estimated_time_minutes, estimated_time_minutes_max,
  tips, tips_en, warnings, warnings_en, search_terms, search_terms_en, aliases, aliases_en,
  is_published, is_demo, sort_order, created_at, updated_at,
  category:guide_categories(id, slug, name, name_en, sort_order),
  knowledge_guide_steps(id, step_number, text, text_en, note, note_en, duration_minutes, temperature, sort_order),
  related:knowledge_guide_relations!knowledge_guide_relations_guide_id_fkey(
    sort_order,
    related_guide:knowledge_guides!knowledge_guide_relations_related_guide_id_fkey(
      id, slug, title, title_en, difficulty, estimated_time_minutes, estimated_time_minutes_max,
      category:guide_categories(id, slug, name, name_en, sort_order)
    )
  )
`;

/** Lettere spørring til lister (landingsside, kategorisider, admin-oversikt) –
 * uten steg/relasjoner, som ingen listevisning trenger. */
export const GUIDE_SUMMARY_SELECT = `
  id, slug, title, title_en, intro, intro_en, difficulty,
  estimated_time_minutes, estimated_time_minutes_max, is_published, is_demo,
  category:guide_categories(id, slug, name, name_en, sort_order)
`;

export interface RawGuideSummaryRow {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  intro: string;
  intro_en: string | null;
  difficulty: Difficulty;
  estimated_time_minutes: number | null;
  estimated_time_minutes_max: number | null;
  is_published: boolean;
  is_demo: boolean;
  category: { id: string; slug: string; name: string; name_en: string | null; sort_order: number } | null;
}

export function mapGuideSummaryRow(raw: RawGuideSummaryRow): GuideSummary {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    titleEn: raw.title_en,
    intro: raw.intro,
    introEn: raw.intro_en,
    category: mapCategory(raw.category),
    difficulty: raw.difficulty,
    estimatedTimeMinutes: raw.estimated_time_minutes,
    estimatedTimeMinutesMax: raw.estimated_time_minutes_max,
    isPublished: raw.is_published,
    isDemo: raw.is_demo,
  };
}

export function toGuideSummary(guide: Guide): GuideSummary {
  return {
    id: guide.id,
    slug: guide.slug,
    title: guide.title,
    titleEn: guide.titleEn,
    intro: guide.intro,
    introEn: guide.introEn,
    category: guide.category,
    difficulty: guide.difficulty,
    estimatedTimeMinutes: guide.estimatedTimeMinutes,
    estimatedTimeMinutesMax: guide.estimatedTimeMinutesMax,
    isPublished: guide.isPublished,
    isDemo: guide.isDemo,
  };
}
