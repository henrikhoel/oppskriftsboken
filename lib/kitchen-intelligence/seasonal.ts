import type {
  IngredientOriginGroup,
  Season,
  SeasonWithIngredients,
  SeasonalIngredient,
} from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";

/**
 * DETERMINISTISK sesongmotor for "I sesong" (spesifikasjon punkt 9-14, og
 * det utvidede tre-lags datamodellen fra 28.08.2026, se filheaderen til
 * SeasonalIngredient i lib/types.ts). Ingen AI her: "hvilken sesong er det
 * nå", "er denne råvaren i sesong/på sitt beste/neste sesong" og
 * "hvilke råvarer hører hjemme på denne sesongsiden" er ren datoregning mot
 * lib/data/seasons.ts sitt datasett. Matching mot oppskrift-ingredienser er
 * samme normaliser+substring-mønster som ingredientMatches() i
 * pantry-match.ts. AI brukes ALDRI til å avgjøre sesong eller generere
 * sesongtekst per visning (spesifikasjon punkt 27: søket er strukturert og
 * lokalt, ikke AI-drevet) – kun de faste, admin-skrevne tekstene fra
 * Season/SeasonalIngredient vises.
 *
 * VIKTIG: all månedsvindu-logikk under er bevisst skrevet for å håndtere
 * perioder som pakker rundt årsskiftet (f.eks. hummer okt->mars,
 * vinter des->feb) UTEN å bruke naiv `month >= start && month <= end`, som
 * knekker akkurat i det tilfellet – se expandMonthsInRange()/
 * findNextMonthInSet() under (spesifikasjonens punkt 8).
 */

/* ─────────────────────── Månedsvindu-hjelpere (årsskifte-trygge) ─────────────────────── */

/** Alle måneder (1-12) fra `start` til `end`, i rekkefølge, med wraparound
 * dersom `start > end` (f.eks. expandMonthsInRange(11, 2) = [11, 12, 1, 2]).
 * Cappet til maks 12 iterasjoner som ren sikkerhetsmargin mot en evig
 * løkke – kan aldri faktisk nås siden vi alltid bryter når vi treffer
 * `end`. */
export function expandMonthsInRange(start: number, end: number): number[] {
  const result: number[] = [];
  let m = start;
  for (let i = 0; i < 12; i++) {
    result.push(m);
    if (m === end) break;
    m = m === 12 ? 1 : m + 1;
  }
  return result;
}

/** Finner neste måned (strengt etter `fromMonth`, med wraparound) som
 * finnes i `months` – grunnlaget for "NESTE SESONG: januar"
 * (spesifikasjonens punkt 29/42). Returnerer `fromMonth` selv (aldri null)
 * dersom `months` er tom, som en ufarlig fallback appen ikke skal kunne
 * krasje på – skjer ikke i praksis siden en råvare alltid har enten et
 * eget sesongvindu eller foreldre-sesongens måneder. */
export function findNextMonthInSet(months: number[], fromMonth: number): number {
  if (months.length === 0) return fromMonth;
  for (let i = 1; i <= 12; i++) {
    const candidate = ((fromMonth - 1 + i) % 12) + 1;
    if (months.includes(candidate)) return candidate;
  }
  return fromMonth;
}

/** Gjør en (ikke nødvendigvis sortert) liste kalendermåneder om til et
 * [start, end]-par for VISNING (f.eks. "Desember-februar"). Antar at
 * listen er sammenhengende – evt. rundt årsskiftet – som de håndskrevne
 * Season.months-settene alltid er (se filheaderen til Season i
 * lib/types.ts). Finner startpunktet som det ENE elementet hvis forgjenger
 * (med wrap) IKKE er med i settet, og tilsvarende for sluttpunktet. */
export function monthsToRange(months: number[]): { start: number; end: number } | null {
  if (months.length === 0) return null;
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 1) return { start: sorted[0], end: sorted[0] };
  const set = new Set(sorted);
  const start = sorted.find((m) => !set.has(m === 1 ? 12 : m - 1)) ?? sorted[0];
  const end = sorted.find((m) => !set.has(m === 12 ? 1 : m + 1)) ?? sorted[sorted.length - 1];
  return { start, end };
}

