"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

const STORAGE_KEY = "oppskriftsboken:vurderinger";

/**
 * Gjestens EGNE stjernevurderinger, lagret i localStorage (recipeId -> 1-5).
 * Det aggregerte tallet (rating_sum/rating_count) ligger i databasen og
 * oppdateres via lib/actions/ratings.ts – se den filen for hvorfor.
 */
export function useRecipeRatings() {
  const [ratings, setRatings, hydrated] = useLocalStorage<Record<string, number>>(STORAGE_KEY, {});

  const getRating = useCallback((recipeId: string) => ratings[recipeId] ?? null, [ratings]);

  const setRating = useCallback(
    (recipeId: string, stars: number) => {
      setRatings((prev) => ({ ...prev, [recipeId]: stars }));
    },
    [setRatings],
  );

  return { getRating, setRating, hydrated };
}
