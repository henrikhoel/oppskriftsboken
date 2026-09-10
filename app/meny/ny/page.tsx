import type { Metadata } from "next";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { ManualMealBuilder } from "@/components/meal/ManualMealBuilder";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "manualMeal.heading") };
}

/**
 * "BYGG EN MENY SELV" – nytt inngangspunkt (10.09.2026) ved siden av den
 * ankerrett-baserte menybyggeren (MealBuilder.tsx, nådd fra en enkelt
 * oppskriftsside). Lenket til fra /oppskrifter (se recipesPage.buildMealLink
 * i lib/i18n/dictionary.ts) – IKKE i hovednavigasjonen. Tynn server-wrapper,
 * samme mønster som app/meny/[id]/page.tsx og app/oppskrifter/page.tsx: kun
 * henter det klientkomponenten trenger (hele katalogen som SearchableRecipe[]
 * for velgeren, samme henting /oppskrifter allerede gjør) og rendrer
 * ManualMealBuilder.tsx. Ingen isAdmin-sjekk nødvendig – ingenting skriver
 * til databasen noe sted i denne funksjonen, kun til besøkendes egen
 * localStorage (se useMealSession).
 */
export default async function NewManualMealPage() {
  const [recipes, lang] = await Promise.all([getSearchableRecipes(), getLang()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <ManualMealBuilder recipes={recipes} lang={lang} />
    </div>
  );
}