/** Råvarens EFFEKTIVE sesongvindu for visning/statusberegning: dens eget
 * seasonStart/EndMonth hvis satt, ellers foreldre-sesongens måneder
 * omgjort til et [start, end]-par – se filheaderen til SeasonalIngredient
 * i lib/types.ts for hvorfor dette er to atskilte kilder. */
export function effectiveSeasonRange(
  ingredient: SeasonalIngredient,
  homeSeasonMonths: number[],
): { start: number; end: number } | null {
  if (ingredient.seasonStartMonth != null && ingredient.seasonEndMonth != null) {
    return { start: ingredient.seasonStartMonth, end: ingredient.seasonEndMonth };
  }
  return monthsToRange(homeSeasonMonths);
}

/** Råvarens EFFEKTIVE topp-vindu – kun satt dersom peakStart/EndMonth
 * eksplisitt er fylt ut. `null` = ingen dedikert peak, råvaren får ALDRI
 * "PÅ SITT BESTE NÅ" (bevisst konservativt, spesifikasjonens punkt 34). */
export function effectivePeakRange(
  ingredient: SeasonalIngredient,
): { start: number; end: number } | null {
  if (ingredient.peakStartMonth != null && ingredient.peakEndMonth != null) {
    return { start: ingredient.peakStartMonth, end: ingredient.peakEndMonth };
  }
  return null;
}

/* ─────────────────────────── Status "akkurat nå" ─────────────────────────── */

/** De tre statusene en råvare kan ha "akkurat nå" (spesifikasjonens punkt
 * 29/33) – ALDRI hardkodet per sesongside, alltid beregnet fra dagens dato
 * + råvarens egne vinduer. `startMonth` på "next-season" er måneden
 * sesongen faktisk begynner (brukt som fallback dersom råvaren ikke har et
 * eget peak-vindu). `peakRange` på "in-season"/"next-season" er råvarens
 * EFFEKTIVE topp-vindu (samme som effectivePeakRange() ville gitt) –
 * lagret her rett fra beregningen slik at ingredientStatusLabel() i
 * lib/utils/season-format.ts kan svare på "når ER den på sitt beste da?"
 * (Henriks eksplisitte ønske 28.08.2026: rådende ELLER kommende peak-vindu
 * skal alltid vises når råvaren ikke ER på sitt beste akkurat nå, IKKE bare
 * "neste sesong starter i september" – sesongstart og peak-start er ofte
 * forskjellige måneder, se f.eks. jordskokk: sesong okt->mars, peak nov-des). */
export type IngredientStatus =
  | { kind: "peak" }
  | { kind: "in-season"; peakRange: { start: number; end: number } | null }
  | { kind: "next-season"; startMonth: number; peakRange: { start: number; end: number } | null };

/** Beregner IngredientStatus for én råvare på en gitt dato. Peak vinner
 * over vanlig sesong (en råvare på sitt eget toppunkt er alltid også "i
 * sesong"). Bruker expandMonthsInRange() gjennomgående, så perioder som
 * pakker rundt årsskiftet (skjell, hummer, vinter) håndteres korrekt uten
 * spesialtilfeller her. */
export function computeIngredientStatus(
  ingredient: SeasonalIngredient,
  homeSeasonMonths: number[],
  date: Date,
): IngredientStatus {
  const month = date.getMonth() + 1;

  const peakRange = effectivePeakRange(ingredient);
  const peakMonths = peakRange ? expandMonthsInRange(peakRange.start, peakRange.end) : [];
  if (peakMonths.includes(month)) return { kind: "peak" };

  const seasonRange = effectiveSeasonRange(ingredient, homeSeasonMonths);
  const seasonMonths = seasonRange ? expandMonthsInRange(seasonRange.start, seasonRange.end) : [];
  if (seasonMonths.includes(month)) return { kind: "in-season", peakRange };

  return { kind: "next-season", startMonth: findNextMonthInSet(seasonMonths, month), peakRange };
}

/* ─────────────────────────── Hvilken sesong er det nå ─────────────────────────── */

