"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import type {
  DrinkPairing,
  LocalizedDrinkOption,
  LocalizedDrinkPairing,
  PinnedVinmonopoletProduct,
} from "@/lib/kitchen-intelligence/drink-pairing";
import { drinkOptionSearchText } from "@/lib/kitchen-intelligence/drink-pairing";
import { localizedDrinkPairing } from "@/lib/utils/format";
import { checkBeverageMatch, checkWineMatchFromImage } from "@/lib/actions/ai";
import {
  getVinmonopoletWineSuggestion,
  resolveVinmonopoletProductById,
  type VinmonopoletSuggestion,
} from "@/lib/actions/vinmonopolet";
import { WINE_VERDICT_LABELS, WINE_VERDICT_LABELS_EN, type WineVerdict } from "@/lib/wine-verdict";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { CameraIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "DRIKKE TIL" – erstatter den tidligere WineSection.tsx (kun vin) på
 * oppskriftssiden. Se filheaderen til DrinkPairingOption i
 * lib/kitchen-intelligence/drink-pairing.ts for hvordan de tre kategoriene
 * deler ÉN vurdering av rettens smaksprofil, og BeverageKind i
 * lib/actions/ai.ts for hvorfor "passer denne?"-sjekkeren under er
 * generalisert (kun vin er koblet til i UI-et ennå – se punkt 7 i
 * spesifikasjonen).
 *
 * DESIGN: bevisst ÉN rolig seksjon (ikke tre separate kort) – tre kolonner
 * atskilt av subtile skillelinjer på desktop, stablet på mobil. Ingen
 * "AI-dashboard"-følelse, samme redaksjonelle språk (serif-overskrifter,
 * små sperret store bokstaver til kategorietikettene) som resten av
 * CONVITEs "kjøkkenintelligens"-seksjoner (se f.eks. Eyebrow-mønsteret i
 * EveningExperience.tsx).
 *
 * FORSLAGET (wine/beer/nonAlcoholic) er IKKE lenger en live AI-beregning
 * her – flyttet 11.09.2026 til et forhåndsgenerert admin-forslag lagret på
 * selve oppskriften (recipe.drinkPairing, se generateDrinkPairing i
 * lib/actions/recipes.ts). "DRIKKE TIL"-knappen (DrinkPairingReveal under)
 * gjør derfor INGEN AI-kall lenger – den avslører kun det allerede innlastede
 * forslaget, med en kort kunstig "sjekker"-forsinkelse (~1,8-2s) FØR
 * forslaget vises, slik at det fortsatt føles som et valg blir tatt idet man
 * trykker (ønsket av Henrik: "det er viktig at man får følelsen av at det er
 * et valg som blir generert"). "Passer denne?" (BeverageMatchChecker under)
 * er UPÅVIRKET av dette – den er fortsatt en ekte, live AI-vurdering hver
 * gang, se filheaderen der.
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

function DrinkColumn({
  label,
  option,
  children,
}: {
  label: string;
  option: LocalizedDrinkOption;
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
  pinnedWine,
  recipeContext,
  lang,
}: {
  pairing: LocalizedDrinkPairing;
  /** Admin-kuratert konkret produkt, se PinnedVinmonopoletProduct sin
   * filheader – når satt, gjør "Finn en konkret vin"-knappen INGEN AI-søk,
   * den viser (og pris-oppdaterer) direkte dette produktet. */
  pinnedWine: PinnedVinmonopoletProduct | null;
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
        if (pinnedWine) {
          // Admin har pinnet et konkret produkt – ingen AI-søk, bare en
          // fersk pris-sjekk mot selve produktsiden (prisen kan ha endret
          // seg siden admin sist lagret den), se filheaderen på
          // PinnedVinmonopoletProduct. Faller tilbake til den lagrede
          // prisen/bildet hvis den ferske sjekken selv skulle feile (f.eks.
          // et midlertidig nettverksproblem), i stedet for å vise en feil
          // for noe admin allerede har bekreftet finnes.
          const resolved = await resolveVinmonopoletProductById(pinnedWine.productId, pinnedWine.url);
          const product = resolved.success && resolved.product ? resolved.product : null;
          setVinResult({
            productName: product?.productName ?? pinnedWine.productName,
            productId: pinnedWine.productId,
            url: product?.url ?? pinnedWine.url,
            imageUrl: product?.imageUrl ?? pinnedWine.imageUrl,
            priceNok: product?.priceNok ?? pinnedWine.priceNok,
            reasoning: pinnedWine.reasoning || t(lang, "wine.pinnedReasoningFallback"),
            confirmed: true,
            searchTerm: "",
            alternates: [],
          });
          return;
        }

        const searchText = drinkOptionSearchText(pairing.wine);
        const result = await getVinmonopoletWineSuggestion(recipeContext, searchText, lang);
        if (!result.confirmed) {
          // Se VinmonopoletSuggestion.confirmed sin filheader – ingen av
          // kandidatene lot seg bekrefte fortsatt i salg. Viser ALDRI en
          // ubekreftet gjetning til besøkende (kun admin sitt
          // kuraterings-UI i RecipeForm.tsx gjør det, med
          // vis-et-annet-forslag/søk-selv-fallback).
          setVinError(t(lang, "wine.vinmonopoletError"));
          return;
        }
        setVinResult(result);
      } catch (err) {
        setVinError(err instanceof Error ? err.message : t(lang, "wine.vinmonopoletError"));
      } finally {
        setVinLoading(false);
      }
    })();
  }

  // Kortet med selve vinforslaget rendres TO steder i markupet under (kun
  // ett av dem synlig av gangen, styrt av hidden/sm:hidden) – lagt til
  // 11.09.2026 etter tilbakemelding fra Henrik: på mobil (der de tre
  // kolonnene stables under hverandre, ikke ligger side om side) endte
  // kortet opp UNDER "Uten alkohol" siden det opprinnelig lå utenfor/etter
  // hele tre-kolonners-blokken i markupet – man måtte scrolle forbi Øl og
  // Uten alkohol for å se resultatet av at man nettopp trykket "Finn en
  // konkret vin", og det så derfor ut som ingenting skjedde. Mobil-kortet
  // ligger nå isteden RETT ETTER Vin-kolonnens innhold (og dermed FØR Øl i
  // rekkefølgen elementene stables i) og er skjult på desktop (sm:hidden);
  // desktop-kortet er uendret (full seksjonsbredde under alle tre
  // kolonnene, skjult på mobil med hidden sm:block) siden Henrik kun nevnte
  // mobil-visningen som et problem.
  const vinResultCard = vinResult && (
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
        {/* Kun ÉN "vis-lenke" her – "Prøv et nytt forslag" fjernet
            11.09.2026 (Henrik: "den gjør ingenting nå siden den
            funksjonen er borte, man får kun ett forslag"). Etter
            admin-kuratert pinnedWine-refaktoreringen samme dag gir
            dette forslaget ALDRI et annet resultat ved et nytt klikk
            (pinnet produkt = fast valg; ellers samme deterministiske
            AI-søk) – knappen ga derfor et falskt inntrykk av at man
            kunne "rulle videre" til noe annet. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            href={vinResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-clay px-3.5 py-2 text-xs font-medium text-cream transition-colors hover:bg-clay-dark"
          >
            {t(lang, "wine.viewProduct")} →
          </a>
        </div>
        <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-faint">{t(lang, "wine.vinmonopoletDisclaimer")}</p>
      </div>
    </div>
  );

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
          {vinResult && <div className="mt-4 sm:hidden">{vinResultCard}</div>}
        </DrinkColumn>

        <DrinkColumn label={t(lang, "drinkPairing.beerLabel")} option={pairing.beer} />
        <DrinkColumn label={t(lang, "drinkPairing.nonAlcoholicLabel")} option={pairing.nonAlcoholic} />
      </div>

      {/* Desktop-visningen: UTENFOR tre-kolonners-rutenettet over med full
       * seksjonsbredde, ikke klemt inn i vin-kolonnens ca. 1/3 bredde –
       * bilde + produkttekst trenger mer luft enn én kolonne gir, og et
       * bredere, rolig "funnet til deg"-kort kjennes dessuten mer elegant
       * enn et trangt sidepanel. Skjult på mobil (se mobil-kortet over). */}
      {vinResult && <div className="mt-6 hidden border-t border-line pt-6 sm:block">{vinResultCard}</div>}
    </div>
  );
}

