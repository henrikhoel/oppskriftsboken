import type { GuideCategory } from "@/lib/types";

/**
 * Foreløpige kategorier for "Hvordan gjør jeg det?" (spesifikasjon punkt 7)
 * – EGEN liste fra lib/demo-data/categories.ts (oppskrift-kategorier), se
 * filheaderen til supabase/migrations/0013_knowledge_guides.sql for
 * hvorfor. Samme "delt kilde til sannhet for demo-modus og seeding"-mønster
 * som demoCategories: scripts/seed.ts upserter disse inn i
 * guide_categories via slug.
 *
 * Ikke en lukket liste – admin kan opprette/redigere/slette flere via
 * /admin/guider/kategorier når som helst (se GuideCategoryManager.tsx).
 */
export const demoGuideCategories: GuideCategory[] = [
  { id: "gcat-grunnteknikker", slug: "grunnteknikker", name: "Grunnteknikker", nameEn: "Basic techniques", sortOrder: 1 },
  { id: "gcat-sauser", slug: "sauser", name: "Sauser", nameEn: "Sauces", sortOrder: 2 },
  { id: "gcat-kjott-fisk", slug: "kjott-og-fisk", name: "Kjøtt & fisk", nameEn: "Meat & fish", sortOrder: 3 },
  { id: "gcat-gronnsaker", slug: "gronnsaker-og-tilbehor", name: "Grønnsaker & tilbehør", nameEn: "Vegetables & sides", sortOrder: 4 },
  { id: "gcat-baking", slug: "baking-og-deig", name: "Baking & deig", nameEn: "Baking & dough", sortOrder: 5 },
  { id: "gcat-kniv", slug: "kniv-og-forberedelser", name: "Kniv & forberedelser", nameEn: "Knife skills & prep", sortOrder: 6 },
  { id: "gcat-smak", slug: "smak", name: "Smak", nameEn: "Flavor", sortOrder: 7 },
  { id: "gcat-redde-maten", slug: "redde-maten", name: "Redde maten", nameEn: "Save the dish", sortOrder: 8 },
];

export function findDemoGuideCategory(slug: string): GuideCategory | undefined {
  return demoGuideCategories.find((c) => c.slug === slug);
}
