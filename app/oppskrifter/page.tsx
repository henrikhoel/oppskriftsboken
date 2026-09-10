import { Suspense } from "react";
import type { Metadata } from "next";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getAllCategories } from "@/lib/data/categories";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { BrowseRecipesClient } from "@/components/search/BrowseRecipesClient";
import { SearchBar } from "@/components/search/SearchBar";
import { RecipeCardSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "recipesPage.title"),
    description: t(lang, "recipesPage.metaDescription"),
  };
}

export default async function RecipesPage() {
  const [recipes, categories, user, lang] = await Promise.all([
    getSearchableRecipes(),
    getAllCategories(),
    getCurrentUserFast(),
    getLang(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "recipesPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "recipesPage.description")}</p>

      {/* Rolig tekstlenke til den nye manuelle menybyggeren (10.09.2026) –
          bevisst en lenke her, IKKE et nytt punkt i hovednavigasjonen, se
          filheaderen til ManualMealBuilder.tsx. Plassert rett under
          introteksten, siden det er her folk uansett blar i retter. */}
      <p className="mt-3">
        <Link
          href="/meny/ny"
          className="text-sm font-medium text-clay underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "recipesPage.buildMealLink")}
        </Link>
      </p>

      {/* Søkefeltet i toppmenyen (HeaderSearchSlot.tsx) er skjult på mobil
          (md:hidden der), og mobilens søkeknapp i Header.tsx sender rett
          hit til /oppskrifter uten noe søkefelt å skrive i – et reelt hull,
          oppdaget 10.09.2026 ("der er det ingen 'søk i oppskrifter'-felt").
          Samme SearchBar-komponent som header/forsiden allerede bruker,
          duplisert her KUN på mobil (md:hidden) siden desktop fortsatt har
          den i header – helt øverst på siden, rett under tittelen. */}
      <div className="mt-6 md:hidden">
        <Suspense fallback={<div className="h-11 rounded-full bg-cream-dark" />}>
          <SearchBar lang={lang} />
        </Suspense>
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <BrowseRecipesClient
            recipes={recipes}
            categories={categories}
            isAdmin={Boolean(user?.isAdmin)}
            lang={lang}
          />
        </Suspense>
      </div>
    </div>
  );
}
