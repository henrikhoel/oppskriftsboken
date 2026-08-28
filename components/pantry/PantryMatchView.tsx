"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { detectIngredientsFromImage, findRecipesForPantry } from "@/lib/actions/kitchen-intelligence";
import { suggestNewDishIdeas, findExternalRecipeMatches } from "@/lib/actions/recipes";
import type { PantryMatchResult } from "@/lib/kitchen-intelligence/pantry-match";
import { splitIngredientList } from "@/lib/kitchen-intelligence/pantry-match";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { IngredientGroup, IngredientItem, NewDishSuggestion, ExternalRecipeMatch } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { ExternalRecipeMatchCard } from "@/components/admin/ExternalRecipeMatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CameraIcon, XIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/** Nøkkel + skjema for å huske søket ("Hva kan jeg lage?") på tvers av
 * navigering bort og tilbake (27.08.2026 – ønsket av Henrik: kom tilbake fra
 * "Opprett som egen oppskrift"/"Opprett som oppskrift" til en TOM side var
 * forvirrende – man skal komme rett tilbake til ingrediensene og treffene
 * man allerede hadde). Lagres via den delte, SSR-trygge useLocalStorage
 * (samme hydration-mønster som useShoppingList/useMealSession) – bevisst
 * localStorage (ikke sessionStorage), samme "husk til brukeren selv rydder"
 * -prinsipp som resten av appens klient-state. `results`/`suggestions`/
 * `externalMatches` er allerede lette, JSON-vennlige data (SearchableRecipe
 * o.l. – ingen fulle oppskriftsobjekter med bilder/steg), så størrelsen er
 * ikke et problem her. Set<> (addedMissing…-tilstandene) kan ikke
 * JSON-serialiseres direkte, så de lagres som vanlige arrays og
 * konverteres til/fra Set ved hydrering/skriving.
 */
interface PersistedPantryState {
  ingredients: string[];
  results: PantryMatchResult[] | null;
  desiredType: string;
  showAdminSuggest: boolean;
  suggestions: NewDishSuggestion[] | null;
  addedMissingForIndices: number[];
  externalMatches: ExternalRecipeMatch[] | null;
  addedExternalMissingForIndices: number[];
  addedMissingForIds: string[];
}

const PANTRY_STATE_STORAGE_KEY = "oppskriftsboken:pantrymatch-state";

const EMPTY_PERSISTED_PANTRY_STATE: PersistedPantryState = {
  ingredients: [],
  results: null,
  desiredType: "",
  showAdminSuggest: false,
  suggestions: null,
  addedMissingForIndices: [],
  externalMatches: null,
  addedExternalMissingForIndices: [],
  addedMissingForIds: [],
};

/**
 * Selve "Hva kan jeg lage?"-UI-et – se app/hva-kan-jeg-lage/page.tsx for
 * begrunnelsen om hvorfor Smart Pantry Search og "Bruk restene" er slått
 * sammen hit. Brukeren bygger én liste med ingredienser (skriv inn og/eller
 * ta bilde av det som er i kjøleskapet), og trykker "Finn oppskrifter" for
 * å få en deterministisk rangert treffliste – se
 * lib/kitchen-intelligence/pantry-match.ts.
 *
 * isAdmin (27.08.2026): når satt, viser en ekstra, admin-only seksjon
 * ("Foreslå nye retter") som gjenbruker DENNE SAMME ingredienslisten til å
 * be AI-en dikte opp helt nye retteideer i stedet for å finne eksisterende
 * treff – se suggestNewDishIdeas i lib/actions/recipes.ts. Bevisst bygget inn
 * her (ikke en egen side) – akkurat samme "ikke ti frittstående AI-
 * funksjoner"-begrunnelse som filheaderen i app/hva-kan-jeg-lage/page.tsx.
 */
