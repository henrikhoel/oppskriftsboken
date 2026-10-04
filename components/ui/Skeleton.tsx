import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-cream-dark", className)} />;
}

export function RecipeCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-paper shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Skjelett for BrowseRecipeCard.tsx (04.10.2026-redesignet /oppskrifter) –
 * EGEN, parallell komponent til RecipeCardSkeleton over, av nøyaktig samme
 * grunn som BrowseRecipeCard selv ikke er en endring av RecipeCard: ingen
 * kort-boks/skygge, kun bilde + to korte tekstlinjer (metadata-linje +
 * tittel) liggende fritt, uten padding rundt.
 */
export function BrowseRecipeCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
