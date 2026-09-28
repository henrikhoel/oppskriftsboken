"use client";

/**
 * "Ukesmeny" – admin-styring av hvilke publiserte oppskrifter som er
 * EGNET for den automatiske man–fre-ukesmenyen (29.09.2026, se migrasjon
 * 0024_recipe_weekly_menu_exclude.sql for hele bakgrunnen: Henrik – "det
 * er urealistisk å skulle lage indrefilet med rødvinssaus midt i uka").
 *
 * Enklere enn søsknene MoodPicker/RolePicker/FeaturedPicker – dette er ÉN
 * boolsk kolonne, ikke et array, så hver rad har kun ÉN toggle-knapp i
 * stedet for et sett med ikoner. "Utelatt" er unntaket (standard er å
 * være MED i ukesmenyen, se migrasjonens filheader), så knappen fremhever
 * bevisst den AKTIVE "med i ukesmenyen"-tilstanden i olivengrønt (samme
 * "ferdig/positiv"-farge som MealShoppingListSection.tsx bruker) fremfor
 * å fremheve "utelatt"-tilstanden.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import { setWeeklyMenuExclusion } from "@/lib/actions/recipes";
import { SearchIcon, CheckIcon, XIcon } from "@/components/ui/icons";

function Thumb({ recipe }: { recipe: RecipeSummary }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
      {recipe.heroImageUrl && <Image src={recipe.heroImageUrl} alt="" fill sizes="48px" className="object-cover" />}
    </div>
  );
}

export function WeeklyMenuExclusionPicker({ recipes }: { recipes: RecipeSummary[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const includedCount = recipes.filter((r) => !r.weeklyMenuExcluded).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, query]);

  function handleToggle(recipe: RecipeSummary) {
    setPendingId(recipe.id);
    startTransition(async () => {
      try {
        await setWeeklyMenuExclusion(recipe.id, !recipe.weeklyMenuExcluded);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        {includedCount} av {recipes.length} publiserte oppskrifter er med i ukesmenyen.
      </p>

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

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">Ingen treff.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-card border border-line bg-paper">
          {filtered.map((recipe) => {
            const included = !recipe.weeklyMenuExcluded;
            return (
              <div
                key={recipe.id}
                className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
              >
                <Thumb recipe={recipe} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{recipe.title}</p>
                  {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(recipe)}
                  disabled={isPending && pendingId === recipe.id}
                  aria-pressed={included}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                    included
                      ? "border-olive bg-olive-light text-olive-dark"
                      : "border-line-strong bg-cream text-ink-faint hover:bg-cream-dark",
                  )}
                >
                  {included ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                  {included ? "I ukesmenyen" : "Utelatt"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