/** Hvilken av de gitte sesongene inneholder `date` sin kalendermåned – null
 * dersom ingen publisert sesong dekker akkurat denne måneden (robusthet,
 * spesifikasjon punkt 20: kan skje midlertidig hvis admin har endret
 * sesong-inndelingen og etterlatt et hull; UI-et skal da vise en nøytral
 * "ingen sesonginnhold akkurat nå"-tilstand i stedet for å krasje eller
 * gjette). Ved (i praksis unormalt) overlapp mellom to sesongers `months`
 * vinner den med lavest sortOrder. */
export function resolveCurrentSeason<T extends { months: number[]; sortOrder: number }>(
  seasons: T[],
  date: Date,
): T | null {
  const month = date.getMonth() + 1;
  const matches = seasons.filter((s) => s.months.includes(month));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

/* ─────────────────────────── Flersesong-visning ─────────────────────────── */

/** Redaksjonell visningsrekkefølge for originGroup-seksjonene på
 * sesongsidene (spesifikasjonens punkt 5/20/38) – kun grupper som faktisk
 * har innhold for den aktuelle sesongen vises, se
 * groupIngredientsByOriginGroup() under. */
export const ORIGIN_GROUP_ORDER: IngredientOriginGroup[] = ["havet", "skogen", "jorda", "hagen", "beite"];

/** Skal denne råvaren vises på DENNE sesongsiden? Sant dersom det er
 * råvarens "hjemme"-sesong, ELLER dersom råvaren har et eget, eksplisitt
 * seasonStart/EndMonth som overlapper sesongens `months` – dette er
 * mekanismen som lar f.eks. makrell (hjemme i Forsommer, men eget vindu
 * mai->oktober) også vises på Sommer- og Sensommer-sidene, se filheaderen
 * til SeasonWithIngredients i lib/types.ts. En råvare UTEN eget vindu vises
 * KUN på sin hjemme-sesongside (bevisst – ingen implisitt spredning). */
export function ingredientAppliesToSeasonPage(ingredient: SeasonalIngredient, season: Season): boolean {
  if (ingredient.seasonId === season.id) return true;
  if (ingredient.seasonStartMonth == null || ingredient.seasonEndMonth == null) return false;
  const ingredientMonths = expandMonthsInRange(ingredient.seasonStartMonth, ingredient.seasonEndMonth);
  return ingredientMonths.some((m) => season.months.includes(m));
}

export interface SeasonPageIngredient {
  ingredient: SeasonalIngredient;
  status: IngredientStatus;
}

/** Alle råvarer (fra HELE datasettet, ikke bare season.ingredients) som
 * hører hjemme på denne ene sesongsiden, med ferdig beregnet status. Dette
 * er datagrunnlaget app/sesong/[slug]/page.tsx grupperer på originGroup og
 * viser (progressive disclosure – kun navn + evt. peak-merke på selve
 * oversikten, se komponentene i components/season/).
 *
 * HVEM som vises her er REN KALENDER-STRUKTUR, aldri avhengig av `date`
 * (dagens faktiske dato) – kun ingredientAppliesToSeasonPage() over (hjemme-
 * sesong ELLER at råvarens eget sesongvindu overlapper DENNE sesongens
 * måneder). Dette var IKKE alltid slik: en tidligere runde (28.08.2026)
 * filtrerte bort råvarer med status "next-season" beregnet mot dagens dato
 * – som virket riktig for en enkelt-dag ("hva er faktisk i sesong akkurat
 * nå"), men er FEIL for denne siden, som Henrik presiserte er en
 * tidløs REFERANSE over alle sesonger ("det skal ikke ha noe å si hvor
 * langt unna en sesong er akkurat nå"). Konkret eksempel: blåskjell er
 * hjemme i Høst, men har topp november-februar – går man inn på
 * Vinter-siden en dag i JUNI, skal blåskjell likevel stå der (det er tross
 * alt DA den er på sitt beste), ikke bare i det korte vinduet der dagens
 * dato tilfeldigvis overlapper. `status` beregnes fortsatt (mot `date`) og
 * sendes med her – den brukes utelukkende til SELVE TEKSTEN/merket lenger
 * ned i visningskjeden (isLiveSeason-styrt, se ingredientStatusLabel() i
 * lib/utils/season-format.ts), aldri til om råvaren i det hele tatt vises. */
export function resolveIngredientsForSeasonPage(
  season: Season,
  allIngredients: SeasonalIngredient[],
  date: Date,
): SeasonPageIngredient[] {
  return allIngredients
    .filter((ingredient) => ingredientAppliesToSeasonPage(ingredient, season))
    .map((ingredient) => ({
      ingredient,
      status: computeIngredientStatus(ingredient, season.months, date),
    }))
    .sort((a, b) => a.ingredient.sortOrder - b.ingredient.sortOrder);
}

/** Grupperer en liste allerede-statusberegnede råvarer på originGroup
 * ("FRA HAVET" osv). Tomme grupper er bevisst utelatt fra resultatet – kun
 * gruppene som faktisk har innhold for sesongen skal vises
 * (spesifikasjonens punkt 5: "Bruk kun grupper som faktisk gir mening for
 * den aktuelle sesongen"). Iterer ORIGIN_GROUP_ORDER for riktig rekkefølge. */
export function groupIngredientsByOriginGroup(
  items: SeasonPageIngredient[],
): Array<{ group: IngredientOriginGroup; items: SeasonPageIngredient[] }> {
  const byGroup = new Map<IngredientOriginGroup, SeasonPageIngredient[]>();
  for (const item of items) {
    const list = byGroup.get(item.ingredient.originGroup);
    if (list) {
      list.push(item);
    } else {
      byGroup.set(item.ingredient.originGroup, [item]);
    }
  }
  return ORIGIN_GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
    group,
    items: byGroup.get(group)!,
  }));
}

