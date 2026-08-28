import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { demoGuides, findDemoGuide } from "@/lib/demo-data/guides";
import {
  GUIDE_SELECT,
  GUIDE_SUMMARY_SELECT,
  mapGuideRow,
  mapGuideSummaryRow,
  toGuideSummary,
  type RawGuideRow,
  type RawGuideSummaryRow,
} from "@/lib/data/guide-mappers";
import type { Guide, GuideSearchResult, GuideSummary } from "@/lib/types";
import type { Lang } from "@/lib/i18n/lang";

/**
 * Datatilgangslag for "Hvordan gjør jeg det?"-guider – samme
 * demo-modus-fallback-mønster som lib/data/recipes.ts. Skriveoperasjoner
 * ligger i lib/actions/guides.ts, ikke her.
 */

async function getPublishedDemoGuides(): Promise<Guide[]> {
  return demoGuides.filter((g) => g.isPublished);
}

export async function getPublishedGuideSummaries(): Promise<GuideSummary[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoGuides()).map(toGuideSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_guides")
    .select(GUIDE_SUMMARY_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente guider:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawGuideSummaryRow[]).map(mapGuideSummaryRow);
}

export async function getGuidesByCategory(categorySlug: string): Promise<GuideSummary[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoGuides())
      .filter((g) => g.category?.slug === categorySlug)
      .map(toGuideSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_guides")
    .select(GUIDE_SUMMARY_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente guider for kategori:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawGuideSummaryRow[])
    .map(mapGuideSummaryRow)
    .filter((g) => g.category?.slug === categorySlug);
}

export async function getGuideBySlug(
  slug: string,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): Promise<Guide | null> {
  if (!isSupabaseConfigured) {
    const guide = findDemoGuide(slug);
    if (!guide) return null;
    if (!guide.isPublished && !includeUnpublished) return null;
    return guide;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_guides")
    .select(GUIDE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke hente guide:", error.message);
    return null;
  }
  if (!data) return null;

  const guide = mapGuideRow(data as unknown as RawGuideRow);
  if (!guide.isPublished && !includeUnpublished) return null;
  return guide;
}

/** Kun slugs for publiserte guider – brukt av generateStaticParams/sitemap,
 * som begge kjører uten en ekte HTTP-forespørsel (se samme begrunnelse i
 * lib/data/recipes.ts -> getAllSlugs). */
export async function getAllGuideSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoGuides()).map((g) => g.slug);
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase.from("knowledge_guides").select("slug").eq("is_published", true);

  if (error) {
    console.error("Kunne ikke hente guide-slugs:", error.message);
    return [];
  }

  return (data ?? []).map((g) => g.slug);
}

/** Alle guider (også upubliserte), kun for admin-oversikten. */
export async function getAllGuidesForAdmin(): Promise<GuideSummary[]> {
  if (!isSupabaseConfigured) {
    return demoGuides.map(toGuideSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_guides")
    .select(GUIDE_SUMMARY_SELECT)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente guider for admin:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawGuideSummaryRow[]).map(mapGuideSummaryRow);
}

export async function getGuideByIdForAdmin(id: string): Promise<Guide | null> {
  if (!isSupabaseConfigured) {
    return demoGuides.find((g) => g.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("knowledge_guides").select(GUIDE_SELECT).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return mapGuideRow(data as unknown as RawGuideRow);
}

export async function getAllGuideSlugsForCollisionCheck(excludeId?: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return demoGuides.filter((g) => g.id !== excludeId).map((g) => g.slug);
  }

  const supabase = await createClient();
  let query = supabase.from("knowledge_guides").select("id, slug");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((g) => g.slug);
}

/** Alle guider, til bruk i admin sin "relaterte guider"-velger (trenger kun
 * id/tittel, ikke hele guide-objektet). */
export async function getAllGuideTitlesForAdmin(): Promise<{ id: string; title: string }[]> {
  if (!isSupabaseConfigured) {
    return demoGuides.map((g) => ({ id: g.id, title: g.title }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("knowledge_guides").select("id, title").order("title", { ascending: true });
  if (error || !data) return [];
  return data;
}

/**
 * DATABASE-DREVET, RANGERT SØK – kaller search_knowledge_guides-RPC-en (se
 * migrasjon 0013) i stedet for å hente alle guider og filtrere i appen.
 * Skalerer uendret uansett antall guider (spesifikasjon punkt 21), og
 * krever INGEN AI-kall (spesifikasjon punkt 2) – ren database-rangering:
 * eksakt tittel > alias > søketerm > fulltekstsøk > fuzzy trigram-likhet
 * (se rangerings-kommentaren i selve SQL-funksjonen).
 *
 * `lang` brukes kun til demo-modus sin enkle lokale variant under – selve
 * RPC-en søker i BÅDE norske og engelske felter samtidig (se
 * search_vector/aliases/aliases_en osv. i migrasjonen), siden en besøkende
 * fint kan søke på engelsk selv om sideteksten for øvrig viser norsk.
 */
export async function searchGuides(query: string, lang: Lang = "no", limit = 8): Promise<GuideSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!isSupabaseConfigured) {
    return searchDemoGuides(trimmed, lang).slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_knowledge_guides", {
    search_query: trimmed,
    result_limit: limit,
  });

  if (error) {
    console.error("Kunne ikke søke i guider:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleEn: row.title_en,
    intro: row.intro,
    introEn: row.intro_en,
    difficulty: row.difficulty,
    estimatedTimeMinutes: row.estimated_time_minutes,
    estimatedTimeMinutesMax: row.estimated_time_minutes_max,
    isPublished: true,
    isDemo: row.is_demo,
    category: row.category_id
      ? {
          id: row.category_id,
          slug: row.category_slug ?? "",
          name: row.category_name ?? "",
          nameEn: row.category_name_en,
          sortOrder: 0,
        }
      : null,
    rank: row.rank,
  }));
}

/** Enkel lokal variant av søke-rangeringen i migrasjon 0013, brukt KUN i
 * demo-modus (ingen database å kjøre RPC-en mot). Samme prioriterte
 * rekkefølge, bevisst forenklet (ingen ekte trigram-likhet uten Postgres) –
 * demo-modus har uansett bare et par håndfuller guider å søke i. */
function searchDemoGuides(query: string, lang: Lang): GuideSearchResult[] {
  const q = query.toLowerCase();
  const scored: GuideSearchResult[] = [];

  for (const guide of demoGuides) {
    if (!guide.isPublished) continue;

    const title = (lang === "en" && guide.titleEn ? guide.titleEn : guide.title).toLowerCase();
    const aliases = [...guide.aliases, ...guide.aliasesEn].map((a) => a.toLowerCase());
    const searchTerms = [...guide.searchTerms, ...guide.searchTermsEn].map((s) => s.toLowerCase());

    let rank = 0;
    if (title === q) rank = 100;
    else if (aliases.some((a) => a === q)) rank = 90;
    else if (aliases.some((a) => a.includes(q))) rank = 70;
    else if (searchTerms.some((s) => s.includes(q))) rank = 60;
    else if (title.includes(q)) rank = 45;
    else if (guide.intro.toLowerCase().includes(q) || guide.introEn?.toLowerCase().includes(q)) rank = 35;

    if (rank > 0) scored.push({ ...toGuideSummary(guide), rank });
  }

  return scored.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
}
