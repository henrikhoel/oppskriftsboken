"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

const STORAGE_KEY = "oppskriftsboken:favoritter";

/** Gjest-favoritter lagret i localStorage (id-array). Se lib/config.ts. */
export function useFavorites() {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, []);

  const isFavorite = useCallback((recipeId: string) => ids.includes(recipeId), [ids]);

  const toggle = useCallback(
    (recipeId: string) => {
      setIds((prev) =>
        prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId],
      );
    },
    [setIds],
  );

  return { favoriteIds: ids, isFavorite, toggle, hydrated };
}
