import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getAdminFavoriteRecipes, getPublishedRecipeSummaries } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { t, type Lang } from "@/lib/i18n";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { GuestFavoritesGrid } from "@/components/recipe/GuestFavoritesGrid";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "favoritesPage.title"),
    description: t(lang, "favoritesPage.metaDescription"),
  };
}

export default async function FavoritesPage() {
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "favoritesPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {user?.isAdmin ? t(lang, "favoritesPage.adminDescription") : t(lang, "favoritesPage.guestDescription")}
      </p>

      <div className="mt-8">
        {user?.isAdmin ? <AdminFavorites lang={lang} /> : <GuestFavorites lang={lang} />}
      </div>
    </div>
  );
}

async function AdminFavorites({ lang }: { lang: Lang }) {
  const favorites = await getAdminFavoriteRecipes();
  return (
    <RecipeGrid
      recipes={favorites}
      emptyTitle={t(lang, "favoritesPage.adminEmptyTitle")}
      emptyDescription={t(lang, "favoritesPage.adminEmptyDescription")}
      lang={lang}
    />
  );
}

async function GuestFavorites({ lang }: { lang: Lang }) {
  const recipes = await getPublishedRecipeSummaries();
  return <GuestFavoritesGrid recipes={recipes} lang={lang} />;
}
