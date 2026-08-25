"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { searchRecipesForPicker } from "@/lib/actions/search";
import { getWineRecommendation } from "@/lib/actions/ai";
import { getVinmonopoletWineSuggestion, type VinmonopoletSuggestion } from "@/lib/actions/vinmonopolet";
import { matchWineToRecipes, matchWineToRecipesFromImage, type WineRecipeMatch } from "@/lib/actions/wine-match";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import type { SearchableRecipe } from "@/lib/utils/search";
import { SearchIcon, ChevronRightIcon, CameraIcon } from "@/components/ui/icons";
import { localizedTitle } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * Forsidens "Mat & vin"-seksjon – tenkt som en signaturfunksjon, ikke bare
 * en reklameplakat for funksjonen som allerede finnes på oppskriftssiden
 * (components/recipe/WineSection.tsx). Beholder samme mørke, gastronomiske
 * uttrykk som resten av siden (bevisst IKKE en lys pustepause – det er
 * Cook Mode-seksjonen sin jobb, se CookModeShowcase.tsx).
 *
 * To retninger, begge bygget på den SAMME eksisterende AI-/Vinmonopolet-
 * logikken, ikke et parallelt system:
 *
 *   RETT -> VIN    gjenbruker getWineRecommendation + getVinmonopoletWineSuggestion
 *                  direkte (nøyaktig samme kall som på oppskriftssiden)
 *   VIN -> RETTER  lib/actions/wine-match.ts (matchWineToRecipes /
 *                  matchWineToRecipesFromImage), som gjør det motsatte:
 *                  finner de beste rettene i katalogen for en vin gjesten
 *                  selv beskriver – som tekst, eller nå også som et FOTO
 *                  av flasken/etiketten, samme kamera-mønster som
 *                  WineMatchChecker i components/recipe/WineSection.tsx
 */

type Tab = "food" | "wine";

