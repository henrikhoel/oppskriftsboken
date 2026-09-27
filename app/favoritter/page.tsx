import type { Metadata } from "next";
import { getCurrentUserFast } from "@/lib/auth";
import { getAdminFavoriteRecipes, getPublishedRecipeSummaries } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { t, type Lang } from "@/lib/i18n";
import { RecipeGrid } from "@/components/recipe/RecipeGrid";
import { GuestFavoritesGrid } from "@/components/recipe/GuestFavoritesGrid";
import { LockedPanel } from "@/components/ui/LockedPanel";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "favoritesPage.title"),
    description: t(lang, "favoritesPage.metaDescription"),
  };
}

export default async function FavoritesPage() {
  const [user, lang] = await Promise.all([getCurrentUserFast(), getLang()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "favoritesPage.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {!user
          ? t(lang, "favoritesPage.metaDescription")
          : user.isAdmin
            ? t(lang, "favoritesPage.adminDescription")
            : t(lang, "favoritesPage.guestDescription")}
      </p>

      {/* (27.09.2026) Henrik: "man skal kunne trykke inn på alt på siden,
          men at funksjonene er låst" – favoritter er kontoeksklusivt (se
          prosjektnotatet "Plan: brukerkonto"), derfor låst i stedet for å
          vise det gamle localStorage-baserte GuestFavorites-innholdet til
          en ikke-innlogget besøkende. En innlogget IKKE-admin-bruker ser
          fortsatt GuestFavorites (fortsatt localStorage under panseret,
          bare nå bak innlogging) – konvertering av selve LAGRINGEN til
          `favorites`-tabellen (0021_user_accounts.sql) er et eget,
          senere steg. */}
      <div className="mt-8">
        {!user ? (
          <LockedPanel
            message={t(lang, "featureLocked.favoritesMessage")}
            ctaLabel={t(lang, "featureLocked.cta")}
            nextPath="/favoritter"
          />
        ) : user.isAdmin ? (
          <AdminFavorites lang={lang} />
        ) : (
          <GuestFavorites lang={lang} />
        )}
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
