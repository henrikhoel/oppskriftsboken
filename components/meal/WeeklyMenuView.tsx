"use client";

/**
 * AUTOMATISK UKESMENY – EDITORIELT REDESIGN (30.09.2026). Henrik: "Redesign
 * /ukesmeny slik at siden føles langt mer som CONVITE: premium, editorial,
 * rolig og stilren [...] Ukesmenyen skal IKKE genereres automatisk når
 * brukeren åpner siden." Fullstendig omskriving av v1/v1.1
 * (WeeklyMenuView.tsx), samme underliggende funksjonalitet:
 *
 * - Siden åpner alltid TOM (ingen forhåndsvalgt stil, ingen generert uke,
 *   ingen placeholder-kort) – "Lag ukesmenyen"-knappen er deaktivert til en
 *   stil er valgt, og genererer FØRST uken når man trykker på den.
 * - INGEN localStorage lenger for selve uken/stilen (v1/v1.1 lagret
 *   { style, recipeIds } i nettleseren – det ga nettopp den utilsiktede
 *   "automatisk gjenopptar forrige uke ved åpning"-oppførselen Henrik nå
 *   eksplisitt IKKE vil ha, og var samtidig kilden til en krasj-bug fra en
 *   eldre lagringsform, se git-historikken). Uken lever nå kun i React
 *   state for varigheten av besøket – enklere, og fjerner hele den
 *   feilklassen på én gang.
 * - "Bytt ut" per dag og "Lag en ny uke" (regenerer innenfor valgt stil)
 *   er uendret i sin logikk, kun i visuelt uttrykk.
 * - Dagskortene er IKKE lenger RecipeCard (som viser kategori-badges,
 *   stjerner, favoritt-hjerte, beskrivelse) – Henrik: "Denne siden trenger
 *   først og fremst å kommunisere: DAG → RETT → TID." Egen, minimal
 *   markering bygget direkte her i stedet: dag-label → bilde → oppskrift
 *   (serif) → tid → bytt ut, ingen kort-boks/border/skygge rundt.
 */
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { formatMinutes, localizedTitle } from "@/lib/utils/format";
import { ShoppingBagIcon, ClockIcon, LeafIcon, UsersIcon, SparklesIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import type { SearchableRecipe } from "@/lib/utils/search";
import { WEEKLY_MENU_STYLE_DEFINITIONS, type WeeklyMenuStyleId } from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { t, type Lang, type DictKey } from "@/lib/i18n";

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
// har bevisst ingen ikon (den er ikke en admin-satt kategori). Henrik:
// "Behold gjerne små, diskrete ikoner på kategoriene" – uendret fra
// v1.1, kun selve pille-stylingen er dempet i redesignet under.
const STYLE_ICONS: Partial<Record<WeeklyMenuChoice, typeof ClockIcon>> = {
  sunt_enkelt: LeafIcon,
  rask: ClockIcon,
  familievennlig: UsersIcon,
  litt_ekstra: SparklesIcon,
};

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
  const [style, setStyle] = useState<WeeklyMenuChoice | null>(null);
  const [recipeIds, setRecipeIds] = useState<string[]>([]);
  const { addFromRecipe } = useShoppingList();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const pool = useMemo(() => {
    if (style === null) return [];
    return style === VARIED_CHOICE ? recipes : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(style));
  }, [recipes, style]);

  const hasEnoughRecipes = style !== null && pool.length >= MIN_RECIPES;
  const generated = recipeIds.length > 0;

  function handlePickStyle(next: WeeklyMenuChoice) {
    if (next === style) return;
    setAdded(false);
    setStyle(next);
    const nextPool = next === VARIED_CHOICE ? recipes : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(next));
    // Kun regenerer AUTOMATISK ved stil-bytte hvis besøkende allerede har
    // generert en uke denne økten (da forventer man at "bytt type" faktisk
    // bytter ut det man ser). Har man IKKE trykket "Lag ukesmenyen" ennå,
    // skal det fortsatt kreve et eksplisitt trykk – se filheaderen.
    if (generated) {
      setRecipeIds(nextPool.length >= MIN_RECIPES ? pickRandomWeek(nextPool) : []);
    }
  }

  function handleGenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    setRecipeIds(pickRandomWeek(pool));
  }

  function handleRegenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    setRecipeIds(pickRandomWeek(pool));
  }

  function handleSwapDay(index: number) {
    const candidates = pool.filter((r) => !recipeIds.includes(r.id));
    if (candidates.length === 0) return;
    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    const nextIds = [...recipeIds];
    nextIds[index] = replacement.id;
    setAdded(false);
    setRecipeIds(nextIds);
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
      <p className="text-xs uppercase tracking-wide text-ink-faint">{t(lang, "weeklyMenu.styleHeading")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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
                "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-clay/50 bg-clay/10 text-clay-dark"
                  : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {t(lang, choice.labelKey)}
            </button>
          );
        })}
      </div>

      {/* TOM STARTTILSTAND – ingen retter, ingen tomme kort. Kun knappen
          (deaktivert til en stil er valgt), eller en melding hvis den
          valgte stilen rett og slett ikke har nok merkede oppskrifter ennå
          (se /admin/ukesmeny). Negativ plass i stedet for placeholders. */}
      {!generated && (
        <div className="mt-8">
          {style !== null && !hasEnoughRecipes ? (
            <p className="max-w-md text-sm text-ink-soft">{t(lang, "weeklyMenu.notEnoughRecipes", { count: MIN_RECIPES })}</p>
          ) : (
            <Button variant="primary" disabled={!style} onClick={handleGenerate}>
              {t(lang, "weeklyMenu.generate")} →
            </Button>
          )}
        </div>
      )}

      {generated && (
        <>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {!added ? (
              <Button variant="primary" onClick={handleAddToShoppingList} disabled={loading}>
                <ShoppingBagIcon className="h-4 w-4" />
                {loading ? t(lang, "weeklyMenu.addLoading") : `${t(lang, "weeklyMenu.addButton")} →`}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-olive-dark">{t(lang, "weeklyMenu.addDone")}</span>
                <Link href="/handleliste" className="font-medium text-clay hover:text-clay-dark">
                  {t(lang, "weeklyMenu.viewList")} →
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handleRegenerate}
              className="text-sm font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "weeklyMenu.regenerate")}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-6">
            {recipeIds.map((id, index) => {
              const recipe = byId.get(id);
              if (!recipe) return null;
              const dayKey = DAY_KEYS[index];
              const dayLabel = t(lang, `weeklyMenu.${dayKey}`);
              const canSwap = pool.some((r) => !recipeIds.includes(r.id));
              return (
                <div key={`${dayKey}-${id}`} className={clsx(index > 0 && "lg:border-l lg:border-line lg:pl-6")}>
                  <p className="text-xs uppercase tracking-wide text-ink-faint">{dayLabel}</p>

                  {/* isLoggedIn/hjerte er bevisst droppet her – se
                      filheaderen: dette skal kommunisere dag → rett → tid,
                      ikke gjenta hele oppskriftskort-UI-et. */}
                  <Link href={`/oppskrifter/${recipe.slug}`} className="group mt-3 block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
                      {recipe.heroImageUrl && (
                        <Image
                          src={recipe.heroImageUrl}
                          alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
                          fill
                          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-4 font-serif text-sm text-ink transition-colors group-hover:text-clay-dark sm:text-base">
                      {localizedTitle(recipe, lang)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">{formatMinutes(recipe.totalTimeMinutes, lang)}</p>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleSwapDay(index)}
                    disabled={!canSwap}
                    aria-label={t(lang, "weeklyMenu.swapAria", { day: dayLabel })}
                    className="mt-2 text-xs text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t(lang, "weeklyMenu.swap")}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
