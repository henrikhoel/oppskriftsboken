"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  evaluateManualMeal,
  type ManualMealFitResult,
} from "@/lib/actions/kitchen-intelligence";
import { generateMealId, useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import { ALL_MEAL_COURSE_ROLES, type MealCourseRole } from "@/lib/kitchen-intelligence";
import { filterRecipes, type SearchableRecipe } from "@/lib/utils/search";
import { localizedCategoryName, localizedTitle } from "@/lib/utils/format";
import type { RecipeSummary } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { SearchIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

const MAX_PICKER_RESULTS = 40;

/**
 * DEN MANUELLE MENYBYGGEREN (10.09.2026) – se app/meny/ny/page.tsx. Motsatt
 * av MealBuilder.tsx (som starter fra ÉN ankerrett og lar AI-en generere
 * resten, ev. med oppdiktede "suggested"-retter): her velger brukeren ALLE
 * rettene selv, kun blant EKTE, publiserte oppskrifter fra `recipes`-propen
 * (samme SearchableRecipe[] som /oppskrifter allerede henter). Ingen
 * "suggested"-plasser finnes noensinne i denne flyten.
 *
 * Følger MealBuilder.tsx sitt "bygg lokalt, skriv til MealSession kun ved
 * lagring"-mønster (`selected`-state under, IKKE addExisting per klikk) –
 * enklere å resonnere om, og gir samme trygge flushSync-håndtering ved
 * selve lagringen (se handleSave, samme begrunnelse som MealBuilder.tsx sin
 * handleSave).
 *
 * Retter lagt til her er per avklaring med Henrik alltid "må-ha" – ingen
 * låse/åpne-vippebryter per plass. evaluateManualMeal (se
 * lib/actions/kitchen-intelligence.ts) vurderer derfor kun HELHETEN, og
 * foreslår ekstra retter KUN til de plassene som fortsatt står tomme.
 * `fitResult` nullstilles hver gang utvalget endres (lagt til/fjernet retter
 * på et hvilket som helst vis) – en gammel vurdering for en annen
 * kombinasjon skal aldri stå igjen og se gyldig ut.
 */
export function ManualMealBuilder({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  const router = useRouter();
  const [mealId] = useState(() => generateMealId());
  const { setTitle, addExisting } = useMealSession(mealId, "");
  const { addToIndex } = useMealSessionIndex();

  const [selected, setSelected] = useState<Partial<Record<MealCourseRole, RecipeSummary>>>({});
  const [menuTitle, setMenuTitle] = useState("");

  const [pickerRole, setPickerRole] = useState<MealCourseRole | null>(null);
  const [query, setQuery] = useState("");

  const [fitResult, setFitResult] = useState<ManualMealFitResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filledRoles = ALL_MEAL_COURSE_ROLES.filter((role) => selected[role]);
  const emptyRoles = ALL_MEAL_COURSE_ROLES.filter((role) => !selected[role]);

  const usedIds = useMemo(
    () => new Set(Object.values(selected).filter((r): r is RecipeSummary => Boolean(r)).map((r) => r.id)),
    [selected],
  );

  const pickerResults = useMemo(() => {
    if (pickerRole === null) return [];
    const available = recipes.filter((r) => !usedIds.has(r.id));
    return filterRecipes(available, { query }).slice(0, MAX_PICKER_RESULTS);
  }, [pickerRole, recipes, usedIds, query]);

  function openPicker(role: MealCourseRole) {
    setPickerRole(role);
    setQuery("");
  }

  function selectRecipe(role: MealCourseRole, recipe: RecipeSummary) {
    setSelected((prev) => ({ ...prev, [role]: recipe }));
    setFitResult(null);
    setEvalError(null);
    setPickerRole(null);
    setQuery("");
  }

  function removeRole(role: MealCourseRole) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
    setFitResult(null);
    setEvalError(null);
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setEvalError(null);
    try {
      const filled = filledRoles.map((role) => {
        const recipe = selected[role]!;
        return {
          role,
          recipeId: recipe.id,
          title: recipe.title,
          description: recipe.description,
          categoryName: recipe.category?.name ?? null,
        };
      });
      const result = await evaluateManualMeal(filled, emptyRoles, lang);
      setFitResult(result);
    } catch (err) {
      setFitResult(null);
      setEvalError(err instanceof Error ? err.message : t(lang, "manualMeal.evaluateError"));
    } finally {
      setEvaluating(false);
    }
  }

  async function handleSave() {
    if (filledRoles.length === 0) return;
    setSaving(true);
    try {
      // Se MealBuilder.tsx sin handleSave for hvorfor flushSync er nødvendig
      // her – samme "mange setState-kall + router.push i samme hendelse,
      // uten et eneste await imellom"-situasjon, samme fiks.
      flushSync(() => {
        setTitle(menuTitle || t(lang, "manualMeal.heading"));
        for (const role of filledRoles) {
          const recipe = selected[role]!;
          addExisting(role, { id: recipe.id, slug: recipe.slug, title: recipe.title }, recipe.servings);
        }
        addToIndex(mealId);
      });
      setSaved(true);
      router.push(`/meny/${mealId}`);
    } finally {
      setSaving(false);
    }
  }

  const hasAnySuggestions = fitResult
    ? ALL_MEAL_COURSE_ROLES.some((role) => !selected[role] && (fitResult.suggestions[role]?.length ?? 0) > 0)
    : false;

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "manualMeal.heading")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "manualMeal.intro")}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ALL_MEAL_COURSE_ROLES.map((role) => {
          const recipe = selected[role];
          return (
            <div key={role} className="flex flex-col gap-2 rounded-xl border border-line bg-cream p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t(lang, `mealBuilder.role.${role}`)}
              </span>
              {recipe ? (
                <>
                  <p className="font-serif text-base text-ink">{localizedTitle(recipe, lang)}</p>
                  {recipe.category && (
                    <p className="text-xs text-ink-faint">{localizedCategoryName(recipe.category, lang)}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRole(role)}
                    className="mt-1 self-start text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                  >
                    {t(lang, "mealBuilder.remove")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-faint">{t(lang, "manualMeal.emptySlot")}</p>
                  <button
                    type="button"
                    onClick={() => openPicker(role)}
                    className="mt-1 self-start rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark"
                  >
                    {t(lang, "manualMeal.pickButton")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filledRoles.length > 0 && (
        <div className="mt-8 space-y-4">
          <Button onClick={handleEvaluate} disabled={evaluating} variant="outline" size="sm">
            {evaluating ? t(lang, "manualMeal.evaluating") : t(lang, "manualMeal.evaluateButton")}
          </Button>

          {evalError && <p className="text-sm text-clay-dark">{evalError}</p>}

          {fitResult && (
            <div className="rounded-xl border border-line bg-cream p-4">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl text-clay">{fitResult.fitScore}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {t(lang, "manualMeal.fitScoreLabel")}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{fitResult.fitReasoning}</p>

              {hasAnySuggestions && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {t(lang, "manualMeal.suggestionsHeading")}
                  </p>
                  {ALL_MEAL_COURSE_ROLES.map((role) => {
                    if (selected[role]) return null;
                    const list = fitResult.suggestions[role];
                    if (!list || list.length === 0) return null;
                    return (
                      <div key={role}>
                        <p className="text-xs font-medium text-ink-faint">{t(lang, `mealBuilder.role.${role}`)}</p>
                        <div className="mt-1.5 space-y-2">
                          {list.map((suggestion) => (
                            <div
                              key={suggestion.recipe.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm text-ink">{localizedTitle(suggestion.recipe, lang)}</p>
                                <p className="text-xs text-ink-faint">{suggestion.reasoning}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => selectRecipe(role, suggestion.recipe)}
                                className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark"
                              >
                                {t(lang, "manualMeal.addSuggestion")}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {filledRoles.length > 0 && (
        <div className="mt-8 space-y-4 border-t border-line pt-6">
          <div className="max-w-sm">
            <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t(lang, "mealBuilder.titleLabel")}
            </label>
            <input
              type="text"
              value={menuTitle}
              onChange={(e) => setMenuTitle(e.target.value)}
              placeholder={t(lang, "manualMeal.heading")}
              // text-base på mobil (unngår iOS-innzooming ved fokus).
              className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink focus:border-clay focus:outline-none sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={saving} variant="primary" size="sm">
              {saving ? t(lang, "mealBuilder.saving") : t(lang, "mealBuilder.save")}
            </Button>
            {saved && (
              <Button href={`/meny/${mealId}`} variant="outline" size="sm">
                {t(lang, "mealBuilder.viewSaved")}
              </Button>
            )}
          </div>
        </div>
      )}

      <Drawer
        open={pickerRole !== null}
        onClose={() => setPickerRole(null)}
        title={pickerRole ? t(lang, "manualMeal.pickerTitle", { role: t(lang, `mealBuilder.role.${pickerRole}`) }) : ""}
        closeLabel={t(lang, "manualMeal.closePickerAria")}
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "manualMeal.searchPlaceholder")}
            autoFocus
            // text-base på mobil (unngår iOS-innzooming ved fokus).
            className="w-full rounded-xl border border-line-strong bg-paper py-2.5 pl-9 pr-3 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
          />
        </div>

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
          {pickerResults.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-faint">{t(lang, "manualMeal.noResults")}</p>
          ) : (
            pickerResults.map((recipe) => (
              <div key={recipe.id} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
                  {recipe.heroImageUrl && (
                    <Image
                      src={recipe.heroImageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{localizedTitle(recipe, lang)}</p>
                  {recipe.category && (
                    <p className="truncate text-xs text-ink-faint">{localizedCategoryName(recipe.category, lang)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => pickerRole && selectRecipe(pickerRole, recipe)}
                  className="shrink-0 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark"
                >
                  {t(lang, "manualMeal.selectButton")}
                </button>
              </div>
            ))
          )}
        </div>
      </Drawer>
    </div>
  );
}
