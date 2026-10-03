"use client";

/**
 * "Helg & gjester" – admin-styring for /helg-og-gjester (03.10.2026, se
 * migrasjon 0030_recipe_weekend_guests.sql for hele bakgrunnen). Samme
 * grunnprinsipp som WeeklyMenuAdminPicker.tsx (Henrik ba eksplisitt om
 * dette: "Lag en ny admin-side/fane 'Helg & gjester' etter samme
 * grunnprinsipp som eksisterende admin-side for Ukesmeny") – ÉN kombinert
 * liste (av/på-bryter + fem anlednings-ikoner per rad), ikke flere
 * separate sider, med samme søkefelt-mønster.
 *
 * To UAVHENGIGE felt per rad, bevisst IKKE koblet sammen teknisk (Henrik:
 * "Ikke koble Helg & gjester teknisk til 'Gjør det til en kveld'. Jeg
 * styrer selv begge togglene" – samme prinsipp gjelder her mellom selve
 * "Helg & gjester"-bryteren og anledningene):
 * 1. "Helg & gjester" – av/på (weekend_guests). Standard AV (opt-in,
 *    motsatt av Ukesmeny sin "utelatt"-opt-out) – de fleste oppskriftene
 *    er ikke kuratert for denne siden.
 * 2. Fem anlednings-ikoner (weekend_guests_occasions) – samme
 *    array-mønster som moods/courses/weekly_menu_styles, en oppskrift kan
 *    stå i flere anledninger samtidig. Kan i prinsippet settes uavhengig
 *    av om "Helg & gjester" selv er på (databasen håndhever ingen
 *    avhengighet, se migrasjonens filheader) – admin-UI-et her lar deg
 *    sette dem uansett, akkurat som Ukesmeny-admin lar deg sette stiler
 *    selv om oppskriften ikke er eksplisitt "utelatt" eller ikke.
 *
 * INGEN miniatyrbilde per rad – samme begrunnelse som
 * WeeklyMenuAdminPicker.tsx sin filheader (Supabase-egress-kvoten).
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import {
  setRecipeWeekendGuests,
  addRecipeToWeekendGuestsOccasion,
  removeRecipeFromWeekendGuestsOccasion,
} from "@/lib/actions/recipes";
import {
  WEEKEND_GUESTS_OCCASION_DEFINITIONS,
  type WeekendGuestsOccasionId,
} from "@/lib/kitchen-intelligence/weekend-guests";
import { SearchIcon, CheckIcon, XIcon, CalendarIcon, HeartIcon, UsersIcon, HomeIcon, SparklesIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Ikonvalg for de fem anledningene – rent visuelle snarveier i den smale
// knapperaden, samme "gjenbruk eksisterende ikoner fremfor å finne opp nye
// per funksjon"-mønster som STYLE_ICONS i WeeklyMenuAdminPicker.tsx og
// MOOD_ICONS i MoodModeSection.tsx (begge gjenbruker også ikoner på tvers
// av funksjoner, f.eks. ClockIcon/UsersIcon).
const OCCASION_ICONS = {
  fredagskveld: CalendarIcon,
  date_night: HeartIcon,
  venner_pa_middag: UsersIcon,
  familie: HomeIcon,
  feiring: SparklesIcon,
} as const;

export function WeekendGuestsAdminPicker({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const includedCount = recipes.filter((r) => r.weekendGuests).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, query]);

  function handleToggleIncluded(recipe: RecipeSummary) {
    const key = `${recipe.id}:included`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await setRecipeWeekendGuests(recipe.id, !recipe.weekendGuests);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleToggleOccasion(recipe: RecipeSummary, occasionId: WeekendGuestsOccasionId, active: boolean) {
    const key = `${recipe.id}:${occasionId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        if (active) {
          await removeRecipeFromWeekendGuestsOccasion(recipe.id, occasionId);
        } else {
          await addRecipeToWeekendGuestsOccasion(recipe.id, occasionId);
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
        {includedCount} av {recipes.length} publiserte oppskrifter er med i Helg &amp; gjester.
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
            const includedKey = `${recipe.id}:included`;
            return (
              <div
                key={recipe.id}
                className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{recipe.title}</p>
                  {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleIncluded(recipe)}
                  disabled={isPending && pendingKey === includedKey}
                  aria-pressed={recipe.weekendGuests}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                    recipe.weekendGuests
                      ? "border-olive bg-olive-light text-olive-dark"
                      : "border-line-strong bg-cream text-ink-faint hover:bg-cream-dark",
                  )}
                >
                  {recipe.weekendGuests ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                  {recipe.weekendGuests ? "Helg & gjester" : "Ikke med"}
                </button>

                <div className="flex shrink-0 flex-wrap gap-1.5 border-l border-line pl-3">
                  {WEEKEND_GUESTS_OCCASION_DEFINITIONS.map((occasion) => {
                    const Icon = OCCASION_ICONS[occasion.id];
                    const active = (recipe.weekendGuestsOccasions ?? []).includes(occasion.id);
                    const key = `${recipe.id}:${occasion.id}`;
                    const label = t(lang, occasion.labelKey);
                    return (
                      <button
                        key={occasion.id}
                        type="button"
                        onClick={() => handleToggleOccasion(recipe, occasion.id, active)}
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