export function PantryMatchView({ lang, isAdmin = false }: { lang: Lang; isAdmin?: boolean }) {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [results, setResults] = useState<PantryMatchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addFromRecipe } = useShoppingList();
  // Nøklet på recipe.id – flere resultatkort kan i prinsippet trykkes på
  // etter hverandre, hver med sin egen "legger til …"/"lagt til"/feil-status,
  // uavhengig av de andre kortene.
  const [addingMissingForId, setAddingMissingForId] = useState<string | null>(null);
  const [addedMissingForIds, setAddedMissingForIds] = useState<Set<string>>(new Set());
  const [addMissingErrors, setAddMissingErrors] = useState<Record<string, string>>({});

  // Admin-only "Foreslå nye retter" – se filheaderen over.
  const [showAdminSuggest, setShowAdminSuggest] = useState(false);
  const [desiredType, setDesiredType] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NewDishSuggestion[] | null>(null);
  // Nøklet på indeks i suggestions-arrayet (forslagene har ingen egen id –
  // samme prinsipp som addingMissingForId/addedMissingForIds over, bare for
  // de nye retteideene i stedet for eksisterende oppskrifter).
  const [addedMissingForIndices, setAddedMissingForIndices] = useState<Set<number>>(new Set());
  // Samme mønster, egen Set – for eksterne treff (externalMatches), som har
  // sin egen indeksering uavhengig av suggestions over.
  const [addedExternalMissingForIndices, setAddedExternalMissingForIndices] = useState<Set<number>>(new Set());

  // Admin-only "Finn oppskrifter andre steder" – deler ingredienser/
  // desiredType med "Foreslå nye retter" over, egen resultat-/lastestatus.
  const [isFindingExternal, setIsFindingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [externalMatches, setExternalMatches] = useState<ExternalRecipeMatch[] | null>(null);

  // Husk søket på tvers av navigering bort og tilbake – se filheaderen til
  // PersistedPantryState over. To effekter under: én som HENTER inn lagret
  // tilstand (kun én gang, når useLocalStorage sin egen hydrering er
  // ferdig), én som SKRIVER nåværende tilstand tilbake hver gang noe av den
  // endres. `hydrationApplied` (vanlig state, IKKE en ref) er avgjørende
  // for rekkefølgen: den settes til true i SAMME batch som
  // setIngredients/setResults/… under, slik at skrive-effekten (som kjører
  // rett etter, siden dens avhengigheter da også har endret seg) ser de
  // FERSKE hydrerte verdiene – ikke de tomme start-verdiene – første gang
  // den kjører. Uten dette ville skrive-effekten straks overskrevet det vi
  // nettopp leste inn med tomme verdier.
  const [persistedPantryState, setPersistedPantryState, persistedPantryStateHydrated] =
    useLocalStorage<PersistedPantryState>(PANTRY_STATE_STORAGE_KEY, EMPTY_PERSISTED_PANTRY_STATE);
  const [pantryStateHydrationApplied, setPantryStateHydrationApplied] = useState(false);

  // VIKTIG: venter på persistedPantryStateHydrated (useLocalStorage sin EGEN
  // hydrerings-status), ikke bare kjører ved første mulige effekt-runde.
  // useLocalStorage leser localStorage i SIN EGEN useEffect (registrert FØR
  // denne, siden useLocalStorage-kallet over kommer først i komponenten) –
  // uten denne guarden ville denne effekten rukket å kjøre (og satt
  // pantryStateHydrationApplied til true basert på TOMME start-verdier) i
  // samme runde SOM useLocalStorage sin lesing, men FØR den lesingens
  // resultat faktisk er synlig her (React-tilstand fra en effekt er ikke
  // synlig for andre effekter i samme flush, kun i neste rendering).
  useEffect(() => {
    if (!persistedPantryStateHydrated || pantryStateHydrationApplied) return;
    setIngredients(persistedPantryState.ingredients);
    setResults(persistedPantryState.results);
    setDesiredType(persistedPantryState.desiredType);
    setShowAdminSuggest(persistedPantryState.showAdminSuggest);
    setSuggestions(persistedPantryState.suggestions);
    setAddedMissingForIndices(new Set(persistedPantryState.addedMissingForIndices));
    setExternalMatches(persistedPantryState.externalMatches);
    setAddedExternalMissingForIndices(new Set(persistedPantryState.addedExternalMissingForIndices));
    setAddedMissingForIds(new Set(persistedPantryState.addedMissingForIds));
    setPantryStateHydrationApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedPantryStateHydrated, persistedPantryState, pantryStateHydrationApplied]);

  useEffect(() => {
    if (!pantryStateHydrationApplied) return;
    setPersistedPantryState({
      ingredients,
      results,
      desiredType,
      showAdminSuggest,
      suggestions,
      addedMissingForIndices: Array.from(addedMissingForIndices),
      externalMatches,
      addedExternalMissingForIndices: Array.from(addedExternalMissingForIndices),
      addedMissingForIds: Array.from(addedMissingForIds),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantryStateHydrationApplied,
    ingredients,
    results,
    desiredType,
    showAdminSuggest,
    suggestions,
    addedMissingForIndices,
    externalMatches,
    addedExternalMissingForIndices,
    addedMissingForIds,
  ]);

  function addIngredients(raw: string) {
    const parsed = splitIngredientList(raw);
    if (parsed.length === 0) return;
    setIngredients((prev) => {
      const existingLower = new Set(prev.map((i) => i.toLowerCase()));
      const fresh = parsed.filter((i) => !existingLower.has(i.toLowerCase()));
      return [...prev, ...fresh];
    });
  }

  function handleAddFromInput() {
    if (!inputValue.trim()) return;
    addIngredients(inputValue);
    setInputValue("");
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddFromInput();
    }
  }

  function removeIngredient(name: string) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  function handlePhotoButtonClick() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setIsAnalyzingPhoto(true);
    try {
      const { base64Data, mediaType } = await resizeImageFileToJpegBase64(file);
      const detected = await detectIngredientsFromImage({ mediaType, base64Data }, lang);
      if (detected.length === 0) {
        setPhotoError(t(lang, "pantryPage.photoDetectedNone"));
      } else {
        addIngredients(detected.join(","));
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : t(lang, "pantryPage.photoError"));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }

  async function handleSearch() {
    if (ingredients.length === 0) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await findRecipesForPantry(ingredients);
      setResults(found);
    } catch (err) {
      setResults(null);
      setSearchError(err instanceof Error ? err.message : t(lang, "pantryPage.searchError"));
    } finally {
      setSearching(false);
    }
  }

  /**
   * "Legg til det som mangler" – result.missingIngredientNames (se
   * PantryMatchResult i lib/kitchen-intelligence/pantry-match.ts) er kun en
   * flat liste med NAVN (hentet fra SearchableRecipe, ment for søk – ingen
   * mengde/enhet), så det holder ikke å legge dem rett i handlelista uten
   * mengder. Henter derfor oppskriftens EKTE ingrediensgrupper (samme delte
   * datahenting som den kombinerte meny-handlelisten bruker, se
   * lib/actions/meal-shopping-list.ts) her, og plukker ut kun de radene som
   * faktisk står i missingIngredientNames – de er identiske strenger
   * (samme kildefelt, se toSearchable i lib/data/mappers.ts), så et vanlig
   * eksakt navnematch er nok, ingen fuzzy-logikk nødvendig.
   */
  async function handleAddMissing(result: PantryMatchResult) {
    setAddMissingErrors((prev) => {
      const next = { ...prev };
      delete next[result.recipe.id];
      return next;
    });
    setAddingMissingForId(result.recipe.id);
    try {
      const [recipeData] = await getMealShoppingIngredients([result.recipe.id]);
      if (!recipeData) throw new Error(t(lang, "pantryPage.missingAddError"));

      const missingSet = new Set(result.missingIngredientNames);
      const missingItems = recipeData.ingredientGroups
        .flatMap((group) => group.items)
        .filter((item) => missingSet.has(item.name));

      if (missingItems.length > 0) {
        const syntheticGroup: IngredientGroup = { id: "missing", title: null, sortOrder: 0, items: missingItems };
        addFromRecipe([syntheticGroup], result.recipe.title, 1);
      }
      setAddedMissingForIds((prev) => new Set(prev).add(result.recipe.id));
    } catch (err) {
      setAddMissingErrors((prev) => ({
        ...prev,
        [result.recipe.id]: err instanceof Error ? err.message : t(lang, "pantryPage.missingAddError"),
      }));
    } finally {
      setAddingMissingForId(null);
    }
  }

  /** Admin-only – se filheaderen over. Gjenbruker `ingredients`-listen
   * bygget for det vanlige søket over; legger kun til et valgfritt ønske om
   * type mat. */
  async function handleSuggestNewDishes() {
    if (ingredients.length === 0) return;
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const result = await suggestNewDishIdeas({ ingredients, desiredType: desiredType.trim() || null });
      if (!result.success || !result.suggestions) {
        setSuggestError(result.error ?? t(lang, "pantryPage.adminSuggestError"));
        setSuggestions(null);
        return;
      }
      setSuggestions(result.suggestions);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : t(lang, "pantryPage.adminSuggestError"));
      setSuggestions(null);
    } finally {
      setIsSuggesting(false);
    }
  }

  /** Legger et forslags manglende ingredienser (suggestion.missingIngredients
   * – kun navn, se filheaderen til NewDishSuggestion i lib/types.ts) i
   * handlelista. I MOTSETNING til handleAddMissing over trengs ingen
   * datahenting her – retten finnes ikke som en faktisk oppskrift med
   * lagrede mengder, så ingrediensene legges til uten mengde/enhet, akkurat
   * som admin ellers ville skrevet dem inn for hånd i handlelista. */
  function handleAddSuggestionMissing(suggestion: NewDishSuggestion, index: number) {
    if (suggestion.missingIngredients.length === 0) return;
    const items: IngredientItem[] = suggestion.missingIngredients.map((name, i) => ({
      id: generateId(),
      amount: null,
      unit: null,
      name,
      note: null,
      sortOrder: i,
    }));
    const syntheticGroup: IngredientGroup = { id: "new-dish-missing", title: null, sortOrder: 0, items };
    addFromRecipe([syntheticGroup], suggestion.title, 1);
    setAddedMissingForIndices((prev) => new Set(prev).add(index));
  }

  /** Samme prinsipp som handleAddSuggestionMissing over, for et EKSTERNT
   * treff (match.missingIngredients – se filheaderen til ExternalRecipeMatch
   * i lib/types.ts). */
  function handleAddExternalMissing(match: ExternalRecipeMatch, index: number) {
    if (match.missingIngredients.length === 0) return;
    const items: IngredientItem[] = match.missingIngredients.map((name, i) => ({
      id: generateId(),
      amount: null,
      unit: null,
      name,
      note: null,
      sortOrder: i,
    }));
    const syntheticGroup: IngredientGroup = { id: "external-match-missing", title: null, sortOrder: 0, items };
    addFromRecipe([syntheticGroup], match.title, 1);
    setAddedExternalMissingForIndices((prev) => new Set(prev).add(index));
  }

  /** Admin-only – se filheaderen til ExternalRecipeMatch i lib/types.ts.
   * Gjenbruker samme ingredients/desiredType som handleSuggestNewDishes. */
  async function handleFindExternalMatches() {
    if (ingredients.length === 0) return;
    setIsFindingExternal(true);
    setExternalError(null);
    try {
      const result = await findExternalRecipeMatches({ ingredients, desiredType: desiredType.trim() || null });
      if (!result.success || !result.matches) {
        setExternalError(result.error ?? t(lang, "pantryPage.adminExternalError"));
        setExternalMatches(null);
        return;
      }
      setExternalMatches(result.matches);
    } catch (err) {
      setExternalError(err instanceof Error ? err.message : t(lang, "pantryPage.adminExternalError"));
      setExternalMatches(null);
    } finally {
      setIsFindingExternal(false);
    }
  }

  /** "Tilbakestill alt" (27.08.2026 – ønsket av Henrik, naturlig følge av at
   * søket nå huskes på tvers av besøk, se PersistedPantryState-kommentaren
   * over: uten en tydelig nullstill-knapp ville et gammelt søk kunnet bli
   * sittende igjen "for alltid"). Nullstiller ALT denne siden selv holder
   * styr på – ingredienser, søkeresultater, admin-forslagene og alle
   * "lagt til i handleliste"-merkene – tilbake til nøyaktig samme
   * tomme tilstand som et helt nytt besøk. Skriver IKKE direkte til
   * localStorage her – skrive-effekten (se pantryStateHydrationApplied
   * over) fanger opp disse endringene og lagrer den tomme tilstanden
   * automatisk, akkurat som enhver annen endring. */
  function handleResetAll() {
    setIngredients([]);
    setInputValue("");
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPhotoError(null);
    setResults(null);
    setSearchError(null);
    setAddingMissingForId(null);
    setAddedMissingForIds(new Set());
    setAddMissingErrors({});
    setShowAdminSuggest(false);
    setDesiredType("");
    setSuggestError(null);
    setSuggestions(null);
    setAddedMissingForIndices(new Set());
    setIsFindingExternal(false);
    setExternalError(null);
    setExternalMatches(null);
    setAddedExternalMissingForIndices(new Set());
  }

  const hasAnythingToReset =
    ingredients.length > 0 ||
    results !== null ||
    suggestions !== null ||
    externalMatches !== null ||
    desiredType.trim() !== "";

  return (
    <div>
      <div className="rounded-card border border-line bg-paper p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap gap-2">
          {ingredients.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-full bg-clay-light px-3 py-1.5 text-sm text-clay-dark"
            >
              {name}
              <button
                type="button"
                onClick={() => removeIngredient(name)}
                aria-label={t(lang, "pantryPage.removeIngredientAria", { name })}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-clay/20"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t(lang, "pantryPage.inputPlaceholder")}
            aria-label={t(lang, "pantryPage.inputAria")}
            // text-base på mobil (unngår iOS-innzooming ved fokus).
            className="w-full flex-1 rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            disabled={isAnalyzingPhoto}
            aria-label={t(lang, "pantryPage.photoAria")}
            title={t(lang, "pantryPage.photoAria")}
            className="flex shrink-0 items-center justify-center rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CameraIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleAddFromInput}
            disabled={!inputValue.trim()}
            className="shrink-0 rounded-xl border border-line-strong bg-cream px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(lang, "pantryPage.addButton")}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

        {photoPreview && (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob-forhåndsvisning, ikke egnet for next/image */}
            <img src={photoPreview} alt="" className="h-14 w-14 rounded-lg border border-line-strong object-cover" />
            {isAnalyzingPhoto ? (
              <p className="text-sm text-ink-faint">{t(lang, "pantryPage.analyzingPhoto")}</p>
            ) : (
              photoError && <p className="text-sm text-clay-dark">{photoError}</p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSearch}
            disabled={ingredients.length === 0 || searching}
            className="w-full rounded-full bg-clay px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint sm:w-auto"
          >
            {searching ? t(lang, "pantryPage.searching") : t(lang, "pantryPage.searchButton")}
          </button>
          {hasAnythingToReset && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-sm text-ink-faint underline underline-offset-2 hover:text-clay-dark"
            >
              {t(lang, "pantryPage.resetAllButton")}
            </button>
          )}
        </div>
        {searchError && <p className="mt-2 text-sm text-clay-dark">{searchError}</p>}
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-card border border-clay/30 bg-clay-light/30 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setShowAdminSuggest((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span className="font-serif text-lg text-ink">{t(lang, "pantryPage.adminSuggestToggle")}</span>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-clay-dark">
              {showAdminSuggest
                ? t(lang, "pantryPage.adminSuggestBadgeClose")
                : t(lang, "pantryPage.adminSuggestBadgeOpen")}
            </span>
          </button>

          {showAdminSuggest && (
            <div className="mt-4">
              <p className="text-sm text-ink-soft">{t(lang, "pantryPage.adminSuggestIntro")}</p>

              <input
                value={desiredType}
                onChange={(e) => setDesiredType(e.target.value)}
                placeholder={t(lang, "pantryPage.adminSuggestTypePlaceholder")}
                aria-label={t(lang, "pantryPage.adminSuggestTypeAria")}
                className="mt-3 w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSuggestNewDishes}
                  disabled={ingredients.length === 0 || isSuggesting}
                  className="cursor-pointer rounded-full border border-clay px-5 py-2.5 text-sm font-medium text-clay-dark transition-colors hover:bg-clay hover:text-cream disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-faint"
                >
                  {isSuggesting ? t(lang, "pantryPage.adminSuggestLoading") : t(lang, "pantryPage.adminSuggestButton")}
                </button>
                <button
                  type="button"
                  onClick={handleFindExternalMatches}
                  disabled={ingredients.length === 0 || isFindingExternal}
                  className="cursor-pointer rounded-full border border-clay px-5 py-2.5 text-sm font-medium text-clay-dark transition-colors hover:bg-clay hover:text-cream disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-faint"
                >
                  {isFindingExternal
                    ? t(lang, "pantryPage.adminExternalLoading")
                    : t(lang, "pantryPage.adminExternalButton")}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-faint">{t(lang, "pantryPage.adminExternalSourceNote")}</p>
              {ingredients.length === 0 && (
                <p className="mt-2 text-xs text-ink-faint">{t(lang, "pantryPage.adminSuggestNeedIngredients")}</p>
              )}
              {suggestError && <p className="mt-2 text-sm text-clay-dark">{suggestError}</p>}
              {externalError && <p className="mt-2 text-sm text-clay-dark">{externalError}</p>}

              {externalMatches && externalMatches.length > 0 && (
                <div className="mt-5 space-y-3">
                  {externalMatches.map((match, i) => (
                    <ExternalRecipeMatchCard
                      key={i}
                      match={match}
                      missingLabel={t(lang, "pantryPage.missing")}
                      addMissingLabel={t(lang, "pantryPage.missingAddButton")}
                      missingAddedLabel={t(lang, "pantryPage.missingAdded")}
                      createLabel={t(lang, "pantryPage.adminExternalCreateLink")}
                      missingAdded={addedExternalMissingForIndices.has(i)}
                      onAddMissing={() => handleAddExternalMissing(match, i)}
                      onCreateAsRecipe={() => router.push(`/admin/oppskrifter/ny?importUrl=${encodeURIComponent(match.url)}`)}
                    />
                  ))}
                </div>
              )}

              {suggestions && suggestions.length > 0 && (
                <div className="mt-5 space-y-4">
                  {suggestions.map((suggestion, i) => {
                    const params = new URLSearchParams({
                      title: suggestion.title,
                      description: suggestion.description,
                    });
                    return (
                      <div key={i} className="rounded-xl border border-line bg-paper p-4">
                        <h3 className="font-serif text-lg text-ink">{suggestion.title}</h3>
                        <p className="mt-1 text-sm text-ink-soft">{suggestion.description}</p>
                        {suggestion.reason && <p className="mt-2 text-xs italic text-ink-faint">{suggestion.reason}</p>}
                        {suggestion.usesIngredients.length > 0 && (
                          <p className="mt-2 text-xs text-clay-dark">
                            {t(lang, "pantryPage.adminSuggestUses")}: {suggestion.usesIngredients.join(", ")}
                          </p>
                        )}
                        {suggestion.missingIngredients.length > 0 && (
                          <>
                            <p className="mt-1.5 line-clamp-2 text-xs text-ink-faint">
                              {t(lang, "pantryPage.missing")}: {suggestion.missingIngredients.join(", ")}
                            </p>
                            {addedMissingForIndices.has(i) ? (
                              <Link
                                href="/handleliste"
                                className="mt-1 block text-xs font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
                              >
                                {t(lang, "pantryPage.missingAdded")}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddSuggestionMissing(suggestion, i)}
                                className="mt-1 cursor-pointer text-xs font-medium text-clay hover:text-clay-dark"
                              >
                                {t(lang, "pantryPage.missingAddButton")}
                              </button>
                            )}
                          </>
                        )}
                        <Link
                          href={`/admin/oppskrifter/ny?${params.toString()}`}
                          className="mt-3 inline-block text-sm font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
                        >
                          {t(lang, "pantryPage.adminSuggestCreateLink")}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        {results === null && (
          <EmptyState
            title={t(lang, "pantryPage.emptyStateTitle")}
            description={t(lang, "pantryPage.emptyStateDescription")}
          />
        )}

        {results !== null && results.length === 0 && <EmptyState title={t(lang, "pantryPage.noResults")} />}

        {results !== null && results.length > 0 && (
          <>
            <h2 className="font-serif text-xl text-ink">{t(lang, "pantryPage.resultsHeading")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((result) => {
                // Rangeringen kommer allerede ferdig sortert fra
                // matchRecipesToPantry (høyest coverage først) – prosenten
                // her er samme tall visualisert, ikke en ny beregning, så
                // badge og fremdriftslinje kan aldri komme i utakt med
                // faktisk rekkefølge på kortene.
                const matchPercent = Math.round(result.coverage * 100);
                return (
                  <div key={result.recipe.id} className="flex flex-col gap-2">
                    <div className="relative">
                      <RecipeCard recipe={result.recipe} lang={lang} />
                      {/* Plassert øverst til venstre – RecipeCard bruker selv
                          øverst til høyre til favoritt-hjertet, se
                          RecipeCard.tsx. */}
                      <span className="absolute left-3 top-3 rounded-full bg-clay px-2.5 py-1 text-xs font-bold tracking-wide text-cream shadow-card">
                        {matchPercent} %
                      </span>
                    </div>
                    <div className="px-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-dark">
                          <div
                            className="h-full rounded-full bg-clay transition-[width]"
                            style={{ width: `${matchPercent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-medium text-clay-dark">
                          {t(lang, "pantryPage.coverage", { matched: result.matchedCount, total: result.totalCount })}
                        </span>
                      </div>
                      {result.missingIngredientNames.length > 0 && (
                        <>
                          <p className="mt-1.5 line-clamp-2 text-xs text-ink-faint">
                            {t(lang, "pantryPage.missing")}: {result.missingIngredientNames.join(", ")}
                          </p>
                          {addedMissingForIds.has(result.recipe.id) ? (
                            <Link
                              href="/handleliste"
                              className="mt-1 block text-xs font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
                            >
                              {t(lang, "pantryPage.missingAdded")}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddMissing(result)}
                              disabled={addingMissingForId === result.recipe.id}
                              className="mt-1 text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                            >
                              {addingMissingForId === result.recipe.id
                                ? t(lang, "pantryPage.missingAdding")
                                : t(lang, "pantryPage.missingAddButton")}
                            </button>
                          )}
                          {addMissingErrors[result.recipe.id] && (
                            <p className="mt-1 text-xs text-clay-dark">{addMissingErrors[result.recipe.id]}</p>
                          )}
                        </>
                      )}
                    </div>
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
