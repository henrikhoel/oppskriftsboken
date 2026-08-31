"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import { getDrinkPairing, type DrinkPairing, type DrinkPairingOption } from "@/lib/actions/kitchen-intelligence";
import { checkBeverageMatch, checkWineMatchFromImage } from "@/lib/actions/ai";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { WINE_VERDICT_LABELS, WINE_VERDICT_LABELS_EN, type WineVerdict } from "@/lib/wine-verdict";
import type { TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { CameraIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "DRIKKE TIL" – erstatter den tidligere WineSection.tsx (kun vin) på
 * oppskriftssiden. Se filheaderen til getDrinkPairing i
 * lib/actions/kitchen-intelligence.ts for hvordan de tre kategoriene deler
 * ÉN vurdering av rettens smaksprofil, og BeverageKind i lib/actions/ai.ts
 * for hvorfor "passer denne?"-sjekkeren under er generalisert (kun vin er
 * koblet til i UI-et ennå – se punkt 7 i spesifikasjonen).
 *
 * DESIGN: bevisst ÉN rolig seksjon (ikke tre separate kort) – tre kolonner
 * atskilt av subtile skillelinjer på desktop, stablet på mobil. Ingen
 * "AI-dashboard"-følelse, samme redaksjonelle språk (serif-overskrifter,
 * små sperret store bokstaver til kategorietikettene) som resten av
 * CONVITEs "kjøkkenintelligens"-seksjoner (se f.eks. Eyebrow-mønsteret i
 * EveningExperience.tsx).
 */

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

/** Bygger fritekst-strengen getVinmonopoletWineSuggestion forventer (samme
 * kontrakt som før: "en vinstil-tekst"), fra den nye strukturerte
 * vin-kolonnen – bevarer den eksisterende Vinmonopolet-integrasjonen
 * uendret, kun kilden til teksten er ny. */
function wineOptionToSearchText(wine: DrinkPairingOption): string {
  const styleAndDetail = wine.detail ? `${wine.style} (${wine.detail})` : wine.style;
  return wine.note ? `${styleAndDetail}. ${wine.note}` : styleAndDetail;
}

function DrinkColumn({
  label,
  option,
  children,
}: {
  label: string;
  option: DrinkPairingOption;
  children?: ReactNode;
}) {
  if (!option.style) return null;
  return (
    <div className="px-0.5 py-5 sm:px-6 sm:py-1 sm:first:pl-0 sm:last:pr-0">
      <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-clay">{label}</p>
      <p className="mt-2 text-balance font-serif text-lg text-ink">{option.style}</p>
      {option.detail && <p className="mt-0.5 text-xs text-ink-faint">{option.detail}</p>}
      {option.note && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{option.note}</p>}
      {children}
    </div>
  );
}

function DrinkPairingResult({
  pairing,
  recipeContext,
  lang,
}: {
  pairing: DrinkPairing;
  recipeContext: RecipeContext;
  lang: Lang;
}) {
  const [vinResult, setVinResult] = useState<VinmonopoletSuggestion | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [vinImageFailed, setVinImageFailed] = useState(false);

  function handleFindWine() {
    setVinError(null);
    setVinLoading(true);
    setVinResult(null);
    setVinImageFailed(false);

    (async () => {
      try {
        const searchText = wineOptionToSearchText(pairing.wine);
        const result = await getVinmonopoletWineSuggestion(recipeContext, searchText, lang);
        setVinResult(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  return (
    <div className="mt-4">
      <div className="divide-y divide-line sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <DrinkColumn label={t(lang, "drinkPairing.wineLabel")} option={pairing.wine}>
          {!vinResult && (
            <button
              type="button"
              onClick={handleFindWine}
              disabled={vinLoading}
              className="mt-3 block text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
            >
              {vinLoading ? t(lang, "wine.vinmonopoletLoading") : t(lang, "drinkPairing.findWineButton")}
            </button>
          )}
          {vinError && <p className="mt-2 text-xs text-clay-dark">{vinError}</p>}
        </DrinkColumn>

        <DrinkColumn label={t(lang, "drinkPairing.beerLabel")} option={pairing.beer} />
        <DrinkColumn label={t(lang, "drinkPairing.nonAlcoholicLabel")} option={pairing.nonAlcoholic} />
      </div>

      {/* Vinmonopolet-forslaget rendres UTENFOR tre-kolonners-rutenettet over
       * med full seksjonsbredde, ikke klemt inn i vin-kolonnens ca. 1/3
       * bredde på desktop – bilde + produkttekst trenger mer luft enn én
       * kolonne gir, og en bredere, rolig "funnet til deg"-kort kjennes
       * dessuten mer elegant enn et trangt sidepanel. */}
      {vinResult && (
        <div className="mt-6 border-t border-line pt-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-olive-light bg-olive-light/20 p-5 sm:flex-row sm:p-6">
            {!vinImageFailed && (
              // eslint-disable-next-line @next/next/no-img-element -- ekte, eksternt Vinmonopolet-bilde (se vinmonopoletProductImageUrl); ikke alle produkter har bilde, derfor onError-fallback
              <img
                src={vinResult.imageUrl}
                alt={vinResult.productName}
                onError={() => setVinImageFailed(true)}
                className="h-28 w-28 shrink-0 self-center rounded-xl border border-line bg-cream object-contain sm:self-start"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-serif text-lg text-olive-dark">{vinResult.productName}</p>
                {vinResult.priceNok !== null && (
                  <p className="shrink-0 text-sm font-medium text-ink-soft">
                    {t(lang, "wine.priceLabel")}: {vinResult.priceNok} kr
                  </p>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{vinResult.reasoning}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <a
                  href={vinResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-clay px-3.5 py-2 text-xs font-medium text-cream transition-colors hover:bg-clay-dark"
                >
                  {t(lang, "wine.viewProduct")} →
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setVinResult(null);
                    setVinImageFailed(false);
                  }}
                  className="text-xs font-medium text-clay hover:text-clay-dark"
                >
                  {t(lang, "wine.vinmonopoletNewSuggestion")}
                </button>
              </div>
              <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-faint">{t(lang, "wine.vinmonopoletDisclaimer")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DrinkPairingFetcher({ recipeId, recipeContext, tasteProfile, lang }: {
  recipeId: string;
  recipeContext: RecipeContext;
  tasteProfile: TasteProfile | null;
  lang: Lang;
}) {
  const [pairing, setPairing] = useState<DrinkPairing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getDrinkPairing(recipeId, { ...recipeContext, tasteProfile }, lang);
        setPairing(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "drinkPairing.error"));
      }
    });
  }

  return (
    <div>
      <h3 className="font-serif text-lg text-ink">{t(lang, "drinkPairing.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "drinkPairing.intro")}</p>

      {!pairing && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {isPending ? t(lang, "drinkPairing.loading") : t(lang, "drinkPairing.button")}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {pairing && <DrinkPairingResult pairing={pairing} recipeContext={recipeContext} lang={lang} />}
    </div>
  );
}

/** "Passer denne?": gjest skriver inn (eller fotograferer) en vin, får en
 * vurdering mot retten. Generalisert i lib/actions/ai.ts
 * (checkBeverageMatch) – kalles her med beverageKind "wine" siden det er
 * det eneste UI-et støtter i dag, se filheaderen over. */
function BeverageMatchChecker({ recipeContext, lang }: { recipeContext: RecipeContext; lang: Lang }) {
  const [beverageName, setBeverageName] = useState("");
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

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!beverageName.trim()) return;

    startTransition(async () => {
      try {
        const res = await checkBeverageMatch(recipeContext, beverageName, lang, "wine");
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
      <h3 className="font-serif text-lg text-ink">{t(lang, "drinkPairing.matchTitle")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "drinkPairing.matchDesc")}</p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={beverageName}
          onChange={(e) => setBeverageName(e.target.value)}
          placeholder={t(lang, "wine.matchPlaceholder")}
          className="w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:flex-1 sm:text-sm"
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
            disabled={isBusy || !beverageName.trim()}
            className="shrink-0 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {isPending ? t(lang, "wine.checking") : t(lang, "wine.checkMatch")}
          </button>
        </div>
      </form>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

      {photoPreview && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob-forhåndsvisning, ikke egnet for next/image */}
          <img src={photoPreview} alt="" className="h-16 w-16 rounded-lg border border-line-strong object-cover" />
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

export function DrinkPairingSection({
  recipeId,
  recipeContext,
  tasteProfile,
  lang,
}: {
  recipeId: string;
  recipeContext: RecipeContext;
  tasteProfile: TasteProfile | null;
  lang: Lang;
}) {
  // Boks-stylingen (rounded-card/border/bg) fjernet 31.08.2026
  // (designforbedring punkt 9/11) – "Drikke til" og "Passer denne?" var
  // allerede slått sammen i koden (én komponent), men fremstod fortsatt
  // som en boks blant flere andre bokser. Nå ett rolig avsnitt i den delte
  // "sekundær info"-flaten i RecipeInteractive.tsx – de to interne
  // border-t-skillelinjene under er beholdt uendret siden de allerede gir
  // riktig visuell inndeling MELLOM de to delfunksjonene.
  return (
    <div>
      <DrinkPairingFetcher recipeId={recipeId} recipeContext={recipeContext} tasteProfile={tasteProfile} lang={lang} />
      <BeverageMatchChecker recipeContext={recipeContext} lang={lang} />
    </div>
  );
}
