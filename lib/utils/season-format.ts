import type { IngredientOrigin, IngredientOriginGroup, Season, SeasonalIngredient } from "@/lib/types";
import {
  effectivePeakRange,
  effectiveSeasonRange,
  monthsToRange,
  type IngredientStatus,
} from "@/lib/kitchen-intelligence/seasonal";

/**
 * Samme "no/en med fallback til norsk"-mønster som localizedGuideIntro osv.
 * i lib/utils/guide-format.ts, bare for sesong-/sesonginnholdets egne felter
 * (nameNo/nameEn, introNo/introEn, descriptionNo/descriptionEn).
 *
 * Utvidet 28.08.2026 med formattering for det tre-lags tidsbegrepet
 * (seasonNoteNo/En, statuslabel, gruppelabel, opprinnelseslabel) – se
 * filheaderen til SeasonalIngredient i lib/types.ts.
 */

export function localizedSeasonName(season: Pick<Season, "nameNo" | "nameEn">, lang: "no" | "en" = "no"): string {
  return lang === "en" && season.nameEn ? season.nameEn : season.nameNo;
}

export function localizedSeasonIntro(season: Pick<Season, "introNo" | "introEn">, lang: "no" | "en" = "no"): string {
  return lang === "en" && season.introEn ? season.introEn : season.introNo;
}

export function localizedIngredientName(
  ingredient: Pick<SeasonalIngredient, "nameNo" | "nameEn">,
  lang: "no" | "en" = "no",
): string {
  return lang === "en" && ingredient.nameEn ? ingredient.nameEn : ingredient.nameNo;
}

export function localizedIngredientDescription(
  ingredient: Pick<SeasonalIngredient, "descriptionNo" | "descriptionEn">,
  lang: "no" | "en" = "no",
): string | null {
  return lang === "en" && ingredient.descriptionEn ? ingredient.descriptionEn : ingredient.descriptionNo;
}

/** Den lengre, kildebaserte "hvorfor"-teksten (spesifikasjonens punkt
 * 18/24) – kun vist på råvaresiden, aldri i oversiktslisten. */
export function localizedIngredientSeasonNote(
  ingredient: Pick<SeasonalIngredient, "seasonNoteNo" | "seasonNoteEn">,
  lang: "no" | "en" = "no",
): string | null {
  return lang === "en" && ingredient.seasonNoteEn ? ingredient.seasonNoteEn : ingredient.seasonNoteNo;
}

