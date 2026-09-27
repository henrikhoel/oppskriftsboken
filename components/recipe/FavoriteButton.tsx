"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { HeartIcon } from "@/components/ui/icons";
import { useAccountFavorites } from "@/lib/hooks/useAccountFavorites";
import { toggleAdminFavorite } from "@/lib/actions/favorites";
import { t, type Lang } from "@/lib/i18n";

/**
 * To favoritt-mekanismer bak samme knapp:
 * - isAdmin: recipes.favorited_by_admin – ÉN delt, admin-kuratert liste.
 * - isLoggedIn (og ikke admin): favorites-tabellen, per bruker, på tvers av
 *   enheter – useAccountFavorites() (se filheaderen der).
 * `isAdmin` og `isLoggedIn` kommer prop-tredd fra serveren (samme mønster
 * som isAdmin alltid har brukt), så knappen selv trenger ingen egen
 * auth-sjekk.
 *
 * Vises IKKE i det hele tatt for en ikke-innlogget besøkende (27.09.2026,
 * Henrik: "det gir ikke mening at man skal kunne lagre retter i
 * favoritter når man ikke er logget inn. hjerte knappen må fjernes helt
 * for ikke-innloggede"). Frem til nå fantes det en tredje, gjeste-variant
 * her som lagret til localStorage (lib/hooks/useFavorites.ts, nå slettet
 * – ingen andre steder i kodebasen brukte den lenger etter denne
 * fjerningen) – den lot en ikke-innlogget besøkende hjerte retter og
 * filtrere på dem via "vis kun favoritter" i FilterPanel.tsx, men kunne
 * ALDRI se en egen oversikt, siden /favoritter alltid har vist LockedPanel
 * for !user. Favoritter er nå 100 % kontoeksklusivt overalt, konsekvent
 * med resten av innholdsgatingen (se prosjektnotatet).
 */
export function FavoriteButton({
  recipeId,
  initialFavorited,
  isAdmin,
  isLoggedIn,
  size = "md",
  lang = "no",
}: {
  recipeId: string;
  initialFavorited: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  size?: "sm" | "md";
  lang?: Lang;
}) {
  // useAccountFavorites() kalles ubetinget, uansett isAdmin/isLoggedIn –
  // React sine hook-regler tillater ikke at et hook-kall selv er
  // betinget. Selve returverdien brukes kun i den innloggede,
  // ikke-admin-grenen under; helt ufarlig (og et rent no-op, ingen
  // nettverkskall) at hooken "kjører" for admin også, siden
  // ensureHydrated() der uansett aldri kalles for en admin-økt i praksis
  // (ingen komponent leser accountHydrated/isAccountFavorite for isAdmin).
  const {
    isFavorite: isAccountFavorite,
    toggle: toggleAccount,
    hydrated: accountHydrated,
  } = useAccountFavorites();
  const [adminFavorited, setAdminFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!isAdmin && !isLoggedIn) return null;

  const favorited = isAdmin ? adminFavorited : accountHydrated ? isAccountFavorite(recipeId) : initialFavorited;

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
      toggleAccount(recipeId);
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
