"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { HeartIcon } from "@/components/ui/icons";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { toggleAdminFavorite } from "@/lib/actions/favorites";
import { t, type Lang } from "@/lib/i18n";

export function FavoriteButton({
  recipeId,
  initialFavorited,
  isAdmin,
  size = "md",
  lang = "no",
}: {
  recipeId: string;
  initialFavorited: boolean;
  isAdmin: boolean;
  size?: "sm" | "md";
  lang?: Lang;
}) {
  const { isFavorite, toggle, hydrated } = useFavorites();
  const [adminFavorited, setAdminFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const favorited = isAdmin ? adminFavorited : hydrated ? isFavorite(recipeId) : initialFavorited;

  function handleClick(e: MouseEvent) {
    // stopPropagation+preventDefault – FavoriteButton rendres i noen
    // sammenhenger INNI et helt-kort-er-en-lenke (se RecipeCard.tsx sitt
    // hjerte i hjørnet), og uten disse ville et klikk på hjertet også
    // trigget kortets navigasjon til oppskriftssiden. Helt trygt/no-op når
    // knappen ikke står i en lenke (f.eks. på selve oppskriftssiden).
    e.preventDefault();
    e.stopPropagation();
    if (isAdmin) {
      const next = !adminFavorited;
      setAdminFavorited(next);
      startTransition(async () => {
        try {
          await toggleAdminFavorite(recipeId, next);
          router.refresh();
        } catch {
          setAdminFavorited(!next);
        }
      });
    } else {
      toggle(recipeId);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? t(lang, "favorite.remove") : t(lang, "favorite.add")}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full border transition-colors disabled:opacity-60",
        size === "md" ? "px-4 py-2.5 text-sm" : "h-9 w-9",
        favorited
          ? "border-clay bg-clay-light text-clay-dark"
          : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
      )}
    >
      <HeartIcon filled={favorited} className="h-4 w-4" />
      {size === "md" && <span className="font-medium">{favorited ? t(lang, "favorite.saved") : t(lang, "favorite.label")}</span>}
    </button>
  );
}
