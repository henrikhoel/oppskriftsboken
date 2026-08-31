"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { IngredientGroup, Recipe, RecipeStep, VegetarianIngredientGroup, VegetarianStep } from "@/lib/types";
import { RecipeHero } from "@/components/recipe/RecipeHero";
import { ServingsScaler } from "@/components/recipe/ServingsScaler";
import { UnitSystemSwitcher } from "@/components/recipe/UnitSystemSwitcher";
import { CookMode } from "@/components/recipe/CookMode";
import { CookingTimelinePanel } from "@/components/recipe/CookingTimelinePanel";
import { TasteProfileDisplay } from "@/components/recipe/TasteProfileDisplay";
import { NutritionPanel } from "@/components/recipe/NutritionPanel";
import { MealBuilder } from "@/components/recipe/MealBuilder";
import { ParallelTaskBadge } from "@/components/recipe/ParallelTaskBadge";
import type { CookingTimeline } from "@/lib/kitchen-intelligence/timeline";
import { groupInfoByStepId } from "@/lib/kitchen-intelligence/parallel-tasks";
import type { ParallelTaskGroup } from "@/lib/actions/kitchen-intelligence";
import { DrinkPairingSection } from "@/components/recipe/DrinkPairingSection";
import { RecipeQuestionSection } from "@/components/recipe/RecipeQuestionSection";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";
import { RatingStars } from "@/components/recipe/RatingStars";
import { RecipeMeta } from "@/components/recipe/RecipeMeta";
import { Button } from "@/components/ui/Button";
import { CheckIcon, PlayIcon, ShoppingBagIcon } from "@/components/ui/icons";
import { scaleAmount } from "@/lib/utils/scale";
import { convertAmountToUs, type UnitSystem } from "@/lib/utils/units";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { useCookModeState } from "@/lib/hooks/useCookModeState";
import { getEnglishVariant, getUsMeasurementsVariant } from "@/lib/actions/ai";
import { getIngredientSubstitution, type SubstitutionSuggestion } from "@/lib/actions/kitchen-intelligence";
import { localizedCategoryName } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/** Gir AI-svarets JSON-innhold (uten id/sortOrder) samme form som de vanlige
 * ingrediensgruppene/stegene, med genererte id-er – trygt siden denne
 * listen aldri omorganiseres i UI-et, kun vises og hukes av. Brukes for
 * både vegetarvarianten og den engelske oversettelsen, siden begge har
 * identisk form (VegetarianIngredientGroup[]/VegetarianStep[]). */
function withSyntheticIds(
  prefix: string,
  groups: VegetarianIngredientGroup[],
  steps: VegetarianStep[],
): { groups: IngredientGroup[]; steps: RecipeStep[] } {
  return {
    groups: groups.map((g, gi) => ({
      id: `${prefix}-group-${gi}`,
      title: g.title,
      sortOrder: gi,
      items: g.items.map((item, ii) => ({
        id: `${prefix}-item-${gi}-${ii}`,
        amount: item.amount,
        unit: item.unit,
        name: item.name,
        note: item.note,
        sortOrder: ii,
      })),
    })),
    steps: steps.map((s, si) => ({
      id: `${prefix}-step-${si}`,
      groupTitle: s.groupTitle,
      stepNumber: si + 1,
      text: s.text,
      sortOrder: si,
    })),
  };
}