const MONTH_NAMES: Record<"no" | "en", string[]> = {
  no: [
    "januar",
    "februar",
    "mars",
    "april",
    "mai",
    "juni",
    "juli",
    "august",
    "september",
    "oktober",
    "november",
    "desember",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

/** Ett enkelt "<fra>–<til>" (eller bare "<måned>" hvis start===end) –
 * byggesteinen seasonMonthRangeLabel() og råvaresidens
 * sesong-/peak-etiketter bruker. */
export function monthRangeLabel(start: number, end: number, lang: "no" | "en" = "no"): string {
  const names = MONTH_NAMES[lang];
  if (start === end) return names[start - 1];
  return `${names[start - 1]}–${names[end - 1]}`;
}

export function monthName(month: number, lang: "no" | "en" = "no"): string {
  return MONTH_NAMES[lang][month - 1];
}

/** Rolig, redaksjonell månedsetikett ("oktober–november", "juni") for en
 * sesong – IKKE forkortelser (de er fine i den tette admin-listen, men for
 * lange/upassende i brødtekst på en offentlig side). Bruker
 * monthsToRange() fra lib/kitchen-intelligence/seasonal.ts, som håndterer
 * perioder som pakker rundt årsskiftet korrekt (f.eks. Vinter [12, 1, 2]
 * blir "desember–februar", ikke en tilfeldig kommaseparert liste). */
export function seasonMonthRangeLabel(months: number[], lang: "no" | "en" = "no"): string {
  const range = monthsToRange(months);
  if (!range) return "";
  return monthRangeLabel(range.start, range.end, lang);
}

const GROUP_LABELS: Record<IngredientOriginGroup, Record<"no" | "en", string>> = {
  havet: { no: "Fra havet", en: "From the sea" },
  skogen: { no: "Fra skogen", en: "From the forest" },
  jorda: { no: "Fra jorda", en: "From the ground" },
  hagen: { no: "Fra hagen", en: "From the garden" },
  beite: { no: "Fra beite", en: "From pasture" },
};

/** Redaksjonell visningsgruppe-etikett ("FRA HAVET" osv, spesifikasjonens
 * punkt 5/38) – rendres med CSS uppercase/tracking i komponentene, så selve
 * strengen holdes i vanlig store/små bokstaver her. */
export function originGroupLabel(group: IngredientOriginGroup, lang: "no" | "en" = "no"): string {
  return GROUP_LABELS[group][lang];
}

const ORIGIN_LABELS: Record<IngredientOrigin, Record<"no" | "en", string>> = {
  norwegian: { no: "Norsk", en: "Norwegian" },
  imported: { no: "Importert", en: "Imported" },
};

/** Diskret opprinnelses-etikett (spesifikasjonens punkt 6/15) – IKKE ment
 * som tung metadata i oversikten, kun en liten detalj på råvaresiden som
 * hindrer at f.eks. blodappelsin fremstår som norsk. */
export function ingredientOriginLabel(origin: IngredientOrigin, lang: "no" | "en" = "no"): string {
  return ORIGIN_LABELS[origin][lang];
}

const STATUS_LABELS: Record<IngredientStatus["kind"], Record<"no" | "en", string>> = {
  peak: { no: "På sitt beste nå", en: "At its best now" },
  "in-season": { no: "I sesong nå", en: "In season now" },
  "next-season": { no: "Utenfor sesong", en: "Out of season" },
};

const AT_ITS_BEST_IN: Record<"no" | "en", string> = { no: "på sitt beste i", en: "at its best in" };
const IN_SEASON_IN: Record<"no" | "en", string> = { no: "i sesong i", en: "in season in" };

/** Statusetikett for "akkurat nå" (spesifikasjonens punkt 29/33) – ALDRI
 * hardkodet per råvare, alltid utledet fra computeIngredientStatus() i
 * lib/kitchen-intelligence/seasonal.ts.
 *
 * Fire runder justering 28.08.2026: først fjernet vi sesongtaggene
 * ("Sensommer · Høst") OG "i sesong nå"/"neste sesong"-ordene helt, og lot
 * linjen bare svare på "når er den på sitt beste?". Henrik påpekte at det
 * da ikke lenger sto NOE sted at råvaren faktisk ER i sesong akkurat nå.
 * Løsningen ble å kombinere begge igjen: "i sesong nå"/"utenfor sesong"
 * forteller OM den er tilgjengelig nå i det hele tatt, "på sitt beste i
 * <måned>" forteller når den er aller best.
 *
 * FJERDE runde – `isLive`: en råvare som vises på en sesongside via
 * flersesong-overlappet (ingredientAppliesToSeasonPage, IKKE dens egen
 * hjemme-sesong) kunne likevel vise "PÅ SITT BESTE NÅ"/"UTENFOR SESONG" der
 * selv om DEN SESONGEN ikke er den vi faktisk er i akkurat nå (f.eks.
 * makrell, hjemme i Forsommer men med et vindu som også dekker mai og
 * dermed vises på VÅR-siden, viste "PÅ SITT BESTE NÅ" der i AUGUST – sant
 * for makrell, men villedende plassert på en VÅR-side når det ikke er vår).
 * `isLive` = er DENNE sesongsiden (season.months) den vi faktisk er i nå
 * (satt av kalleren, se `isCurrent` i app/sesong/[slug]/page.tsx). Når
 * `isLive` er false brukes ALDRI "nå"-ord ("i sesong nå"/"utenfor sesong"/
 * kind-basert farge).
 *
 * FEMTE runde – `homeSeasonMonths`: på en ikke-live side viste linjen
 * FØR dette KUN peak-vinduet ("på sitt beste i juni–august"), uten noen
 * forklaring på hvorfor råvaren i det hele tatt står oppført der (Henriks
 * eksempel: salat under Vår (mars–mai), der linjen bare sa "på sitt beste i
 * juni–august" – ingenting knyttet den til våren i det hele tatt, forvirrende
 * siden peak-vinduet ligger utenfor Vår sine egne måneder). Løsningen er å
 * ALLTID lede med råvarens EFFEKTIVE sesongvindu ("i sesong i mai–september")
 * før et eventuelt peak-vindu – salat sitt sesongvindu starter jo i mai, som
 * er den siste våren-måneden, og DET er grunnen til at den står under Vår.
 * `homeSeasonMonths` trengs kun som fallback for råvarer uten eget eksplisitt
 * seasonStartMonth/EndMonth (se effectiveSeasonRange()), og ignoreres helt
 * når `isLive` er true. */
export function ingredientStatusLabel(
  ingredient: SeasonalIngredient,
  status: IngredientStatus,
  lang: "no" | "en" = "no",
  isLive = true,
  homeSeasonMonths: number[] = [],
): string | null {
  const peakRange = effectivePeakRange(ingredient);

  if (!isLive) {
    const seasonRange = effectiveSeasonRange(ingredient, homeSeasonMonths);
    const samePeakAsSeason =
      peakRange && seasonRange && peakRange.start === seasonRange.start && peakRange.end === seasonRange.end;

    const parts: string[] = [];
    if (seasonRange) {
      parts.push(`${IN_SEASON_IN[lang]} ${monthRangeLabel(seasonRange.start, seasonRange.end, lang)}`);
    }
    if (peakRange && !samePeakAsSeason) {
      parts.push(`${AT_ITS_BEST_IN[lang]} ${monthRangeLabel(peakRange.start, peakRange.end, lang)}`);
    }
    if (parts.length === 0) return null;

    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(". ");
  }

  if (status.kind === "peak") return STATUS_LABELS.peak[lang];

  const base = STATUS_LABELS[status.kind][lang];

  if (peakRange) {
    return `${base} · ${AT_ITS_BEST_IN[lang]} ${monthRangeLabel(peakRange.start, peakRange.end, lang)}`;
  }

  if (status.kind === "next-season") {
    return `${base} · ${monthName(status.startMonth, lang)}`;
  }
  return base;
}
