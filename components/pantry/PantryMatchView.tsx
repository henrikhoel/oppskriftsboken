"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { detectIngredientsFromImage, findRecipesForPantry } from "@/lib/actions/kitchen-intelligence";
import type { PantryMatchResult } from "@/lib/kitchen-intelligence/pantry-match";
import { splitIngredientList } from "@/lib/kitchen-intelligence/pantry-match";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { RecipeCard } from "@/components/recipe/RecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CameraIcon, XIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Selve "Hva kan jeg lage?"-UI-et – se app/hva-kan-jeg-lage/page.tsx for
 * begrunnelsen om hvorfor Smart Pantry Search og "Bruk restene" er slått
 * sammen hit. Brukeren bygger én liste med ingredienser (skriv inn og/eller
 * ta bilde av det som er i kjøleskapet), og trykker "Finn oppskrifter" for
 * å få en deterministisk rangert treffliste – se
 * lib/kitchen-intelligence/pantry-match.ts.
 */
export function PantryMatchView({ lang }: { lang: Lang }) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [results, setResults] = useState<PantryMatchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            className="w-full flex-1 rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
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

        <button
          type="button"
          onClick={handleSearch}
          disabled={ingredients.length === 0 || searching}
          className="mt-4 w-full rounded-full bg-clay px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint sm:w-auto"
        >
          {searching ? t(lang, "pantryPage.searching") : t(lang, "pantryPage.searchButton")}
        </button>
        {searchError && <p className="mt-2 text-sm text-clay-dark">{searchError}</p>}
      </div>

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
                        <p className="mt-1.5 line-clamp-2 text-xs text-ink-faint">
                          {t(lang, "pantryPage.missing")}: {result.missingIngredientNames.join(", ")}
                        </p>
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
