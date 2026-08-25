"use client";

import { useState, useTransition } from "react";
import { getMealWineRecommendation } from "@/lib/actions/ai";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { t, type Lang } from "@/lib/i18n";

/**
 * MENYNIVÅ-VIN (Fase 5 – Experience, 5.6) – se getMealWineRecommendation i
 * lib/actions/ai.ts for selve AI-logikken. Samme knapp-trigget mønster som
 * WineSection.tsx sin WineRecommendation, men vurderer HELE MENYEN – bygger
 * direkte på MealSession-slottene (se MealView.tsx), ikke bare én rett.
 * Gjenbruker getVinmonopoletWineSuggestion (ekte produkt/pris fra
 * Vinmonopolet) UENDRET – den tar allerede kun {title, description,
 * ingredientNames}, så en syntetisk "oppskrift" bygget av menyens
 * retter/roller passer rett inn uten noen endring i den funksjonen.
 */
export function MealWineSection({
  mealTitle,
  courses,
  lang,
}: {
  mealTitle: string;
  courses: { roleLabel: string; title: string }[];
  lang: Lang;
}) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [vinResult, setVinResult] = useState<VinmonopoletSuggestion | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinImageFailed, setVinImageFailed] = useState(false);

  if (courses.length === 0) return null;

  function handleClick() {
    setError(null);
    setVinResult(null);
    setVinError(null);
    startTransition(async () => {
      try {
        const text = await getMealWineRecommendation({ title: mealTitle, courses }, lang);
        setRecommendation(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "mealWine.error"));
      }
    });
  }

  function handleFindWine() {
    if (!recommendation) return;
    setVinError(null);
    setVinLoading(true);
    setVinResult(null);
    setVinImageFailed(false);

    (async () => {
      try {
        const pseudoRecipe = {
          title: mealTitle,
          description: courses.map((c) => `${c.roleLabel}: ${c.title}`).join(". "),
          ingredientNames: [] as string[],
        };
        const result = await getVinmonopoletWineSuggestion(pseudoRecipe, recommendation, lang);
        setVinResult(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  return (
    <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "mealWine.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealWine.description")}</p>

      {!recommendation && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {isPending ? t(lang, "mealWine.fetching") : t(lang, "mealWine.button")}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {recommendation && (
        <div className="mt-3 rounded-xl border border-line bg-paper px-4 py-3">
          <p className="text-sm leading-relaxed text-ink">{recommendation}</p>
          <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className="mt-2 text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            {isPending ? t(lang, "mealWine.fetching") : t(lang, "mealWine.getNew")}
          </button>

          {!vinResult && (
            <div className="mt-3 border-t border-line pt-3">
              <button
                type="button"
                onClick={handleFindWine}
                disabled={vinLoading}
                className="block text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
              >
                {vinLoading ? t(lang, "wine.vinmonopoletLoading") : t(lang, "wine.vinmonopoletPrompt")}
              </button>
              {vinError && <p className="mt-2 text-xs text-clay-dark">{vinError}</p>}
            </div>
          )}

          {vinResult && (
            <div className="mt-3 rounded-xl border border-olive-light bg-olive-light/30 px-3.5 py-3">
              <div className="flex gap-3">
                {!vinImageFailed && (
                  // eslint-disable-next-line @next/next/no-img-element -- ekte, eksternt Vinmonopolet-bilde, se WineSection.tsx sin identiske begrunnelse
                  <img
                    src={vinResult.imageUrl}
                    alt={vinResult.productName}
                    onError={() => setVinImageFailed(true)}
                    className="h-24 w-24 shrink-0 rounded-lg border border-line bg-cream object-contain"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-olive-dark">{vinResult.productName}</p>
                    {vinResult.priceNok !== null && (
                      <p className="shrink-0 text-xs font-medium text-ink-soft">
                        {t(lang, "wine.priceLabel")}: {vinResult.priceNok} kr
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{vinResult.reasoning}</p>
                </div>
              </div>
              <a
                href={vinResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-clay px-3.5 py-2 text-xs font-medium text-cream transition-colors hover:bg-clay-dark"
              >
                {t(lang, "wine.viewProduct")} →
              </a>
              <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-faint">
                {t(lang, "wine.vinmonopoletDisclaimer")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setVinResult(null);
                  setVinImageFailed(false);
                }}
                className="mt-2 block text-xs font-medium text-clay hover:text-clay-dark"
              >
                {t(lang, "wine.vinmonopoletNewSuggestion")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
