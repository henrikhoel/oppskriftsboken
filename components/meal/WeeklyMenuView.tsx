"use client";

/**
 * AUTOMATISK UKESMENY (29.09.2026, utvidet 30.09.2026) – sentrert rundt
 * Henriks krav (se prosjektnotatet "plan-brukerkontoer.md"): fem
 * tilfeldige, UNIKE middager for mandag–fredag, trukket kun blant
 * publiserte oppskrifter som IKKE er merket "utelatt" i /admin/ukesmeny.
 * Ingen AI involvert – ren tilfeldig trekning uten tilbakelegging
 * (Fisher–Yates).
 *
 * UTVIDET 30.09.2026 med to ting Henrik ba om rett etter v1:
 *
 * 1. "Bytt ut" PER DAG – Henrik: "jeg vil at man skal kunne bytte en rett
 *    om man vil det, ikke måtte generere ny uke, det er kjipt om man like
 *    4 av 5 retter." Bytter KUN den ene dagens rett (mot en tilfeldig
 *    kandidat fra samme pool som ikke allerede står i uken), resten av
 *    uken er urørt.
 * 2. "Velg stil for uken" – fem valg (Variert = standard/ingen filter,
 *    pluss fire admin-satte stiler fra weekly_menu_styles, se
 *    lib/kitchen-intelligence/weekly-menu-styles.ts). Bytter man stil,
 *    regenereres hele uken fra den nye, filtrerte poolen (en delvis
 *    beholdt uke på tvers av stiler ga ikke mening – stilen skal prege
 *    HELE uken).
 *
 * Uken (inkl. valgt stil) lagres i localStorage (samme mønster som
 * useShoppingList.ts) slik at den ikke bytter seg selv ut ved hver
 * sideoppdatering – kun ved en eksplisitt handling (bytt dag/generer ny
 * uke/velg stil), ELLER stille og automatisk hvis en tidligere valgt
 * oppskrift ikke lenger er gyldig for gjeldende stil (avpublisert,
 * slettet, utelatt, eller ikke lenger tagget med stilen).
 *
 * Handlelistedelen gjenbruker EKSAKT samme mønster som
 * MealShoppingListSection.tsx: getMealShoppingIngredients() for ferske
 * ingrediens-/porsjonsdata, og mergeIngredientsIntoList() (via
 * useShoppingList sin addFromRecipe) for selve sammenslåingen.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { ShoppingBagIcon, ClockIcon, LeafIcon, UsersIcon, SparklesIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import type { SearchableRecipe } from "@/lib/utils/search";
import { WEEKLY_MENU_STYLE_DEFINITIONS, type WeeklyMenuStyleId } from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { t, type Lang, type DictKey } from "@/lib/i18n";

const STORAGE_KEY = "oppskriftsboken:ukesmeny";
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const MIN_RECIPES = DAY_KEYS.length;

// "Variert" er BEVISST ikke en del av WEEKLY_MENU_STYLE_DEFINITIONS (den
// filtrerer ikke på weekly_menu_styles i det hele tatt) – se filheaderen i
// lib/kitchen-intelligence/weekly-menu-styles.ts. Lagt til her, kun
// klient-side, som det femte, alltid-tilgjengelige valget i pille-raden.
const VARIED_CHOICE = "variert" as const;
type WeeklyMenuChoice = typeof VARIED_CHOICE | WeeklyMenuStyleId;

const STYLE_CHOICES: { id: WeeklyMenuChoice; labelKey: DictKey }[] = [
  { id: VARIED_CHOICE, labelKey: "weeklyMenu.style.variert" },
  ...WEEKLY_MENU_STYLE_DEFINITIONS,
];

// Samme ikonsett som components/admin/WeeklyMenuAdminPicker.tsx – "variert"
// har bevisst ingen ikon (den er ikke en admin-satt kategori).
const STYLE_ICONS: Partial<Record<WeeklyMenuChoice, typeof ClockIcon>> = {
  sunt_enkelt: LeafIcon,
  rask: ClockIcon,
  familievennlig: UsersIcon,
  litt_ekstra: SparklesIcon,
};

interface StoredWeeklyMenu {
  style: WeeklyMenuChoice;
  recipeIds: string[];
}

const EMPTY_MENU: StoredWeeklyMenu = { style: VARIED_CHOICE, recipeIds: [] };

function pickRandomWeek(pool: SearchableRecipe[], excludeIds: string[] = []): string[] {
  const candidates = pool.filter((r) => !excludeIds.includes(r.id));
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, MIN_RECIPES).map((r) => r.id);
}

export function WeeklyMenuView({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  const [menu, setMenu, hydrated] = useLocalStorage<StoredWeeklyMenu>(STORAGE_KEY, EMPTY_MENU);
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const { style, recipeIds } = menu;

  const pool = useMemo(
    () =>
      style === VARIED_CHOICE
        ? recipes
        : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(style)),
    [recipes, style],
  );

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const poolIds = useMemo(() => new Set(pool.map((r) => r.id)), [pool]);

  const hasEnoughRecipes = pool.length >= MIN_RECIPES;
  const storedIsValid = recipeIds.length === MIN_RECIPES && recipeIds.every((id) => poolIds.has(id));

  // Regenerer stille hvis den lagrede uken er tom, ufullstendig, eller
  // inneholder en oppskrift som ikke lenger er kvalifisert for GJELDENDE
  // stil – se filheader.
  useEffect(() => {
    if (!hydrated || !hasEnoughRecipes || storedIsValid) return;
    setMenu({ style, recipeIds: pickRandomWeek(pool) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hasEnoughRecipes, storedIsValid, style]);

  function handlePickStyle(next: WeeklyMenuChoice) {
    if (next === style) return;
    setAdded(false);
    const nextPool =
      next === VARIED_CHOICE ? recipes : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(next));
    setMenu({ style: next, recipeIds: pickRandomWeek(nextPool) });
  }

  function handleRegenerate() {
    setAdded(false);
    setMenu({ style, recipeIds: pickRandomWeek(pool) });
  }

  function handleSwapDay(index: number) {
    const candidates = pool.filter((r) => !recipeIds.includes(r.id));
    if (candidates.length === 0) return;
    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    const nextIds = [...recipeIds];
    nextIds[index] = replacement.id;
    setAdded(false);
    setMenu({ style, recipeIds: nextIds });
  }

  async function handleAddToShoppingList() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(recipeIds);
      const dataById = new Map(data.map((d) => [d.recipeId, d]));
      for (const id of recipeIds) {
        const recipeData = dataById.get(id);
        if (!recipeData || recipeData.baseServings <= 0) continue;
        addFromRecipe(recipeData.ingredientGroups, recipeData.title, 1, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: recipeData.baseServings,
        });
      }
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {t(lang, "weeklyMenu.styleHeading")}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {STYLE_CHOICES.map((choice) => {
          const Icon = STYLE_ICONS[choice.id];
          const active = choice.id === style;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => handlePickStyle(choice.id)}
              aria-pressed={active}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-clay bg-clay text-cream"
                  : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {t(lang, choice.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {!hasEnoughRecipes ? (
          <p className="rounded-card border border-line bg-paper px-5 py-4 text-sm text-ink-soft">
            {t(lang, "weeklyMenu.notEnoughRecipes", { count: MIN_RECIPES })}
          </p>
        ) : !hydrated || !storedIsValid ? (
          <p className="text-sm text-ink-faint">…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" onClick={handleRegenerate}>
                {t(lang, "weeklyMenu.regenerate")}
              </Button>

              <div>
                {!added ? (
                  <button
                    type="button"
                    onClick={handleAddToShoppingList}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBagIcon className="h-4 w-4" />
                    {loading ? t(lang, "weeklyMenu.addLoading") : t(lang, "weeklyMenu.addButton")}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-olive-dark">{t(lang, "weeklyMenu.addDone")}</span>
                    <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
                      {t(lang, "weeklyMenu.viewList")} →
                    </Link>
                  </div>
                )}
                {error && <p className="mt-1.5 text-xs text-clay-dark">{error}</p>}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {recipeIds.map((id, index) => {
                const recipe = byId.get(id);
                const dayKey = DAY_KEYS[index];
                const dayLabel = t(lang, `weeklyMenu.${dayKey}`);
                if (!recipe) return null;
                // Kan man bytte ut akkurat DENNE dagen? Krever minst én
                // kandidat i poolen som ikke allerede står i uken (ellers
                // ville "bytt ut" enten gjort ingenting eller dupliserte en
                // rett som allerede står en annen dag).
                const canSwap = pool.some((r) => !recipeIds.includes(r.id));
                return (
                  <div key={`${dayKey}-${id}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{dayLabel}</p>
                      <button
                        type="button"
                        onClick={() => handleSwapDay(index)}
                        disabled={!canSwap}
                        aria-label={t(lang, "weeklyMenu.swapAria", { day: dayLabel })}
                        className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t(lang, "weeklyMenu.swap")}
                      </button>
                    </div>
                    {/* isLoggedIn hardkodet true – denne komponenten rendres
                        kun når bruker er innlogget, se gatingen i
                        app/ukesmeny/page.tsx, samme prinsipp som
                        isLoggedIn={Boolean(user)} på /oppskrifter. Så
                        hjertet bruker kontobasert favoritt, ikke
                        gjeste-varianten. */}
                    <RecipeCard recipe={recipe} lang={lang} isLoggedIn />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
