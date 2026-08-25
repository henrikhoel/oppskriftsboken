"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { StarIcon } from "@/components/ui/icons";
import { useRecipeRatings } from "@/lib/hooks/useRecipeRatings";
import { rateRecipe } from "@/lib/actions/ratings";
import { formatRatingSummary } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Stjernevurdering. `interactive` (standard) lar besøkende klikke for å gi
 * 1-5 stjerner, og viser totalsnittet i parentes ved siden av – brukt på
 * selve oppskriftssiden. Med `interactive={false}` vises kun det
 * aggregerte snittet uten mulighet til å klikke, til bruk i oppskriftskort.
 */
export function RatingStars({
  recipeId,
  recipeSlug,
  initialRatingSum,
  initialRatingCount,
  interactive = true,
  size = "md",
  lang = "no",
}: {
  recipeId: string;
  recipeSlug?: string;
  initialRatingSum: number;
  initialRatingCount: number;
  interactive?: boolean;
  size?: "sm" | "md";
  lang?: Lang;
}) {
  const { getRating, setRating, hydrated } = useRecipeRatings();
  const [sum, setSum] = useState(initialRatingSum);
  const [count, setCount] = useState(initialRatingCount);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const myRating = hydrated ? getRating(recipeId) : null;
  const average = count > 0 ? sum / count : 0;
  const displayStars = hoverStars ?? myRating ?? Math.round(average);
  const summary = formatRatingSummary(sum, count, lang);

  function handleRate(stars: number) {
    if (!interactive || isPending) return;
    setError(null);

    const previous = sum;
    const previousCount = count;
    const previousMine = myRating;

    // Optimistisk oppdatering av snittet mens forespørselen pågår.
    setSum((s) => (previousMine != null ? s - previousMine + stars : s + stars));
    setCount((c) => (previousMine != null ? c : c + 1));
    setRating(recipeId, stars);

    startTransition(async () => {
      try {
        const result = await rateRecipe(recipeId, stars, previousMine, recipeSlug);
        setSum(result.ratingSum);
        setCount(result.ratingCount);
      } catch (err) {
        setSum(previous);
        setCount(previousCount);
        setError(err instanceof Error ? err.message : t(lang, "rating.error"));
      }
    });
  }

  const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex items-center gap-0.5"
        onMouseLeave={() => setHoverStars(null)}
        role={interactive ? "radiogroup" : undefined}
        aria-label={interactive ? t(lang, "rating.groupAria") : undefined}
      >
        {STAR_VALUES.map((value) => {
          const filled = value <= displayStars;
          if (!interactive) {
            return <StarIcon key={value} filled={filled} className={clsx(starSize, "text-clay")} />;
          }
          return (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onMouseEnter={() => setHoverStars(value)}
              onFocus={() => setHoverStars(value)}
              onBlur={() => setHoverStars(null)}
              onClick={() => handleRate(value)}
              aria-label={t(lang, "rating.starAria", { value })}
              aria-pressed={myRating === value}
              className="text-clay transition-transform hover:scale-110 disabled:cursor-not-allowed"
            >
              <StarIcon filled={filled} className={starSize} />
            </button>
          );
        })}
      </div>
      {summary && <span className="text-sm text-ink-faint">({summary})</span>}
      {error && <span className="text-xs text-clay-dark">{error}</span>}
    </div>
  );
}