/* ─────────────────────────── "I sesong nå" (på tvers av alt) ─────────────────────────── */

export interface InSeasonIngredient {
  ingredient: SeasonalIngredient;
  seasonId: string;
  /** Sant dersom råvaren er på sitt EGET toppunkt akkurat nå (status
   * "peak"), fremfor bare "in-season". Brukes til å vekte sesongbonusen i
   * lib/kitchen-intelligence/what-to-eat.ts (en råvare på sitt EGNE
   * toppunkt teller mer enn en som bare tilhører riktig sesong). */
  isPeakNow: boolean;
}

/** Alle "hjemme"-råvarer (én per sesong sitt eget season.ingredients, ikke
 * flersesong-overlappet – det er hva som trengs her: en global "hva er
 * godt nå"-liste, ikke "hva vises på denne siden") som enten er i sesong
 * eller på sitt beste akkurat nå. Dette er datasettet forsideteaseren
 * (SeasonTeaser) og sesongbonusen i what-to-eat.ts bruker. */
export function resolveInSeasonIngredients(seasons: SeasonWithIngredients[], date: Date): InSeasonIngredient[] {
  const result: InSeasonIngredient[] = [];

  for (const season of seasons) {
    for (const ingredient of season.ingredients) {
      const status = computeIngredientStatus(ingredient, season.months, date);
      if (status.kind === "next-season") continue;
      result.push({ ingredient, seasonId: season.id, isPeakNow: status.kind === "peak" });
    }
  }

  return result.sort((a, b) => a.ingredient.sortOrder - b.ingredient.sortOrder);
}

/* ─────────────────────────── Tekstmatching (søk + oppskrift-kobling) ─────────────────────────── */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Samme bidireksjonelle substring-matching som ingredientMatches() i
 * pantry-match.ts, men sjekket mot BÅDE råvarens navn og dens aliases (se
 * filheaderen til SeasonalIngredient i lib/types.ts). */
function seasonalIngredientMatches(recipeIngredientName: string, seasonal: SeasonalIngredient): boolean {
  const r = normalize(recipeIngredientName);
  if (r.length < 2) return false;
  const candidates = [seasonal.nameNo, seasonal.nameEn ?? "", ...seasonal.aliases];
  return candidates.some((c) => {
    const n = normalize(c);
    return n.length >= 2 && (r.includes(n) || n.includes(r));
  });
}