export function RecipeInteractive({ recipe, isAdmin, lang }: { recipe: Recipe; isAdmin: boolean; lang: Lang }) {
  const [servings, setServings] = useState(recipe.servings);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  // Løftet opp fra CookingTimelinePanel slik at samme beregnede tidspunkt
  // også kan vises inline under hvert steg i fremgangsmåten under, ikke
  // bare inne i selve panelet – se CookingTimelinePanel.tsx sin
  // onTimelineChange-kommentar.
  const [cookingTimeline, setCookingTimeline] = useState<CookingTimeline | null>(null);
  const [parallelGroups, setParallelGroups] = useState<ParallelTaskGroup[] | null>(null);
  const stepToGroupInfo = groupInfoByStepId(parallelGroups);
  const { addFromRecipe } = useShoppingList();

  // "Fortsett matlaging" i stedet for "Start matlaging" når man har vært i
  // Cook Mode for DENNE oppskriften før og faktisk kommet i gang (ønsket av
  // Henrik 27.08.2026: gå ut og inn igjen viste fortsatt "Start", selv om
  // fremgangen lå lagret og ventet). Samme localStorage-nøkkel Cook Mode
  // selv leser/skriver til (useCookModeState) – kun lest her, aldri
  // skrevet. `hydrated` sjekkes eksplisitt: localStorage finnes ikke under
  // SSR, så uten denne sjekken ville knappen alltid vist "Start" ved første
  // server-rendring og deretter kunne hoppe til "Fortsett" et lite øyeblikk
  // etter innlasting – venter i stedet stille til den ekte lagrede
  // tilstanden er lest inn.
  const { state: cookModeState, hydrated: cookModeStateHydrated } = useCookModeState(recipe.id);
  const hasCookModeProgress =
    cookModeStateHydrated &&
    (cookModeState.currentStepIndex > 0 ||
      cookModeState.checkedSteps.length > 0 ||
      cookModeState.checkedIngredients.length > 0);

  // Smart ingrediens-erstatning – bevisst en LOKAL, additiv oversikt (nøkkel:
  // ingrediens-id) og IKKE en del av RecipeSession/lib/kitchen-intelligence
  // sin delte state ennå: forslaget vises kun oppå den originale ingrediensen
  // (gjennomstreking + pil + nytt navn + begrunnelse), det erstatter den
  // ALDRI i selve dataflyten – handlelisten og Cook Mode viser fortsatt den
  // faktiske ingrediensen. Dette er en bevisst avgrenset førsteversjon; å
  // koble erstatningen inn i handlelisten/skaleringen ville krevd at
  // AI-forslaget også fikk en mengde/enhet, noe getIngredientSubstitution
  // bevisst IKKE gir (se kommentaren i lib/actions/kitchen-intelligence.ts).
  const [substitutions, setSubstitutions] = useState<Record<string, SubstitutionSuggestion>>({});
  const [substitutionLoadingIds, setSubstitutionLoadingIds] = useState<Set<string>>(new Set());
  const [substitutionErrors, setSubstitutionErrors] = useState<Record<string, string>>({});
  // "Bytt ut"-knappen sto tidligere under HVER ENESTE ingrediens hele
  // tiden, uansett om man faktisk ønsket å bytte ut noe eller ikke – rotete
  // for de fleste besøkende (ønsket av Henrik 25.08.2026). Nå skjult bak én
  // egen av/på-knapp for hele listen; en allerede valgt erstatning
  // (substitutions-mappet over) vises uansett, selv om denne er av, siden
  // det ville vært rart å skjule et bytte man allerede har gjort.
  const [substituteMode, setSubstituteMode] = useState(false);

  // Vegetarversjonen er nå et admin-forhåndslagret editorial-felt (se
  // vegetarianVariant i lib/types.ts og RecipeForm.tsx sin "Vegetarversjon"-
  // seksjon) heller enn noe som genereres live av en hvilken som helst
  // besøkende – ingen AI-kall her lenger, kun en ren utledning fra
  // recipe.vegetarianVariant med samme withSyntheticIds-mønster som
  // engResult/usResult bruker.
  const vegResult = useMemo(() => {
    if (!recipe.vegetarianVariant) return null;
    const { groups, steps } = withSyntheticIds(
      "veg",
      recipe.vegetarianVariant.ingredientGroups,
      recipe.vegetarianVariant.steps,
    );
    return { note: recipe.vegetarianVariant.note, groups, steps };
  }, [recipe.vegetarianVariant]);
  const [showVegetarian, setShowVegetarian] = useState(false);

  const [engResult, setEngResult] = useState<{
    title: string;
    description: string;
    groups: IngredientGroup[];
    steps: RecipeStep[];
    notes: string | null;
    tips: string | null;
    warnings: string | null;
  } | null>(null);
  const [engLoading, setEngLoading] = useState(false);
  const [engError, setEngError] = useState<string | null>(null);

  // Metrisk/US er et rent lokalt, ikke-lagret valg for DENNE siden (i
  // motsetning til NO/EN, som huskes globalt via en cookie). Ingrediens-
  // mengder konverteres deterministisk (lib/utils/units.ts); mål nevnt i
  // fri tekst (ovnstemperatur, formstørrelser o.l.) konverteres av AI-en,
  // uavhengig av hvilket språk/vegetar-valg som er aktivt.
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [usResult, setUsResult] = useState<{
    steps: RecipeStep[];
    notes: string | null;
    tips: string | null;
    warnings: string | null;
  } | null>(null);
  const [usLoading, setUsLoading] = useState(false);
  const [usError, setUsError] = useState<string | null>(null);
  const lastUsSourceRef = useRef<{
    steps: RecipeStep[];
    notes: string | null;
    tips: string | null;
    warnings: string | null;
  } | null>(null);

  async function handleGetEnglish() {
    setEngError(null);
    setEngLoading(true);
    try {
      const result = await getEnglishVariant({
        title: recipe.title,
        description: recipe.description,
        ingredientGroups: recipe.ingredientGroups.map((g) => ({
          title: g.title,
          items: g.items.map((i) => ({ amount: i.amount, unit: i.unit, name: i.name, note: i.note })),
        })),
        steps: recipe.steps.map((s) => ({ groupTitle: s.groupTitle, text: s.text })),
        notes: recipe.notes,
        tips: recipe.tips,
        warnings: recipe.warnings ?? null,
      });
      const { groups, steps } = withSyntheticIds("eng", result.ingredientGroups, result.steps);
      setEngResult({
        title: result.title,
        description: result.description,
        groups,
        steps,
        notes: result.notes,
        tips: result.tips,
        warnings: result.warnings,
      });
    } catch (err) {
      setEngError(err instanceof Error ? err.message : t(lang, "recipeDetail.engError"));
    } finally {
      setEngLoading(false);
    }
  }

  // Når navigasjonsspråket er engelsk, oversettes den viste oppskriften
  // automatisk – ingen egen knapp per oppskrift lenger. Trigges kun når
  // lang endrer seg (f.eks. ved mount, eller når man bytter i menyen og
  // siden refreshes), ikke ved hvert re-render.
  useEffect(() => {
    if (lang === "en" && !engResult && !engLoading) {
      handleGetEnglish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, recipe.id]);

  const useEnglish = lang === "en" && Boolean(engResult);
  const useVegetarian = lang === "no" && Boolean(vegResult) && showVegetarian;

  const displayTitle = useEnglish && engResult ? engResult.title : recipe.title;
  const displayDescription = useEnglish && engResult ? engResult.description : recipe.description;
  const displayNotes = useEnglish && engResult ? engResult.notes : recipe.notes;
  const displayTips = useEnglish && engResult ? engResult.tips : recipe.tips;
  const displayWarnings = useEnglish && engResult ? engResult.warnings : recipe.warnings ?? null;

  const baseGroups = useEnglish && engResult ? engResult.groups : useVegetarian && vegResult ? vegResult.groups : recipe.ingredientGroups;
  const baseSteps = useEnglish && engResult ? engResult.steps : useVegetarian && vegResult ? vegResult.steps : recipe.steps;

  // Delt mellom "Bytt ut"-forslagene under og WineSection – begge trenger
  // "hele retten sett under ett" som kontekst for AI-en.
  const recipeIngredientNames = useMemo(
    () => baseGroups.flatMap((g) => g.items.map((i) => i.name)),
    [baseGroups],
  );

  const scaledGroups = useMemo(
    () =>
      baseGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          amount: scaleAmount(item.amount, recipe.servings, servings),
        })),
      })),
    [baseGroups, recipe.servings, servings],
  );

  // Ingrediensmengder konverteres deterministisk og umiddelbart (ingen
  // AI-kall nødvendig) – helt uavhengig av teksten under.
  const displayGroups = useMemo(() => {
    if (unitSystem === "metric") return scaledGroups;
    return scaledGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const converted = convertAmountToUs(item.amount, item.unit);
        return { ...item, amount: converted.amount, unit: converted.unit };
      }),
    }));
  }, [scaledGroups, unitSystem]);

  async function handleGetUsMeasurements() {
    setUsError(null);
    setUsLoading(true);
    try {
      const result = await getUsMeasurementsVariant({
        steps: baseSteps.map((s) => ({ groupTitle: s.groupTitle, text: s.text })),
        notes: displayNotes,
        tips: displayTips,
        warnings: displayWarnings,
      });
      const { steps } = withSyntheticIds("us", [], result.steps);
      setUsResult({ steps, notes: result.notes, tips: result.tips, warnings: result.warnings });
    } catch (err) {
      setUsError(err instanceof Error ? err.message : t(lang, "recipeDetail.unitsError"));
    } finally {
      setUsLoading(false);
    }
  }

  // Trigges når man bytter til US, og på nytt dersom kildeteksten endrer
  // seg mens US er valgt (f.eks. ved bytte av språk eller vegetarvisning).
  // Sammenligner referanser (stabile med mindre engResult/vegResult/lang
  // faktisk endrer seg), så vi ikke kaller AI-en på nytt uten grunn.
  useEffect(() => {
    if (unitSystem !== "us") return;
    const sourceChanged =
      lastUsSourceRef.current?.steps !== baseSteps ||
      lastUsSourceRef.current?.notes !== displayNotes ||
      lastUsSourceRef.current?.tips !== displayTips ||
      lastUsSourceRef.current?.warnings !== displayWarnings;
    if (!sourceChanged && usResult) return;
    lastUsSourceRef.current = { steps: baseSteps, notes: displayNotes, tips: displayTips, warnings: displayWarnings };
    handleGetUsMeasurements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSystem, baseSteps, displayNotes, displayTips, displayWarnings]);

  const finalSteps = unitSystem === "us" && usResult ? usResult.steps : baseSteps;
  const finalNotes = unitSystem === "us" && usResult ? usResult.notes : displayNotes;
  const finalTips = unitSystem === "us" && usResult ? usResult.tips : displayTips;
  const finalWarnings = unitSystem === "us" && usResult ? usResult.warnings : displayWarnings;

  function toggleChecked(id: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddToShoppingList() {
    addFromRecipe(baseGroups, displayTitle, servings / recipe.servings);
    setJustAdded(true);
    // Var 2200ms – for kort til at "Gå til handleliste"-lenken rakk å bli
    // lagt merke til/trykket på før den forsvant igjen.
    setTimeout(() => setJustAdded(false), 6000);
  }

  async function handleSubstitute(item: { id: string; name: string; amount: string | null; unit: string | null; note: string | null }) {
    setSubstitutionErrors((prev) => {
      if (!(item.id in prev)) return prev;
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setSubstitutionLoadingIds((prev) => new Set(prev).add(item.id));
    try {
      const suggestion = await getIngredientSubstitution(
        recipe.id,
        { title: displayTitle, ingredientNames: recipeIngredientNames },
        { name: item.name, amount: item.amount, unit: item.unit, note: item.note },
        useVegetarian ? "vegetarian" : "original",
        lang,
      );
      setSubstitutions((prev) => ({ ...prev, [item.id]: suggestion }));
    } catch (err) {
      setSubstitutionErrors((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : t(lang, "recipeDetail.substituteError"),
      }));
    } finally {
      setSubstitutionLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleUndoSubstitute(itemId: string) {
    setSubstitutions((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  return (
    <>
      <RecipeHero
        imageUrl={recipe.heroImageUrl}
        imageAlt={recipe.heroImageAlt || displayTitle}
        imagePendingLabel={t(lang, "recipeDetail.imagePending")}
        categoryLabel={recipe.category ? localizedCategoryName(recipe.category, lang) : null}
        tags={recipe.tags}
        isDraft={!recipe.isPublished}
        draftLabel={t(lang, "recipeDetail.draft")}
        title={displayTitle}
        description={displayDescription}
        translating={lang === "en" && engLoading}
        translatingLabel={t(lang, "recipeDetail.engTranslating")}
        translateError={lang === "en" ? engError : null}
        onRetryTranslate={handleGetEnglish}
        retryTranslateLabel={t(lang, "recipeDetail.reTranslate")}
        isAdmin={isAdmin}
        editHref={`/admin/oppskrifter/${recipe.id}`}
        editLabel={t(lang, "recipeDetail.editButton")}
        favorite={
          <FavoriteButton
            recipeId={recipe.id}
            initialFavorited={recipe.favoritedByAdmin}
            isAdmin={isAdmin}
            // Kompakt (kun ikon) fra venstrekolonne-raffinementet 31.08.2026 –
            // Favoritt sitter nå diskret sammen med ratingen i stedet for på
            // linje med tittelen, se RecipeHero.tsx.
            size="sm"
            lang={lang}
          />
        }
        rating={
          <RatingStars
            recipeId={recipe.id}
            recipeSlug={recipe.slug}
            initialRatingSum={recipe.ratingSum}
            initialRatingCount={recipe.ratingCount}
            lang={lang}
          />
        }
        meta={
          <RecipeMeta
            prepTimeMinutes={recipe.prepTimeMinutes}
            cookTimeMinutes={recipe.cookTimeMinutes}
            cookTimeMinutesMax={recipe.cookTimeMinutesMax}
            totalTimeMinutes={recipe.totalTimeMinutes}
            servings={recipe.servings}
            difficulty={recipe.difficulty}
            lang={lang}
          />
        }
      />

      {/* lg:gap-16 (var lg:gap-12) – litt mer luft i midten mellom
          Ingredienser og Fremgangsmåte, ønsket 31.08.2026. */}
      <div className="grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_2fr] lg:gap-16 lg:pt-14">
        {/* Ingredienspanelet – tidligere en tung, skyggelagt boks
            (shadow-card, heldekkende bg-paper). Lettet 31.08.2026
            (spesifikasjonens punkt 5): svakere bakgrunn, tynnere kant,
            ingen skygge. All funksjonalitet under (porsjoner, metrisk/US,
            vegetarvalg, "bytt ut", avkryssing, tidsplan, Start
            matlaging, Legg til i handleliste) er UENDRET – kun selve
            boksens visuelle vekt er redusert, fortsatt sticky/robust på
            desktop. */}
        <section aria-labelledby="ingredienser-heading" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line/70 bg-paper/70 p-5 sm:p-6">
            <h2 id="ingredienser-heading" className="font-serif text-2xl text-ink">
              {t(lang, "recipeDetail.ingredientsHeading")}
            </h2>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <ServingsScaler servings={servings} onChange={setServings} lang={lang} />
              <div>
                <div className="mb-2 text-sm font-medium text-ink-soft">
                  {t(lang, "recipeDetail.unitsAria")}
                </div>
                <UnitSystemSwitcher value={unitSystem} onChange={setUnitSystem} lang={lang} />
              </div>
            </div>
            {unitSystem === "us" && usLoading && (
              <p className="mt-1.5 text-xs text-ink-faint">{t(lang, "recipeDetail.convertingUnits")}</p>
            )}
            {unitSystem === "us" && usError && (
              <p className="mt-1.5 text-xs text-clay-dark">
                {usError}{" "}
                <button
                  type="button"
                  onClick={handleGetUsMeasurements}
                  className="font-medium underline underline-offset-2"
                >
                  {t(lang, "recipeDetail.unitsRetry")}
                </button>
              </p>
            )}

            {lang === "no" && vegResult && (
              <div className="mt-4 space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-olive-light bg-olive-light/40 px-3 py-2.5 text-sm font-medium text-olive-dark transition-colors hover:bg-olive-light">
                  <input
                    type="checkbox"
                    checked={showVegetarian}
                    onChange={(e) => setShowVegetarian(e.target.checked)}
                    className="h-4 w-4 accent-olive"
                  />
                  {t(lang, "recipeDetail.vegPrompt")}
                </label>
                {showVegetarian && vegResult.note && (
                  <p className="text-xs leading-relaxed text-ink-faint">{vegResult.note}</p>
                )}
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setSubstituteMode((v) => !v)}
                className="text-xs font-medium text-clay hover:text-clay-dark"
              >
                {substituteMode
                  ? t(lang, "recipeDetail.substituteModeOff")
                  : t(lang, "recipeDetail.substituteModeOn")}
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {displayGroups.map((group) => (
                <div key={group.id}>
                  {group.title && (
                    <h3 className="mb-2 font-serif text-base text-ink-soft">{group.title}</h3>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const checked = checkedItems.has(item.id);
                      const substitution = substitutions[item.id];
                      const substitutionLoading = substitutionLoadingIds.has(item.id);
                      const substitutionError = substitutionErrors[item.id];
                      return (
                        <li key={item.id}>
                          <label
                            className={clsx(
                              "flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-cream-dark",
                              checked && "text-ink-faint line-through",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChecked(item.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-clay"
                            />
                            <span>
                              {[item.amount, item.unit].filter(Boolean).join(" ")}{" "}
                              {substitution ? (
                                <>
                                  <span className="text-ink-faint line-through">{item.name}</span>{" "}
                                  <span className="font-medium text-clay-dark">→ {substitution.substituteName}</span>
                                </>
                              ) : (
                                <span className={checked ? "" : "text-ink"}>{item.name}</span>
                              )}
                              {item.note && !substitution && <span className="text-ink-faint"> ({item.note})</span>}
                            </span>
                          </label>

                          {/* Utenfor <label> med vilje – en knapp her skal IKKE
                              også veksle avkrysningsboksen, se native
                              label->control-videresending. */}
                          <div className="ml-[1.75rem] mt-0.5">
                            {substitution && (
                              <div className="rounded-lg bg-clay-light/40 px-2.5 py-1.5 text-xs leading-relaxed text-ink-soft">
                                <p>{substitution.reason}</p>
                                <button
                                  type="button"
                                  onClick={() => handleUndoSubstitute(item.id)}
                                  className="mt-0.5 font-medium text-clay hover:text-clay-dark"
                                >
                                  {t(lang, "recipeDetail.substituteUndo")}
                                </button>
                              </div>
                            )}
                            {!substitution && substituteMode && substitutionLoading && (
                              <p className="text-xs text-ink-faint">{t(lang, "recipeDetail.substituteLoading")}</p>
                            )}
                            {!substitution && substituteMode && !substitutionLoading && substitutionError && (
                              <p className="text-xs text-clay-dark">
                                {substitutionError}{" "}
                                <button
                                  type="button"
                                  onClick={() => handleSubstitute(item)}
                                  className="font-medium underline underline-offset-2"
                                >
                                  {t(lang, "recipeDetail.substituteRetry")}
                                </button>
                              </p>
                            )}
                            {!substitution && substituteMode && !substitutionLoading && !substitutionError && (
                              <button
                                type="button"
                                onClick={() => handleSubstitute(item)}
                                className="text-xs font-medium text-clay hover:text-clay-dark"
                              >
                                {t(lang, "recipeDetail.substitutePrompt")}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <CookingTimelinePanel
                recipeId={recipe.id}
                steps={finalSteps}
                prepTimeMinutes={recipe.prepTimeMinutes}
                lang={lang}
                onTimelineChange={setCookingTimeline}
                onParallelGroupsChange={setParallelGroups}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Button variant="primary" size="lg" onClick={() => setCookModeOpen(true)}>
                <PlayIcon className="h-4 w-4" />
                {t(lang, hasCookModeProgress ? "recipeDetail.continueCooking" : "recipeDetail.startCooking")}
              </Button>
              <Button variant="outline" size="md" onClick={handleAddToShoppingList}>
                {justAdded ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    {t(lang, "recipeDetail.addedToList")}
                  </>
                ) : (
                  <>
                    <ShoppingBagIcon className="h-4 w-4" />
                    {t(lang, "recipeDetail.addToList")}
                  </>
                )}
              </Button>
              {/* Vises samtidig som "Lagt til!"-tilstanden over (samme
               * justAdded-state, samme 6000ms-vindu, se
               * handleAddToShoppingList) – gir brukeren et direkte neste
               * steg i stedet for at bekreftelsen bare blafrer forbi uten
               * noen handling å ta. */}
              {justAdded && (
                <Link
                  href="/handleliste"
                  className="text-center text-sm font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
                >
                  {t(lang, "recipeDetail.goToShoppingList")}
                </Link>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="fremgangsmate-heading">
          <h2 id="fremgangsmate-heading" className="font-serif text-2xl text-ink">
            {t(lang, "recipeDetail.stepsHeading")}
          </h2>
          {/* max-w-prose (~65ch) – 31.08.2026: siden/kolonnene ble gjort
              bredere (se app/oppskrifter/[slug]/page.tsx), men selve
              stegteksten skal ikke bli ubehagelig lang å lese linje for
              linje – whitespace til høyre for korte steg er helt fint,
              ULIK ingredienspanelet som gjerne får bruke hele den nye,
              bredere bredden (kortere, mer scanbar tekst der). */}
          <ol className="mt-4 max-w-prose space-y-6">
            {finalSteps.map((step, index) => {
              // Fra "Når bør jeg starte?"-panelet over (CookingTimelinePanel)
              // – kun satt når brukeren faktisk har regnet ut en tidsplan;
              // se onTimelineChange-nullstillingen der for hvorfor et gammelt
              // klokkeslett aldri vises for et steg det ikke faktisk gjelder.
              const stepStartTime = cookingTimeline?.steps.find((s) => s.stepId === step.id)?.startClockTime;
              // Fra "Se hva som kan gjøres samtidig" i samme panel – samme
              // bokstav-merking som brukes der, se
              // lib/kitchen-intelligence/parallel-tasks.ts.
              const parallelInfo = stepToGroupInfo.get(step.id);
              return (
                <li key={step.id} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-light font-serif text-base text-clay-dark">
                    {index + 1}
                  </span>
                  <div className="pt-1">
                    {(step.groupTitle || stepStartTime || parallelInfo) && (
                      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {step.groupTitle && (
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                            {step.groupTitle}
                          </p>
                        )}
                        {stepStartTime && (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-clay-dark">
                            {t(lang, "recipeDetail.stepStartTime", { time: stepStartTime })}
                            {parallelInfo && <ParallelTaskBadge info={parallelInfo} lang={lang} />}
                          </p>
                        )}
                        {!stepStartTime && parallelInfo && <ParallelTaskBadge info={parallelInfo} lang={lang} />}
                      </div>
                    )}
                    <p className="text-[0.975rem] leading-relaxed text-ink">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Notater/tips/pass på – tidligere tre fargede "varselkort"
              (heldekkende bakgrunn, kant rundt hele). Gjort om til rolige
              marginalnotater 31.08.2026 (spesifikasjonens punkt 6): en tynn
              farget kantlinje til venstre + kursiv brødtekst, mer i stil
              med en håndskrevet kommentar i margen på en kokebok enn et
              "advarsel"-UI-element. Samme tre felt, samme data, kun lettere
              visuelt uttrykk. */}
          {(finalNotes || finalTips || finalWarnings) && (
            <div className="mt-10 max-w-prose space-y-6 border-t border-line pt-8">
              {finalNotes && (
                <div className="border-l-2 border-line-strong pl-4">
                  <h3 className="font-serif text-base text-ink-soft">{t(lang, "recipeDetail.notes")}</h3>
                  <p className="mt-1 text-sm italic leading-relaxed text-ink-soft">{finalNotes}</p>
                </div>
              )}
              {finalTips && (
                <div className="border-l-2 border-olive pl-4">
                  <h3 className="font-serif text-base text-olive-dark">{t(lang, "recipeDetail.tips")}</h3>
                  <p className="mt-1 text-sm italic leading-relaxed text-ink-soft">{finalTips}</p>
                </div>
              )}
              {finalWarnings && (
                <div className="border-l-2 border-clay pl-4">
                  <h3 className="font-serif text-base text-clay-dark">{t(lang, "recipeDetail.warnings")}</h3>
                  <p className="mt-1 text-sm italic leading-relaxed text-ink-soft">{finalWarnings}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ============ Sekundær info – flyttet under selve oppskriften
          (spesifikasjonens punkt 4: retten/bildet/funksjonaliteten skal
          alltid komme først, "oppdages" før man ruller videre til dette).
          Rekkefølge finjustert 31.08.2026: Lurer du på noe (rett under
          selve oppskriften – mest direkte knyttet til det man nettopp
          leste) → Smaksprofil + Næringsinnhold (kombinert i ÉN rad side
          om side – de tok for mye plass hver sin fulle rad) → Drikke
          til/Passer denne → "Gjør det til en kveld" (MealBuilder) helt
          nederst, som en større, mer fortjent avslutning. Delt av tynne
          skillelinjer (divide-y) i stedet for at hver seksjon er sin egen
          heldekkende, avrundede boks – reduserer "stabel av ensartede
          bokser"-følelsen (punkt 9) og gir én sammenhengende, redaksjonell
          flate i stedet. Hver av under-komponentene
          (TasteProfileDisplay/NutritionPanel/MealBuilder/
          DrinkPairingSection/RecipeQuestionSection) er derfor også lettet
          for sin egen kort-boks-styling, se de filene. */}
      <div className="mt-16 divide-y divide-line border-t border-line sm:mt-20">
        <div className="py-10 sm:py-12">
          <RecipeQuestionSection
            recipeId={recipe.id}
            recipeContext={{
              title: displayTitle,
              description: displayDescription,
              ingredientGroups: displayGroups,
              steps: finalSteps,
              tips: finalTips,
            }}
            lang={lang}
          />
        </div>

        {/* Smaksprofil + Næringsinnhold – kombinert i én rad (side om side
            fra sm og opp, stablet på mobil) i stedet for hver sin fulle
            rad, per ønske 31.08.2026 ("trenger ikke hver sin rad, tar for
            mye plass"). Begge forhåndsgenerert i admin (ikke live
            AI-kall), og vises uavhengig av hverandre – mangler den ene,
            tar den andre bare hele radens bredde. */}
        {(recipe.tasteProfile || recipe.nutritionInfo) && (
          <div className="grid gap-10 py-10 sm:grid-cols-2 sm:py-12">
            {recipe.tasteProfile && <TasteProfileDisplay tasteProfile={recipe.tasteProfile} lang={lang} />}
            {recipe.nutritionInfo && <NutritionPanel nutrition={recipe.nutritionInfo} lang={lang} />}
          </div>
        )}

        <div className="py-10 sm:py-12">
          <DrinkPairingSection
            recipeId={recipe.id}
            recipeContext={{
              title: displayTitle,
              description: displayDescription,
              ingredientNames: recipeIngredientNames,
            }}
            tasteProfile={recipe.tasteProfile ?? null}
            lang={lang}
          />
        </div>

        {/* Nederst, med vilje – "Gjør det til en kveld" er avslutningen på
            siden, ikke bare enda et element i rekken. Selve
            størrelsen/overskriften er gjort tydelig større i
            MealBuilder.tsx; mer vertikal luft rundt her (py-14/16, mer enn
            de andre seksjonenes py-10/12) understreker at dette er
            finalen. */}
        <div className="py-14 sm:py-16">
          <MealBuilder
            recipe={{
              id: recipe.id,
              slug: recipe.slug,
              title: displayTitle,
              description: displayDescription,
              servings,
              category: recipe.category ? { name: recipe.category.name } : null,
            }}
            lang={lang}
          />
        </div>
      </div>

      {cookModeOpen && (
        <CookMode
          recipeId={recipe.id}
          title={displayTitle}
          ingredientGroups={displayGroups}
          steps={finalSteps}
          cookingTimeline={cookingTimeline}
          onClose={() => setCookModeOpen(false)}
          lang={lang}
        />
      )}
    </>
  );
}
