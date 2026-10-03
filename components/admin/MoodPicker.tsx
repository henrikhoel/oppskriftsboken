"use client";

/**
 * "Humør" – egen admin-side (26.09.2026, ønsket av Henrik, se migrasjon
 * 0020_recipe_mood.sql sin filheader for hele bakgrunnen: erstatter den
 * AI-baserte "Hva passer humøret ditt?"-matchingen fullstendig med
 * admin-satte kategorier). Henrik: "lag en 'humør' del, hvor jeg kan legge
 * rettene enkelt til i hver bås" – og presisert rett etter: "viktig at
 * hver rett kan ligge inne i flere enn ett humør".
 *
 * Bevisst ÉN søkbar liste (ikke 5 separate "legg til"-lister slik
 * FeaturedPicker.tsx har for utvalget) – siden en oppskrift nå kan stå i
 * flere humør samtidig, ville 5 separate lister enten måtte vise DE SAMME
 * oppskriftene om igjen i hver liste (rotete), eller kunstig skjule en
 * oppskrift fra andre lister mens den redigeres i én (feil modell for et
 * mange-til-mange-forhold). Én rad per oppskrift med fem små
 * på/av-knapper (ett ikon per humør, samme ikonsett som
 * MoodModeSection.tsx sin forsideseksjon) gir full oversikt og ett-klikks
 * redigering uansett hvor mange humør en oppskrift står i.
 *
 * INGEN miniatyrbilde per rad (fjernet 02.10.2026, se samme begrunnelse i
 * WeeklyMenuAdminPicker.tsx sin filheader – den forrige `unoptimized`
 * <Thumb>-miniatyren lastet ned hele originalbildet for en 48px-visning på
 * hver rad, og var trolig den største enkeltkilden til at Supabase sin
 * gratiskvote for cached egress ble sprengt).
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import { addRecipeToMood, removeRecipeFromMood } from "@/lib/actions/recipes";
import { MOOD_DEFINITIONS, type MoodId } from "@/lib/kitchen-intelligence/moods";
import {
  ClockIcon,
  HeartIcon,
  StarIcon,
  UsersIcon,
  GaugeIcon,
  SparklesIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Samme ikonvalg som components/home/MoodModeSection.tsx – se kommentaren
// der for hvorfor `as const` og ikke en eksplisitt Record<MoodId, ...>.
const MOOD_ICONS = {
  quick: ClockIcon,
  cozy: HeartIcon,
  impress: StarIcon,
  crowd: UsersIcon,
  healthy: GaugeIcon,
  tasty: SparklesIcon,
} as const;

export function MoodPicker({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const counts = useMemo(() => {
    const c: Record<MoodId, number> = { quick: 0, cozy: 0, impress: 0, crowd: 0, healthy: 0, tasty: 0 };
    for (const recipe of recipes) {
      for (const mood of recipe.moods ?? []) {
        if (mood in c) c[mood as MoodId] += 1;
      }
    }
    return c;
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, query]);

  function handleToggle(recipe: RecipeSummary, moodId: MoodId, active: boolean) {
    const key = `${recipe.id}:${moodId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        if (active) {
          await removeRecipeFromMood(recipe.id, moodId);
        } else {
          await addRecipeToMood(recipe.id, moodId);
        }
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MOOD_DEFINITIONS.map((mood) => (
          <span
            key={mood.id}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm font-medium text-ink-soft"
          >
            {t(lang, mood.labelKey)} <span className="text-ink-faint">({counts[mood.id]})</span>
          </span>
        ))}
      </div>

      <div className="relative mt-6">
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
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{recipe.title}</p>
                {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {MOOD_DEFINITIONS.map((mood) => {
                  const Icon = MOOD_ICONS[mood.id];
                  const active = (recipe.moods ?? []).includes(mood.id);
                  const key = `${recipe.id}:${mood.id}`;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => handleToggle(recipe, mood.id, active)}
                      disabled={isPending && pendingKey === key}
                      aria-pressed={active}
                      aria-label={t(lang, mood.labelKey)}
                      title={t(lang, mood.labelKey)}
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
          ))}
        </div>
      )}
    </div>
  );
}
