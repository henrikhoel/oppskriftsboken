import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ClockIcon } from "@/components/ui/icons";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";
import {
  formatMinutes,
  difficultyLabel,
  localizedTitle,
  localizedDescription,
  localizedCategoryName,
} from "@/lib/utils/format";
import { RatingStars } from "@/components/recipe/RatingStars";
import { t, type Lang } from "@/lib/i18n";

export function RecipeCard({
  recipe,
  priority = false,
  isAdmin = false,
  lang = "no",
}: {
  recipe: RecipeSummary;
  priority?: boolean;
  /** Kun sant på sider som faktisk henter innlogget bruker server-side (se
   * app/oppskrifter/page.tsx) – avgjør om hjertet i hjørnet skriver til den
   * DELTE admin-favoritten (favoritedByAdmin i databasen) eller til
   * besøkendes EGEN, lokale favorittliste (useFavorites-hooken inni
   * FavoriteButton). Samme skille som på selve oppskriftssiden. */
  isAdmin?: boolean;
  lang?: Lang;
}) {
  return (
    <Link
      href={`/oppskrifter/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-paper shadow-card transition-shadow duration-200 hover:shadow-card-hover focus-visible:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
        {recipe.heroImageUrl ? (
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <span className="font-serif text-lg">{t(lang, "recipeCard.imageComing")}</span>
          </div>
        )}
        <div className="absolute right-3 top-3 shadow-card">
          <FavoriteButton
            recipeId={recipe.id}
            initialFavorited={recipe.favoritedByAdmin}
            isAdmin={isAdmin}
            size="sm"
            lang={lang}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {recipe.category && <Badge tone="clay">{localizedCategoryName(recipe.category, lang)}</Badge>}
          <Badge tone="neutral">{difficultyLabel(recipe.difficulty, lang)}</Badge>
        </div>
        <h3 className="font-serif text-lg leading-snug text-ink">{localizedTitle(recipe, lang)}</h3>
        {recipe.ratingCount > 0 && (
          <RatingStars
            recipeId={recipe.id}
            initialRatingSum={recipe.ratingSum}
            initialRatingCount={recipe.ratingCount}
            interactive={false}
            size="sm"
            lang={lang}
          />
        )}
        <p className="line-clamp-2 text-sm text-ink-soft">{localizedDescription(recipe, lang)}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-ink-faint">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{formatMinutes(recipe.totalTimeMinutes, lang)}</span>
        </div>
      </div>
    </Link>
  );
}
