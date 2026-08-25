import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createStaticClient } from "@/lib/supabase/static";
import { demoCategories } from "@/lib/demo-data/categories";
import type { Category } from "@/lib/types";

// Kategorier er lesbare for alle (se "categories_select_all" i
// supabase/migrations/0001_init.sql), og trenger derfor ingen
// brukersesjon/cookies – den cookie-frie klienten fungerer overalt,
// inkludert i generateStaticParams og app/sitemap.ts.
export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) {
    return demoCategories;
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, name_en, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente kategorier:", error.message);
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

/** Antall publiserte oppskrifter per kategori-slug, brukt på forsiden/kategorisiden. */
export async function getCategoryRecipeCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) {
    const { demoRecipes } = await import("@/lib/demo-data/recipes");
    const counts: Record<string, number> = {};
    for (const r of demoRecipes) {
      if (!r.isPublished || !r.category) continue;
      counts[r.category.slug] = (counts[r.category.slug] ?? 0) + 1;
    }
    return counts;
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("category:categories(slug)")
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
