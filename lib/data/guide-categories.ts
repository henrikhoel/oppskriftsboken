import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createStaticClient } from "@/lib/supabase/static";
import { demoGuideCategories } from "@/lib/demo-data/guide-categories";
import type { GuideCategory } from "@/lib/types";

/**
 * Datatilgangslag for "Hvordan gjør jeg det?"-kategorier – samme mønster som
 * lib/data/categories.ts (oppskrift-kategorier), men EGEN tabell
 * (guide_categories), se filheaderen til
 * supabase/migrations/0013_knowledge_guides.sql.
 */
export async function getAllGuideCategories(): Promise<GuideCategory[]> {
  if (!isSupabaseConfigured) {
    return demoGuideCategories;
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("guide_categories")
    .select("id, slug, name, name_en, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente guide-kategorier:", error.message);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameEn: c.name_en,
    sortOrder: c.sort_order,
  }));
}

/** Antall publiserte guider per kategori-slug – brukt på landingssiden. */
export async function getGuideCategoryCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) {
    const { demoGuides } = await import("@/lib/demo-data/guides");
    const counts: Record<string, number> = {};
    for (const g of demoGuides) {
      if (!g.isPublished || !g.category) continue;
      counts[g.category.slug] = (counts[g.category.slug] ?? 0) + 1;
    }
    return counts;
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("knowledge_guides")
    .select("category:guide_categories(slug)")
    .eq("is_published", true);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    const slug = (row.category as { slug: string } | null)?.slug;
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}
