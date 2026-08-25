"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { clsx } from "clsx";
import { getWineRecommendation, checkWineMatch, checkWineMatchFromImage } from "@/lib/actions/ai";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { WINE_VERDICT_LABELS, WINE_VERDICT_LABELS_EN, type WineVerdict } from "@/lib/wine-verdict";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { CameraIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

const VERDICT_STYLES: Record<WineVerdict, string> = {
  ikke_bra: "border-clay-dark bg-clay-light text-clay-dark",
  greit: "border-line-strong bg-cream-dark text-ink-soft",
  bra: "border-olive bg-olive-light text-olive-dark",
  meget_bra: "border-olive-dark bg-olive-light text-olive-dark",
};

interface RecipeContext {
  title: string;
  description: string;
  ingredientNames: string[];
}

/** "Vinanbefaling"-knappen: besøkende ber selv om et forslag, på forespørsel.
 * Deretter kan de valgfritt be om et EKTE produkt fra Vinmonopolets
 * sortiment – navn, bilde OG pris er alle ekte, hentet direkte fra selve
 * produktsiden akkurat da (se lib/actions/vinmonopolet.ts), ikke et
 * AI-anslag. Ingen prisklasse å velge – kun styrt av retten/vinstilen. */
function WineRecommendation({ recipeContext, lang }: { recipeContext: RecipeContext; lang: Lang }) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [vinResult, setVinResult] = useState<VinmonopoletSuggestion | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinImageFailed, setVinImageFailed] = useState(false);

  function handleClick() {
    setError(null);
    setVinResult(null);
    setVinError(null);
    startTransition(async () => {
      try {
        const text = await getWineRecommendation(recipeContext, lang);
        setRecommendation(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "wine.recError"));
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
        const result = await getVinmonopoletWineSuggestion(recipeContext, recommendation, lang);
        setVinResult(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  return (
    <div>
      <h3 className="font-serif text-lg text-ink">{t(lang, "wine.recTitle")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "wine.recDesc")}</p>

      {!recommendation && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {isPending ? t(lang, "wine.fetching") : t(lang, "wine.getRec")}
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
            {isPending ? t(lang, "wine.fetchingNew") : t(lang, "wine.getNewRec")}
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
              {vinError && (
                <p className="mt-2 text-xs text-clay-dark">
                  {vinError}
                </p>
              )}
            </div>
          )}

          {vinResult && (
            <div className="mt-3 rounded-xl border border-olive-light bg-olive-light/30 px-3.5 py-3">
              <div className="flex gap-3">
                {!vinImageFailed && (
                  // eslint-disable-next-line @next/next/no-img-element -- ekte, eksternt Vinmonopolet-bilde (se vinmonopoletProductImageUrl); ikke alle produkter har bilde, derfor onError-fallback
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

/** "Passer vinen din med denne retten?": gjest skriver inn en vin og får en vurdering. */
function WineMatchChecker({ recipeContext, lang }: { recipeContext: RecipeContext; lang: Lang }) {
  const [wineName, setWineName] = useState("");
  const [result, setResult] = useState<{
    verdict: WineVerdict;
    reasoning: string;
    wineNameParsed: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verdictLabels = lang === "en" ? WINE_VERDICT_LABELS_EN : WINE_VERDICT_LABELS;
  const isBusy = isPending || isAnalyzingPhoto;

  // Rydd opp objekt-URL-en når vi bytter bilde eller komponenten avmonteres,
  // så vi ikke lekker minne over en lengre lesesesjon.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!wineName.trim()) return;

    startTransition(async () => {
      try {
        const res = await checkWineMatch(recipeContext, wineName, lang);
        setResult(res);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : t(lang, "wine.matchError"));
      }
    });
  }

  function handlePhotoButtonClick() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setResult(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setIsAnalyzingPhoto(true);
    try {
      const { base64Data, mediaType } = await resizeImageFileToJpegBase64(file);
      const res = await checkWineMatchFromImage(recipeContext, { mediaType, base64Data }, lang);
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : t(lang, "wine.photoError"));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "wine.matchTitle")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "wine.matchDesc")}</p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={wineName}
          onChange={(e) => setWineName(e.target.value)}
          placeholder={t(lang, "wine.matchPlaceholder")}
          className="w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none sm:flex-1"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            disabled={isBusy}
            aria-label={t(lang, "wine.photoAria")}
            title={t(lang, "wine.photoAria")}
            className="flex shrink-0 items-center justify-center rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CameraIcon className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={isBusy || !wineName.trim()}
            className="shrink-0 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {isPending ? t(lang, "wine.checking") : t(lang, "wine.checkMatch")}
          </button>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {photoPreview && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob-forhåndsvisning, ikke egnet for next/image */}
          <img
            src={photoPreview}
            alt=""
            className="h-16 w-16 rounded-lg border border-line-strong object-cover"
          />
          {isAnalyzingPhoto ? (
            <p className="text-sm text-ink-faint">{t(lang, "wine.analyzingPhoto")}</p>
          ) : (
            <button
              type="button"
              onClick={handlePhotoButtonClick}
              className="text-sm font-medium text-clay hover:text-clay-dark"
            >
              {t(lang, "wine.retakePhoto")}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {result && (
        <div className={clsx("mt-4 rounded-xl border px-4 py-3", VERDICT_STYLES[result.verdict])}>
          <p className="text-sm font-semibold">
            {result.wineNameParsed}: {verdictLabels[result.verdict]}
          </p>
          <p className="mt-1 text-sm leading-relaxed">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export function WineSection({ recipeContext, lang }: { recipeContext: RecipeContext; lang: Lang }) {
  return (
    <div className="mt-10 rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <WineRecommendation recipeContext={recipeContext} lang={lang} />
      <WineMatchChecker recipeContext={recipeContext} lang={lang} />
    </div>
  );
}