function DishPicker({ lang, onPick }: { lang: Lang; onPick: (recipe: SearchableRecipe) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableRecipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchRecipesForPicker(trimmed);
        setResults(found);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <p className="font-serif text-lg italic text-clay-dark">{t(lang, "home.wine.foodPrompt")}</p>
      <div className="mt-3 flex items-center gap-3 rounded-full border border-clay/20 bg-ink px-4 py-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-cream/45" />
        {/* text-base (16px) på mobil, ikke text-sm (14px) – iOS Safari
         * zoomer automatisk inn hele siden når man fokuserer et input med
         * skrift under 16px, og zoomer ikke ut igjen av seg selv. Vanlig
         * størrelse (text-sm) beholdes fra sm: og oppover. */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, "home.wine.foodSearchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-base text-cream placeholder:text-cream/45 focus:outline-none sm:text-sm"
        />
      </div>

      {query.trim() !== "" && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-clay/15 bg-ink">
          {isSearching ? (
            <p className="px-4 py-3 text-sm text-cream/50">…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-cream/50">{t(lang, "home.wine.foodNoResults")}</p>
          ) : (
            <ul className="divide-y divide-cream/10">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream/5"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream/10">
                      {r.heroImageUrl && (
                        <Image src={r.heroImageUrl} alt="" fill sizes="44px" className="object-cover" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-cream">{localizedTitle(r, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** RETT -> VIN, i to steg (ikke ett) – matcher nå mønsteret fra
 * "Vinanbefaling" på oppskriftssiden (components/recipe/WineSection.tsx):
 * første klikk gir kun en BESKRIVELSE av vinstilen som passer (samme
 * getWineRecommendation-kall), og bare dersom gjesten selv ber om det
 * («Vil du ha et konkret forslag fra Vinmonopolet?»-knappen) hentes et
 * faktisk, navngitt produkt. Før hoppet dette rett til et konkret
 * Vinmonopolet-produkt uten å vise vinstil-beskrivelsen i det hele tatt. */
function FoodToWine({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState<SearchableRecipe | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [suggestion, setSuggestion] = useState<VinmonopoletSuggestion | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  function recipeContextFor(recipe: SearchableRecipe) {
    return {
      title: recipe.title,
      description: recipe.description,
      ingredientNames: recipe.ingredientNames,
    };
  }

  function handlePick(recipe: SearchableRecipe) {
    setSelected(recipe);
    setRecommendation(null);
    setSuggestion(null);
    setError(null);
    setVinError(null);
    setImageFailed(false);

    startTransition(async () => {
      try {
        const text = await getWineRecommendation(recipeContextFor(recipe), lang);
        setRecommendation(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "home.wine.error"));
      }
    });
  }

  function handleFindWine() {
    if (!selected || !recommendation) return;
    setVinError(null);
    setVinLoading(true);
    setSuggestion(null);
    setImageFailed(false);

    (async () => {
      try {
        const result = await getVinmonopoletWineSuggestion(recipeContextFor(selected), recommendation, lang);
        setSuggestion(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  function reset() {
    setSelected(null);
    setRecommendation(null);
    setSuggestion(null);
    setError(null);
    setVinError(null);
  }

  if (!selected) {
    return <DishPicker lang={lang} onPick={handlePick} />;
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-dark">
          {selected.heroImageUrl && (
            <Image src={selected.heroImageUrl} alt="" fill sizes="56px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-lg text-ink">{localizedTitle(selected, lang)}</p>
          <button type="button" onClick={reset} className="text-xs font-medium text-clay hover:text-clay-dark">
            {t(lang, "home.wine.changeDish")}
          </button>
        </div>
      </div>

      {isPending && (
        <p className="mt-5 text-sm italic text-ink-faint">
          {t(lang, "home.wine.foodFinding", { title: localizedTitle(selected, lang) })}
        </p>
      )}

      {error && <p className="mt-5 text-sm text-clay-dark">{error}</p>}

      {recommendation && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="text-sm leading-relaxed text-ink">{recommendation}</p>

          {!suggestion && (
            <div className="mt-3">
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

          {suggestion && (
            <div className="mt-4 flex gap-4 border-t border-line pt-4">
              {!imageFailed && (
                // eslint-disable-next-line @next/next/no-img-element -- ekte, eksternt Vinmonopolet-bilde, ikke alle produkter har ett
                <img
                  src={suggestion.imageUrl}
                  alt={suggestion.productName}
                  onError={() => setImageFailed(true)}
                  className="h-24 w-24 shrink-0 rounded-lg border border-line bg-cream object-contain"
                />
              )}
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-clay">
                  {t(lang, "home.wine.ourPick")}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <p className="truncate font-serif text-lg text-ink">{suggestion.productName}</p>
                  {suggestion.priceNok !== null && (
                    <p className="shrink-0 text-xs font-medium text-ink-faint">{suggestion.priceNok} kr</p>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{suggestion.reasoning}</p>
                <a
                  href={suggestion.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-clay hover:text-clay-dark"
                >
                  {t(lang, "wine.viewProduct")}
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSuggestion(null);
                    setImageFailed(false);
                  }}
                  className="mt-2 block text-xs font-medium text-clay hover:text-clay-dark"
                >
                  {t(lang, "wine.vinmonopoletNewSuggestion")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-clay" style={{ width: `${score}%` }} />
    </div>
  );
}

function MatchRow({ match, lang }: { match: WineRecipeMatch; lang: Lang }) {
  return (
    <Link
      href={`/oppskrifter/${match.recipe.slug}`}
      className="group flex items-center gap-4 border-t border-line py-4 first:border-t-0"
    >
      <p className="w-12 shrink-0 text-right font-serif text-2xl text-clay">{match.score}%</p>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base text-ink transition-colors group-hover:text-clay-dark">
          {localizedTitle(match.recipe, lang)}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-ink-faint">{match.reasoning}</p>
        <div className="mt-1.5">
          <ScoreBar score={match.score} />
        </div>
      </div>
    </Link>
  );
}

function WineToFood({ lang }: { lang: Lang }) {
  const [wineDescription, setWineDescription] = useState("");
  const [result, setResult] = useState<{ wineNameParsed: string; matches: WineRecipeMatch[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isPending || isAnalyzingPhoto;

  // Samme mønster som WineMatchChecker i WineSection.tsx: rydd opp
  // objekt-URL-en når bildet byttes ut eller komponenten avmonteres.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!wineDescription.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await matchWineToRecipes(wineDescription, lang);
        setResult(res);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : t(lang, "home.wine.error"));
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
      const res = await matchWineToRecipesFromImage({ mediaType, base64Data }, lang);
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : t(lang, "wine.photoError"));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }

  return (
    <div>
      <p className="font-serif text-lg italic text-clay-dark">{t(lang, "home.wine.winePrompt")}</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={wineDescription}
          onChange={(e) => setWineDescription(e.target.value)}
          placeholder={t(lang, "home.wine.winePlaceholder")}
          className="min-w-0 flex-1 rounded-full border border-clay/20 bg-ink px-4 py-3 text-base text-cream placeholder:text-cream/45 focus:outline-none sm:text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            disabled={isBusy}
            aria-label={t(lang, "wine.photoAria")}
            title={t(lang, "wine.photoAria")}
            className="flex shrink-0 items-center justify-center rounded-full border border-clay/20 bg-ink px-3.5 py-3 text-cream/70 transition-colors hover:bg-ink/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CameraIcon className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={isBusy || !wineDescription.trim()}
            className="shrink-0 rounded-full bg-clay px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {isPending ? t(lang, "home.wine.checking") : t(lang, "home.wine.checkButton")}
          </button>
        </div>
      </form>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

      {photoPreview && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob-forhåndsvisning, ikke egnet for next/image */}
          <img
            src={photoPreview}
            alt=""
            className="h-16 w-16 rounded-lg border border-clay/20 object-cover"
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

      {error && <p className="mt-4 text-sm text-clay-dark">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {t(lang, "home.wine.wineResultsFor", { wine: result.wineNameParsed })}
          </p>
          <div className="mt-1">
            {result.matches.map((m) => (
              <MatchRow key={m.recipe.id} match={m} lang={lang} />
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">{t(lang, "home.wine.disclaimer")}</p>
        </div>
      )}
    </div>
  );
}

export function WinePairing({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<Tab>("food");

  return (
    <section className="relative isolate overflow-hidden bg-cream-dark py-16 sm:py-20">
      {/* To stemningsbilder side ved side (stablet på mobil) i stedet for ett
       * – et nærbilde av et vinglass ved levende lys, og en hånd som tapper
       * vin rett fra fatet. Begge satt via vanlig CSS background-image
       * (ikke next/image), nettopp fordi det da faller elegant tilbake til
       * den rene bg-cream-dark-fargen uten noe "broken image"-ikon dersom
       * filene skulle mangle. Bytt/legg til bilder i public/images/
       * wine-pairing-1.jpg og wine-pairing-2.jpg – ingen kodeendring
       * nødvendig. Den mørke overlegg-fargen under er bevisst kraftig
       * (bg-cream-dark/80) slik at tekst og innhold beholder samme
       * lesbarhet som før, uansett hvor lyst/mørkt bildene selv er –
       * bildene skal kjennes som en subtil stemning i bakgrunnen, ikke
       * konkurrere med innholdet. */}
      {/* flex-1 (ikke h-1/2/w-1/2) er bevisst valgt her – prosent-høyde på
       * flex-barn inne i en absolutt posisjonert inset-0-forelder er en
       * kjent iOS Safari-svakhet (høyden kollapser til 0, så bildene ble
       * usynlige på iPhone selv om de så riktige ut på desktop). flex-1
       * fordeler plassen langs flex-retningen direkte og fungerer
       * pålitelig på tvers av nettlesere, uavhengig av hvordan
       * forelderens egen høyde er satt. */}
      <div className="absolute inset-0 flex flex-col sm:flex-row" aria-hidden="true">
        <div
          // bg-center (50%) sentrerte rundt glassets stett/fot – motivet
          // (vinen/glasskanten) sitter i den øvre tredjedelen av det
          // portrettformede originalbildet, mens seksjonen her er svært
          // bred og lav. "center 25%" flytter det synlige utsnittet opp
          // slik at vinranden kommer med, i stedet for å klippe den bort.
          className="flex-1 bg-cover"
          style={{ backgroundImage: "url(/images/wine-pairing-1.jpg)", backgroundPosition: "center 25%" }}
        />
        <div
          className="flex-1 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/wine-pairing-2.jpg)" }}
        />
      </div>
      <div className="absolute inset-0 bg-cream-dark/80" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
            {t(lang, "home.wine.eyebrow")}
          </p>
          <h2 className="mt-3 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">
            {t(lang, "home.wine.title")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{t(lang, "home.wine.subtitle")}</p>
        </div>

        <div className="mx-auto mt-8 flex w-fit gap-1 rounded-full border border-line-strong p-1">
          <button
            type="button"
            onClick={() => setTab("food")}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === "food" ? "bg-clay text-cream" : "text-ink-faint hover:text-ink",
            )}
          >
            {t(lang, "home.wine.tabFood")}
          </button>
          <button
            type="button"
            onClick={() => setTab("wine")}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === "wine" ? "bg-clay text-cream" : "text-ink-faint hover:text-ink",
            )}
          >
            {t(lang, "home.wine.tabWine")}
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-line bg-paper p-6 sm:p-8">
          {tab === "food" ? <FoodToWine lang={lang} /> : <WineToFood lang={lang} />}
        </div>
      </div>
    </section>
  );
}
