"use client";

/**
 * "Ukesmeny" – admin-styring for /ukesmeny (30.09.2026). ÉN kombinert
 * liste (ikke flere separate sider) for admin-innstillingene som hører
 * sammen her:
 *
 * 1. "Utelatt" – enkelt boolsk felt (weekly_menu_excluded, migrasjon
 *    0024) – oppskriften trekkes ALDRI ut, uansett hvilken stil brukeren
 *    velger. Samme "opt-out fremfor opt-in"-begrunnelse som
 *    favorited_by_admin: standard er "med", Henrik trenger kun å merke
 *    unntakene (helgemat, store prosjekter).
 * 2. "Vegetar" – enkelt boolsk felt (is_vegetarian, migrasjon 0027, lagt
 *    til 01.10.2026, Henrik: "på ukesmeny bør man egentlig ha en knapp
 *    'Kun vegetar'"). Samme "eksplisitt admin-bryter fremfor fri
 *    tekst/AI-gjetting"-begrunnelse som moods/courses/weekly_menu_styles.
 *    Standard AV (opt-in, motsatt av "utelatt") – de fleste oppskriftene
 *    er ikke vegetar, så Henrik merker kun de som faktisk er det.
 * 3. Fire stil-ikoner (weekly_menu_styles, migrasjon 0025) – samme
 *    array-mønster som moods/courses, en oppskrift kan stå i flere stiler
 *    samtidig. "Variert" (Henriks standardvalg på selve /ukesmeny) er
 *    BEVISST ikke en av disse fire knappene – den filtrerer ikke på
 *    weekly_menu_styles i det hele tatt, se filheaderen i
 *    lib/kitchen-intelligence/weekly-menu-styles.ts.
 *
 * Bygget som ÉN rad per oppskrift (utelatt-knapp + vegetar-knapp + fire
 * stil-ikoner ved siden av hverandre) fremfor flere separate lister,
 * samme grunn som RolePicker.tsx: Henrik vil typisk vurdere flere av
 * disse tingene for en oppskrift i samme øyeblikk ("passer denne på en
 * hverdag, er den vegetar, og i så fall hvilken(e) stil(er)?").
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import {
  setWeeklyMenuExclusion,
  setRecipeVegetarian,
  addRecipeToWeeklyMenuStyle,
  removeRecipeFromWeeklyMenuStyle,
} from "@/lib/actions/recipes";
import { WEEKLY_MENU_STYLE_DEFINITIONS, type WeeklyMenuStyleId } from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { SearchIcon, CheckIcon, XIcon, LeafIcon, ClockIcon, UsersIcon, SparklesIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Ikonvalg for de fire stilene – se filheaderen i WeeklyMenuView.tsx for
// samme sett brukt i selve stilvelgeren på /ukesmeny.
const STYLE_ICONS = {
  sunt_enkelt: LeafIcon,
  rask: ClockIcon,
  familievennlig: UsersIcon,
  litt_ekstra: SparklesIcon,
} as const;

function Thumb({ recipe }: { recipe: RecipeSummary }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
      {recipe.heroImageUrl && (
        <Image src={recipe.heroImageUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />
      )}
    </div>
  );
}

export function WeeklyMenuAdminPicker({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const includedCount = recipes.filter((r) => !r.weeklyMenuExcluded).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, query]);

  function handleToggleExcluded(recipe: RecipeSummary) {
    const key = `${recipe.id}:excluded`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setWeeklyMenuExclusion(recipe.id, !recipe.weeklyMenuExcluded);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleToggleVegetarian(recipe: RecipeSummary) {
    const key = `${recipe.id}:vegetarian`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setRecipeVegetarian(recipe.id, !recipe.isVegetarian);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleToggleStyle(recipe: RecipeSummary, styleId: WeeklyMenuStyleId, active: boolean) {
    const key = `${recipe.id}:${styleId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        if (active) {
          await removeRecipeFromWeeklyMenuStyle(recipe.id, styleId);
        } else {
          await addRecipeToWeeklyMenuStyle(recipe.id, styleId);
        }
        router.refresh();
      } finally {
        setPendingKey(null);
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
            const excludedKey = `${recipe.id}:excluded`;
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
                  onClick={() => handleToggleExcluded(recipe)}
                  disabled={isPending && pendingKey === excludedKey}
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

                <button
                  type="button"
                  onClick={() => handleToggleVegetarian(recipe)}
                  disabled={isPending && pendingKey === `${recipe.id}:vegetarian`}
                  aria-pressed={recipe.isVegetarian}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                    recipe.isVegetarian
                      ? "border-olive bg-olive-light text-olive-dark"
                      : "border-line-strong bg-cream text-ink-faint hover:bg-cream-dark",
                  )}
                >
                  <LeafIcon className="h-3.5 w-3.5" />
                  Vegetar
                </button>

                <div className="flex shrink-0 flex-wrap gap-1.5 border-l border-line pl-3">
                  {WEEKLY_MENU_STYLE_DEFINITIONS.map((style) => {
                    const Icon = STYLE_ICONS[style.id];
                    const active = (recipe.weeklyMenuStyles ?? []).includes(style.id);
                    const key = `${recipe.id}:${style.id}`;
                    const label = t(lang, style.labelKey);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleToggleStyle(recipe, style.id, active)}
                        disabled={isPending && pendingKey === key}
                        aria-pressed={active}
                        aria-label={label}
                        title={label}
                        className={clsx(
                          "flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                          active
                            ? "border-clay bg-clay text-cream"
                            : "border-line-strong bg-cream text-ink-faint hover:bg-cream-dark",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
