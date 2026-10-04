import { Suspense } from "react";
import type { Metadata } from "next";
import { getBrowseRecipeSummaries } from "@/lib/data/recipes";
import { getAllCategories } from "@/lib/data/categories";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { BrowseRecipesClient } from "@/components/search/BrowseRecipesClient";
import { SearchBar } from "@/components/search/SearchBar";
import { BrowseRecipeCardSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "recipesPage.title"),
    description: t(lang, "recipesPage.metaDescription"),
  };
}

export default async function RecipesPage() {
  const [recipes, categories, user, lang] = await Promise.all([
    getBrowseRecipeSummaries(),
    getAllCategories(),
    getCurrentUserFast(),
    getLang(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "recipesPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "recipesPage.description")}</p>

      {/* (03.10.2026) Tekstlenken til "Dine menyer" (/mine-menyer), som sto
          her rett under introteksten, er fjernet – etter at søsterlenken
          til den manuelle menybyggeren ("Bygg en meny selv") ble slettet
          samme dag, sto denne ene lenken igjen alene og føltes malplassert
          (Henrik). Selve /mine-menyer-siden og "Lagre menyen"-knappen i
          MealBuilder.tsx ("Gjør det til en kveld") er UENDRET – lagrede
          menyer finnes fortsatt, bare ikke lenket til herfra lenger. */}

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
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <BrowseRecipeCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <BrowseRecipesClient
            recipes={recipes}
            categories={categories}
            isAdmin={Boolean(user?.isAdmin)}
            isLoggedIn={Boolean(user)}
            lang={lang}
          />
        </Suspense>
      </div>
    </div>
  );
}