/** Enkelt, LOKALT normalisert substring-søk over hele råvaredatasettet –
 * ingen AI, ingen server-runde per tastetrykk (spesifikasjonens punkt 27).
 * Fanger vanlige norske entall/flertall-varianter (f.eks. "kantarell" vs
 * "kantareller") fordi normalize()+toveis-substring i seg selv dekker de
 * fleste norske endelsene, og fordi aliases-feltet lar admin legge inn
 * flere skriveformer eksplisitt for de tilfellene det ikke gjør (f.eks.
 * "blåskjell"/"blåskjellene"). Bevisst IKKE en fuzzy-søkemotor med
 * redigeringsavstand e.l. – ikke nødvendig for et datasett i denne
 * størrelsesordenen, se spesifikasjonens eksplisitte advarsel mot å bygge
 * et større søkesystem enn nødvendig. */
export function searchIngredients(allIngredients: SeasonalIngredient[], query: string): SeasonalIngredient[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  return allIngredients.filter((ingredient) => {
    const candidates = [ingredient.nameNo, ingredient.nameEn ?? "", ...ingredient.aliases];
    return candidates.some((c) => {
      const n = normalize(c);
      return n.length >= 2 && (n.includes(q) || q.includes(n));
    });
  });
}

export interface RecipeSeasonalMatch {
  ingredient: SeasonalIngredient;
  isPeakNow: boolean;
}

/** Hvilke av de gitte "i sesong nå"-råvarene finnes i denne oppskriftens
 * ingrediensliste – grunnlaget for det subtile "I SESONG"-merket
 * (spesifikasjon punkt 12) og sesongbonusen i what-to-eat.ts. Bevisst
 * samme svake, fritekst-baserte matching som resten av appen (ingen
 * ingrediens-masterliste finnes, se pantry-match.ts sin filheader) – noen
 * få falske positiver/negativer er en akseptert avveining her også. */
export function matchRecipeToSeasonalIngredients(
  ingredientNames: string[],
  inSeasonIngredients: InSeasonIngredient[],
): RecipeSeasonalMatch[] {
  const matches: RecipeSeasonalMatch[] = [];
  for (const { ingredient, isPeakNow } of inSeasonIngredients) {
    const found = ingredientNames.some((name) => seasonalIngredientMatches(name, ingredient));
    if (found) matches.push({ ingredient, isPeakNow });
  }
  return matches;
}

/** Motsatt retning av matchRecipeToSeasonalIngredients over: for hver
 * "i sesong nå"-råvare, hvilke oppskrifter inneholder den – grunnlaget for
 * den subtile "OPPSKRIFTER MED X"-listen på råvaresiden (spesifikasjonens
 * punkt 30, bevisst konservativ matching – punkt 30/31). Går gjennom hver
 * oppskrift ÉN gang (ikke ett søk per råvare) og bygger et kart
 * råvare-id -> oppskrifter, avkortet til `limitPerIngredient`. */
export function findRecipesForInSeasonIngredients(
  recipes: SearchableRecipe[],
  inSeasonIngredients: InSeasonIngredient[],
  limitPerIngredient = 3,
): Map<string, SearchableRecipe[]> {
  const byIngredientId = new Map<string, SearchableRecipe[]>();
  for (const recipe of recipes) {
    const matches = matchRecipeToSeasonalIngredients(recipe.ingredientNames, inSeasonIngredients);
    for (const { ingredient } of matches) {
      const existing = byIngredientId.get(ingredient.id) ?? [];
      if (existing.length >= limitPerIngredient) continue;
      existing.push(recipe);
      byIngredientId.set(ingredient.id, existing);
    }
  }
  return byIngredientId;
}

/** Hvilke oppskrifter inneholder ÉN gitt råvare – brukes direkte på
 * råvaredetaljsiden (spesifikasjonens punkt 22/30), som viser nøyaktig én
 * råvare om gangen og derfor ikke trenger det samlede kartet over. Samme
 * konservative matching som seasonalIngredientMatches() – ingen falske
 * treff bare fordi ordet forekommer et tilfeldig sted (punkt 30). */
export function findRecipesForIngredient(
  recipes: SearchableRecipe[],
  ingredient: SeasonalIngredient,
  limit = 12,
): SearchableRecipe[] {
  const matches: SearchableRecipe[] = [];
  for (const recipe of recipes) {
    if (matches.length >= limit) break;
    const found = recipe.ingredientNames.some((name) => seasonalIngredientMatches(name, ingredient));
    if (found) matches.push(recipe);
  }
  return matches;
}
