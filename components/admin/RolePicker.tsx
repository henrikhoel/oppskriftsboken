"use client";

/**
 * "Roller" – egen admin-side (27.09.2026, ønsket av Henrik, se migrasjon
 * 0022_recipe_meal_roles.sql sin filheader for hele bakgrunnen). Rett
 * parallell til MoodPicker.tsx ("Humør"), bygget etter at Henrik avbrøt
 * arbeidet med kontolagring for å be om dette først: "når man velger en
 * egen meny, så skal man velge forrett, hovedrett, dessert, tilbehør osv.
 * ... da må dette også være noe jeg som admin kan velge, på lik måte som
 * humør ... og her også kan det jo hende at flere passer i flere
 * kategorier, så samme utforming som humør tror jeg er bra her."
 *
 * Samme begrunnelse som MoodPicker.tsx for ÉN søkbar liste (ikke fire
 * separate "legg til"-lister) – en oppskrift kan stå i flere roller
 * samtidig (f.eks. en salat som både forrett og tilbehør), så fire
 * separate lister ville enten vist samme oppskrift flere ganger eller
 * kunstig skjult den fra andre lister mens den redigeres i én. Én rad per
 * oppskrift med fire små på/av-knapper (ett ikon per rolle) gir full
 * oversikt og ett-klikks redigering.
 *
 * Rolletekstene (forrett/hovedrett/tilbehør/dessert) hentes fra de samme
 * `mealBuilder.role.*`-nøklene som allerede brukes i den offentlige
 * menybyggeren (ManualMealBuilder.tsx/MealBuilder.tsx) – IKKE nye
 * dictionary-nøkler – siden dette er nøyaktig samme rollebegrep, bare
 * administrert her i stedet for kun vist der.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import type { RecipeSummary } from "@/lib/types";
import { addRecipeToCourse, removeRecipeFromCourse } from "@/lib/actions/recipes";
import { ALL_MEAL_COURSE_ROLES, type MealCourseRole } from "@/lib/kitchen-intelligence";
import { LeafIcon, StarIcon, UsersIcon, HeartIcon, SearchIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

// Firedelingen er fast (se ALL_MEAL_COURSE_ROLES) – ikonene under er kun
// valgt for å gi rask visuell gjenkjenning i listen, samme
// as-const-begrunnelse som MOOD_ICONS i MoodPicker.tsx.
const ROLE_ICONS = {
  starter: LeafIcon,
  main: StarIcon,
  side: UsersIcon,
  dessert: HeartIcon,
} as const;

function Thumb({ recipe }: { recipe: RecipeSummary }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
      {recipe.heroImageUrl && <Image src={recipe.heroImageUrl} alt="" fill sizes="48px" className="object-cover" />}
    </div>
  );
}

export function RolePicker({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const counts = useMemo(() => {
    const c: Record<MealCourseRole, number> = { starter: 0, main: 0, side: 0, dessert: 0 };
    for (const recipe of recipes) {
      for (const role of recipe.courses ?? []) {
        if (role in c) c[role as MealCourseRole] += 1;
      }
    }
    return c;
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, query]);

  function handleToggle(recipe: RecipeSummary, role: MealCourseRole, active: boolean) {
    const key = `${recipe.id}:${role}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        if (active) {
          await removeRecipeFromCourse(recipe.id, role);
        } else {
          await addRecipeToCourse(recipe.id, role);
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
        {ALL_MEAL_COURSE_ROLES.map((role) => (
          <span
            key={role}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm font-medium text-ink-soft"
          >
            {t(lang, `mealBuilder.role.${role}`)} <span className="text-ink-faint">({counts[role]})</span>
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
              <Thumb recipe={recipe} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{recipe.title}</p>
                {recipe.category && <p className="text-xs text-ink-faint">{recipe.category.name}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {ALL_MEAL_COURSE_ROLES.map((role) => {
                  const Icon = ROLE_ICONS[role];
                  const active = (recipe.courses ?? []).includes(role);
                  const key = `${recipe.id}:${role}`;
                  const label = t(lang, `mealBuilder.role.${role}`);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleToggle(recipe, role, active)}
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
          ))}
        </div>
      )}
    </div>
  );
}