/** Antall millisekunder den kunstige "sjekker"-forsinkelsen varer før det
 * forhåndsgenererte forslaget avsløres – se filheaderen øverst i denne
 * filen. Bevisst i det korte, men merkbare, sjiktet: lang nok til at det
 * føles som et valg blir tatt, kort nok til at det ikke oppleves tregt. */
const REVEAL_DELAY_MS = 1900;

function DrinkPairingReveal({ drinkPairing, recipeContext, lang }: {
  drinkPairing: DrinkPairing;
  recipeContext: RecipeContext;
  lang: Lang;
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [revealed, setRevealed] = useState(false);

  function handleClick() {
    setIsChecking(true);
    window.setTimeout(() => {
      setIsChecking(false);
      setRevealed(true);
    }, REVEAL_DELAY_MS);
  }

  return (
    <div>
      <h3 className="font-serif text-lg text-ink">{t(lang, "drinkPairing.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "drinkPairing.intro")}</p>

      {!revealed && (
        <button
          type="button"
          onClick={handleClick}
          disabled={isChecking}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {isChecking ? t(lang, "drinkPairing.loading") : t(lang, "drinkPairing.button")}
        </button>
      )}

      {revealed && (
        <DrinkPairingResult
          pairing={localizedDrinkPairing(drinkPairing, lang)}
          pinnedWine={drinkPairing.pinnedWine ?? null}
          recipeContext={recipeContext}
          lang={lang}
        />
      )}
    </div>
  );
}

/** "Passer denne?": gjest skriver inn (eller fotograferer) en vin, får en
 * vurdering mot retten. Generalisert i lib/actions/ai.ts
 * (checkBeverageMatch) – kalles her med beverageKind "wine" siden det er
 * det eneste UI-et støtter i dag, se filheaderen over. UPÅVIRKET av
 * omleggingen til forhåndsgenererte drikkeforslag – dette er fortsatt en
 * ekte, live AI-vurdering for HVER innsending, ingen caching/forhånds-
 * generering (ønsket eksplisitt av Henrik 11.09.2026: "at man skriver inn
 * sin egen vin og tar bilde må naturligvis fortsatt genereres hver gang").
 *
 * withDivider: skiller-linjen (border-t)/toppmargen over denne seksjonen
 * skal kun vises når DrinkPairingReveal faktisk rendret noe over den – uten
 * et generert drikkeforslag er dette den FØRSTE seksjonen i
 * DrinkPairingSection, og skal da ikke ha en løs skillelinje mot ingenting. */
function BeverageMatchChecker({
  recipeContext,
  lang,
  withDivider,
}: {
  recipeContext: RecipeContext;
  lang: Lang;
  withDivider: boolean;
}) {
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
    <div className={withDivider ? "mt-6 border-t border-line pt-6" : undefined}>
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
  drinkPairing,
  showBeverageMatchChecker,
  recipeContext,
  lang,
}: {
  /** Forhåndsgenerert i admin, se filheaderen øverst i denne filen – null
   * når ingen admin har generert (eller skrevet inn for hånd) et
   * drikkeforslag for denne oppskriften ennå. */
  drinkPairing: DrinkPairing | null;
  /** Admin-bryter (recipes.show_beverage_match_checker, default true) – lagt
   * til 11.09.2026 (Henrik: "det gir ikke mening å sjekke ut en vin til
   * cookies liksom"). Skjuler KUN "Passer denne?"-sjekkeren under, ikke det
   * forhåndsgenererte drikkeforslaget over (drinkPairing) – de er bevisst
   * uavhengige, se showMealBuilder i RecipeInteractive.tsx for søsterbryteren. */
  showBeverageMatchChecker: boolean;
  recipeContext: RecipeContext;
  lang: Lang;
}) {
  // Boks-stylingen (rounded-card/border/bg) fjernet 31.08.2026
  // (designforbedring punkt 9/11) – "Drikke til" og "Passer denne?" var
  // allerede slått sammen i koden (én komponent), men fremstod fortsatt
  // som en boks blant flere andre bokser. Nå ett rolig avsnitt i den delte
  // "sekundær info"-flaten i RecipeInteractive.tsx – de to interne
  // border-t-skillelinjene under er beholdt uendret siden de allerede gir
  // riktig visuell inndeling MELLOM de to delfunksjonene.
  //
  // "Drikke til" vises kun når drinkPairing faktisk finnes (se
  // DrinkPairingReveal) – uten det er "Passer denne?" den eneste, FØRSTE
  // seksjonen her, og skal derfor ikke ha en skillelinje over seg mot
  // ingenting (withDivider). Renderer ingenting i det hele tatt når verken
  // drinkPairing eller "Passer denne?" er aktuelt – da skal RecipeInteractive
  // også hoppe over selve py-10-båndet, se recipe.showBeverageMatchChecker
  // der (unngår en tom seksjon med kun en stray skillelinje).
  if (!drinkPairing && !showBeverageMatchChecker) return null;
  return (
    <div>
      {drinkPairing && (
        <DrinkPairingReveal drinkPairing={drinkPairing} recipeContext={recipeContext} lang={lang} />
      )}
      {showBeverageMatchChecker && (
        <BeverageMatchChecker recipeContext={recipeContext} lang={lang} withDivider={drinkPairing != null} />
      )}
    </div>
  );
}
