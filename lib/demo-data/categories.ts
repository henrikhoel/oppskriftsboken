import type { Category } from "@/lib/types";

/**
 * Samme kategorisett som seedes inn i Supabase av scripts/seed.ts – se
 * supabase/migrations/0001_init.sql for tabellstruktur. Holdes som ren
 * TypeScript-data (ikke SQL) slik at demo-modus og seeding deler én kilde
 * til sannhet.
 */
export const demoCategories: Category[] = [
  { id: "cat-pasta", slug: "pasta", name: "Pasta", sortOrder: 1 },
  { id: "cat-pizza", slug: "pizza", name: "Pizza", sortOrder: 2 },
  { id: "cat-kylling", slug: "kylling", name: "Kylling", sortOrder: 3 },
  { id: "cat-kjott", slug: "kjott", name: "Kjøtt", sortOrder: 4 },
  { id: "cat-fisk", slug: "fisk", name: "Fisk", sortOrder: 5 },
  { id: "cat-vegetar", slug: "vegetar", name: "Vegetar", sortOrder: 6 },
  { id: "cat-frokost", slug: "frokost", name: "Frokost", sortOrder: 7 },
  { id: "cat-sauser-dip", slug: "sauser-og-dip", name: "Sauser og dip", sortOrder: 8 },
  { id: "cat-tilbehor", slug: "tilbehor", name: "Tilbehør", sortOrder: 9 },
  { id: "cat-dessert", slug: "dessert", name: "Dessert", sortOrder: 10 },
  { id: "cat-bakst", slug: "bakst", name: "Bakst", sortOrder: 11 },
];

export function findDemoCategory(slug: string): Category | undefined {
  return demoCategories.find((c) => c.slug === slug);
}
