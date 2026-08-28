"use client";

/**
 * "Ukens utvalg" – enkel admin-styring av forsidens utvalgte oppskrifter
 * (ønsket av Henrik 26.08.2026, se AsyncQuestion-svaret: egen admin-side med
 * rekkefølge, helt atskilt fra hjerte-/favoritt-systemet). To lister:
 * - Øverst: de som ER i utvalget nå (isFeatured=true), i admin-satt
 *   rekkefølge – opp/ned-piler + "Fjern".
 * - Under: resten av de publiserte oppskriftene, med søk + "Legg til".
 * Hver handling skriver rett til databasen med det samme (samme
 * startTransition+router.refresh()-mønster som AdminRecipeRow.tsx sin
 * publiser-knapp) – ingen egen "lagre"-knapp å glemme.
 */
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { RecipeSummary } from "@/lib/types";
import { addToFeatured, removeFromFeatured, moveFeatured } from "@/lib/actions/recipes";
import { ArrowUpIcon, ArrowDownIcon, PlusIcon, TrashIcon, SearchIcon } from "@/components/ui/icons";

function Thumb({ recipe }: { recipe: RecipeSummary }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
      {recipe.heroImageUrl && (
        <Image src={recipe.heroImageUrl} alt="" fill sizes="48px" className="object-cover" />
      )}
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
        danger ? "text-ink-faint hover:bg-clay-light hover:text-clay-dark" : "text-ink-soft hover:bg-cream-dark"
      }`}
    >
      {children}
    </button>
  );
}

export function FeaturedPicker({
  featured,
  available,
}: {
  /** Allerede sortert i admin-satt rekkefølge av app/admin/(dashboard)/utvalg/page.tsx. */
  featured: RecipeSummary[];
  /** De publiserte oppskriftene som IKKE er i utvalget ennå. */
  available: RecipeSummary[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filteredAvailable = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((r) => r.title.toLowerCase().includes(q));
  }, [available, query]);

  function handleAdd(recipeId: string) {
    setPendingId(recipeId);
    startTransition(async () => {
      try {
        await addToFeatured(recipeId);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleRemove(recipeId: string) {
    setPendingId(recipeId);
    startTransition(async () => {
      try {
        await removeFromFeatured(recipeId);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleMove(recipeId: string, direction: "up" | "down") {
    setPendingId(recipeId);
    startTransition(async () => {
      try {
        await moveFeatured(recipeId, direction);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-xl text-ink">I utvalget ({featured.length})</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Rekkefølgen her styrer "Ukens utvalg" på forsiden – øverst vises først.
        </p>

        {featured.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-line-strong bg-paper px-5 py-8 text-center text-sm text-ink-faint">
            Ingen oppskrifter i utvalget ennå. Legg til fra listen under.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-card border border-line bg-paper">
            {featured.map((recipe, index) => (
              <div
                key={recipe.id}
                className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
              >
                <span className="w-5 shrink-0 text-sm font-medium text-ink-faint">{index + 1}</span>
                <Thumb recipe={recipe} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{recipe.title}</p>
                  {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
                </div>
                <IconButton
                  label="Flytt opp"
                  onClick={() => handleMove(recipe.id, "up")}
                  disabled={(isPending && pendingId === recipe.id) || index === 0}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Flytt ned"
                  onClick={() => handleMove(recipe.id, "down")}
                  disabled={(isPending && pendingId === recipe.id) || index === featured.length - 1}
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Fjern fra utvalget"
                  danger
                  onClick={() => handleRemove(recipe.id)}
                  disabled={isPending && pendingId === recipe.id}
                >
                  <TrashIcon className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl text-ink">Legg til</h2>
        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter oppskrift …"
            className="w-full rounded-xl border border-line-strong bg-cream py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        {filteredAvailable.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">Ingen treff.</p>
        ) : (
          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-card border border-line bg-paper">
            {filteredAvailable.map((recipe) => (
              <div
                key={recipe.id}
                className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
              >
                <Thumb recipe={recipe} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{recipe.title}</p>
                  {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
                </div>
                <IconButton
                  label="Legg til i utvalget"
                  onClick={() => handleAdd(recipe.id)}
                  disabled={isPending && pendingId === recipe.id}
                >
                  <PlusIcon className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
