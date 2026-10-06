import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
import { parseAmount } from "@/lib/utils/scale";
import { generateId } from "@/lib/utils/id";
import { normalizeUnit as classifyMetricUnit, metricUnitToBaseFactor, type MetricUnitKind } from "@/lib/utils/units";
import {
  resolvePurchaseLine,
  classifyCitrusLine,
  classifyGarlicLine,
  classifyEggLine,
  computeCitrusGroupPurchaseCount,
  computeGarlicPurchaseCount,
  computeEggGroupPurchaseCount,
  parseQuantityValue,
  addQuantities,
  upperBound,
  CITRUS_YIELDS,
  normalizeAliasKey,
  FRESH_HERB_PART_UNIT_EXEMPT_IDS,
  convertToPreferredBase,
  type ParsedQuantity,
} from "@/lib/utils/purchase-engine";

/**
 * Normaliserer et ingrediensnavn for sammenligning ("Parmesan, revet" og
 * "parmesan" skal kunne gjenkjennes som samme vare), uten å være så
 * aggressiv at ulike ingredienser slås sammen ved en feil.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9æøå\s]/g, "")
    .trim();
}

function normalizeUnit(unit: string | null): string {
  if (!unit) return "";
  // Fjerner et ev. avsluttende punktum ("stk." -> "stk") – samme mønster som
  // lib/utils/units.ts sin egen normalizeUnit. Uten dette ble "stk" og
  // "stk." (begge finnes i reelle oppskrifter, avhengig av om admin/AI-en
  // skrev forkortelsen med eller uten punktum) behandlet som to ULIKE
  // enheter – både her (DISCRETE_COUNT_UNITS-sjekken i formatShoppingAmount
  // traff aldri "stk." – se tilbakemelding 27.08.2026, "0.5 stk. rødløk" ble
  // ikke rundet opp) og i selve sammenslåingen i mergeIngredientsIntoList
  // (to linjer med "stk"/"stk." for samme vare ble aldri slått sammen).
  return unit.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * SAMMENSLÅINGS-NØKKEL (05.10.2026, Henrik: "den må forstå at gulrot og
 * gulrøtter er det samme") – en LØSERE normalisering brukt KUN for å
 * avgjøre om to handlelistelinjer er "samme vare" ved sammenslåing i
 * mergeIngredientsIntoList under. Helt separat fra normalizeName over, som
 * fortsatt brukes direkte andre steder (isPantryStaple,
 * categorizeShoppingItem) – der skal "gulrot" og "gulrøtter" fortsatt
 * kunne gjenkjennes HVER FOR SEG, det er ikke et sammenslåingsspørsmål der.
 * Påvirker ALDRI selve visningsnavnet (`name` settes kun ved FØRSTE
 * tilføyelse av en linje, se mergeIngredientsIntoList) – kun hvilke linjer
 * som regnes som samme vare og dermed telles sammen.
 *
 * To lag:
 *  1) IRREGULAR_PLURAL_ALIASES – en kort, eksplisitt liste over kjente
 *     UREGELMESSIGE norske flertallsformer for vanlige råvarer (flertall
 *     er IKKE en enkel "+er" på stammen – "gulrot" -> "gulrøtter", ikke
 *     "gulroter"). Utvides etter hvert som nye tilfeller dukker opp i
 *     praksis, samme prinsipp som CATEGORY_KEYWORDS/PANTRY_STAPLE_PATTERNS.
 *  2) stripRegularPluralSuffix – dekker det store flertallet av norske
 *     substantiv, der flertall faktisk ER en enkel "+er"/"+ene"-endelse
 *     ("tomat"/"tomater", "potet"/"poteter", "nøtt"/"nøtter").
 */
const IRREGULAR_PLURAL_ALIASES: Record<string, string> = {
  gulrøtter: "gulrot",
};

function stripRegularPluralSuffix(normalized: string): string {
  if (normalized.endsWith("ene") && normalized.length > 5) return normalized.slice(0, -3);
  if (normalized.endsWith("er") && normalized.length > 4) return normalized.slice(0, -2);
  return normalized;
}

function mergeNameKey(name: string): string {
  const normalized = normalizeName(name);
  return IRREGULAR_PLURAL_ALIASES[normalized] ?? stripRegularPluralSuffix(normalized);
}

/**
 * "DEL AV EN HELHET"-SAMMENSLÅING (05.10.2026, Henrik, med skjermbilde:
 * "her forstår den ikke at 1 fedd hvitløk og hvitløksfedd er det samme") –
 * samme vare skrives i praksis på to ulike måter: med enheten skrevet UT
 * ("N fedd hvitløk", unit="fedd" eller en kvalifisert variant som "lite
 * fedd"/"store fedd") ELLER som ETT sammensatt ord i selve navnefeltet,
 * uten egen enhet ("N hvitløksfedd", unit=null). mergeNameKey over alene
 * fanger ikke dette – "hvitløk" og "hvitløksfedd" er to helt ulike
 * normaliserte strenger. PART_UNIT_CANONICAL/detectPartUnit under
 * gjenkjenner enhets-varianten (også med kvalifiserende ord foran, derfor
 * \b${ord}\b-søk i STRENGEN, ikke et eksakt sett-oppslag),
 * COMPOUND_PART_UNIT_NAME_ALIASES dekker den sammensatte navne-varianten –
 * begge løses til samme kanoniske nøkkel ("fedd:hvitløk") av mergeIdentity,
 * som brukes i stedet for mergeNameKey alene ved selve sammenligningen i
 * mergeIngredientsIntoList. Samme "blader/fedd/kvist/båt"-begrep som
 * WHOLE_ITEM_PART_UNITS lenger ned i filen (der for VISNING – kollapser
 * til "1 <navn>" – her for SAMMENSLÅING av to ulike skrivemåter).
 */
const PART_UNIT_CANONICAL: Record<string, string> = {
  blad: "blad",
  blader: "blad",
  leaf: "blad",
  leaves: "blad",
  fedd: "fedd",
  clove: "fedd",
  cloves: "fedd",
  kvist: "kvist",
  kvister: "kvist",
  sprig: "kvist",
  sprigs: "kvist",
  båt: "båt",
  båter: "båt",
  wedge: "båt",
  wedges: "båt",
};

function detectPartUnit(unit: string | null): string | null {
  const normalizedUnit = normalizeUnit(unit);
  if (!normalizedUnit) return null;
  for (const [word, canonical] of Object.entries(PART_UNIT_CANONICAL)) {
    if (new RegExp(`\\b${word}\\b`).test(normalizedUnit)) return canonical;
  }
  return null;
}

/** Kort, eksplisitt liste (samme utvidelsesprinsipp som
 * IRREGULAR_PLURAL_ALIASES over) over kjente sammensatte entallsord som
 * egentlig er "{grunnord} + {del-enhet}" skrevet som ETT ord uten egen
 * enhet. Utvides etter hvert som nye tilfeller dukker opp i praksis. */
const COMPOUND_PART_UNIT_NAME_ALIASES: Record<string, { unit: string; base: string }> = {
  hvitløksfedd: { unit: "fedd", base: "hvitløk" },
};

/** Kanonisk sammenslåings-identitet for en (navn, enhet)-kombinasjon – se
 * filheader-kommentaren over. For alt som IKKE er en kjent "del av en
 * helhet"-vare: identisk med { key: mergeNameKey(name), partUnit: null },
 * altså UENDRET oppførsel fra før denne utvidelsen. */
function mergeIdentity(name: string, unit: string | null): { key: string; partUnit: string | null } {
  const detected = detectPartUnit(unit);
  if (detected) {
    return { key: `${detected}:${mergeNameKey(name)}`, partUnit: detected };
  }
  const alias = COMPOUND_PART_UNIT_NAME_ALIASES[normalizeName(name)];
  if (alias) {
    return { key: `${alias.unit}:${mergeNameKey(alias.base)}`, partUnit: alias.unit };
  }
  return { key: mergeNameKey(name), partUnit: null };
}

/**
 * Basisvarer – ting de aller fleste alt har i skapet (salt, pepper, olje,
 * sukker, mel, vann, eddik) og derfor ikke trenger påminnelse om å kjøpe
 * hver eneste gang. Rent deterministisk (ordliste + eksakt normalisert
 * navnematch, se isPantryStaple under) – ingen AI-vurdering trengs for noe
 * så lite tvetydig som "er salt en basisvare", og en fast liste er raskere,
 * gratis og 100 % forutsigbart likt for alle brukere.
 *
 * Matcher hvert ord/hver frase i listen som et HELT, avgrenset ord et sted i
 * navnet (\b…\b) – IKKE et rått "inneholder"-søk (unngår at "salt" feilaktig
 * treffer midt inni et sammensatt ord som "saltsild"), men heller ikke et
 * krav om at HELE navnet skal være identisk med listeoppføringen. Sistnevnte
 * ble faktisk prøvd først, men reelle oppskrifter skriver ofte
 * ingrediensnavn som "matsalt eller kosher salt" (flere alternativer i
 * samme felt) – da matchet aldri et eksakt-likhet-krav, selv om "matsalt"
 * tydelig er en kjent basisvare der. Både norske og engelske varianter er
 * med, siden handlelisten kan bygges fra en engelsk oversatt variant av en
 * oppskrift (se RecipeInteractive.tsx sin baseGroups/useEnglish).
 *
 * Listen er bevisst kort og forsiktig – heller for få enn for mange treff,
 * siden en feilaktig avkrysset vare er verre (brukeren tror den har noe den
 * ikke har) enn én ekstra linje å stryke manuelt.
 */
const PANTRY_STAPLE_PATTERNS = [
    "salt",
    "havsalt",
    "grovsalt",
    "flaksalt",
    "matsalt",
    "kosher salt",
    "table salt",
    "sea salt",
    "flaky sea salt",
    "pepper",
    "sort pepper",
    "svart pepper",
    "hvit pepper",
    "malt pepper",
    "nykvernet pepper",
    "nykvernet sort pepper",
    "black pepper",
    "ground black pepper",
    "white pepper",
    // Bart "olje" (uten kvalifiserende ord, f.eks. "litt olje") lagt til
    // 28.09.2026 (Henrik, med skjermbilde: "det står også 'litt olje' der,
    // det er basisvare") – de mer spesifikke variantene under (olivenolje,
    // matolje osv.) dekket ikke en helt generisk "olje" uten noe foran.
    // Trygt som et HELT, avgrenset ord (\bolje\b) på norsk: kvalifiserte
    // oljer skrives normalt sammensatt/uten mellomrom på norsk
    // ("sesamolje", "trøffelolje", "chiliolje"), så \bolje\b treffer ALDRI
    // midt inni de ordene – kun en reelt bar "olje" fanges opp.
    //
    // Bevisst IKKE lagt til bart "oil" på engelsk-siden – der skrives
    // kvalifiserte oljer ofte MED mellomrom ("sesame oil", "chili oil",
    // "truffle oil"), så et bart \boil\b-ord ville feilaktig markert de
    // spesialoljene som basisvarer også. De engelske variantene under
    // (olive oil, vegetable oil, cooking oil osv.) er derfor fortsatt kun
    // eksplisitte, kvalifiserte fraser.
    "olje",
    "olivenolje",
    "extra virgin olivenolje",
    "matolje",
    "nøytral olje",
    "solsikkeolje",
    "rapsolje",
    "olive oil",
    "extra virgin olive oil",
    "vegetable oil",
    "cooking oil",
    "neutral oil",
    "sunflower oil",
    "canola oil",
    "sukker",
    "hvitt sukker",
    "strøsukker",
    "sugar",
    "white sugar",
    "granulated sugar",
    "hvetemel",
    "mel",
    "flour",
    "all purpose flour",
    "plain flour",
    "vann",
    "kaldt vann",
    "kokende vann",
    "water",
    "eddik",
    "hvitvinseddik",
    "eplecidereddik",
    "vinegar",
    "white wine vinegar",
    "apple cider vinegar",
  ]
    .map(normalizeName)
    // \b fungerer greit her siden alle oppføringene over kun bruker vanlige
    // ASCII-bokstaver/mellomrom – ingen æøå midt i et ord som ville forstyrret
    // grense-beregningen.
    .map((term) => new RegExp(`\\b${term}\\b`));

/** Sant dersom `name` (etter normalisering) INNEHOLDER en kjent basisvare
 * som et helt, avgrenset ord/uttrykk – se PANTRY_STAPLE_PATTERNS over for
 * begrunnelse/omfang. Eksportert slik at ShoppingListView.tsx kan vise en
 * liten "basisvare"-forklaring ved siden av varen mens den fortsatt er i
 * sin automatisk overstrøkne tilstand. */
export function isPantryStaple(name: string): boolean {
  const normalized = normalizeName(name);
  return PANTRY_STAPLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Ingredienser der et eventuelt notat er en KJØPS-tips ("en fyldig,
 * rimelig rødvin – f.eks. Chianti"), ikke en tilberedningsinstruks
 * ("finhakket", "romtemperert") – notatet er dermed nyttig å ha med på
 * SELVE handlelista (man trenger å vite hvilken type å se etter i butikken),
 * i motsetning til kutte-/tilberedningsnotater som kun hører hjemme i
 * fremgangsmåten. Foreløpig kun vin (drue-/stilnotater er den klareste,
 * mest etterspurte varianten av dette) – rent deterministisk delstreng-
 * match på normalisert navn, samme prinsipp som PANTRY_STAPLE_NAMES over.
 * Litt bredere enn en eksakt liste med vilje (bruker "inneholder", ikke
 * eksakt likhet) siden vin-ingredienser ofte har kvalifiserende ord foran
 * ("tørr hvitvin", "god rødvin til saus") – risikoen ved et sjeldent
 * falskt treff (et notat vises som ikke strengt tatt var en kjøpstips) er
 * lav sammenlignet med å skjule en tips brukeren faktisk trenger.
 */
const WINE_NAME_FRAGMENTS = ["vin", "wine"].map(normalizeName);

function isBuyingTipWorthKeeping(name: string): boolean {
  const normalized = normalizeName(name);
  return WINE_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Sammenligner to ShoppingListSourceRef på recipeId alene (samme oppskrift
 * regnes som samme kilde uansett om porsjonstallet skulle avvike mellom to
 * bidrag – bør normalt ikke skje, men vi dobbelfører aldri samme
 * oppskrift). */
function hasSameSource(sources: ShoppingListSourceRef[], source: ShoppingListSourceRef): boolean {
  return sources.some((s) => s.recipeId === source.recipeId);
}

/**
 * Regner om en mengde+enhet til "grunnenhet" (gram for vekt, milliliter for
 * volum) – kun for de kompatible, metriske enhetene lib/utils/units.ts sin
 * normalizeUnit kjenner igjen (g/kg, ml/l/dl/ss/ts). Returnerer null for alt
 * annet (stk, boks, fedd, håndfull, ukjente/tomme enheter) – slike enheter
 * har ingen entydig felles grunnenhet å regne om til, og skal ALDRI slås
 * sammen på tvers (se KRYSS-ENHET-SAMMENSLÅING lenger ned).
 */
function toBaseAmount(amount: number, unit: string | null): { base: "g" | "ml"; value: number } | null {
  if (!unit) return null;
  const kind: MetricUnitKind | null = classifyMetricUnit(unit);
  if (!kind) return null;
  const { base, factor } = metricUnitToBaseFactor(kind);
  return { base, value: amount * factor };
}

/** Velger en naturlig norsk visningsenhet for en total volummengde (i ml),
 * samme prinsipp som lib/utils/units.ts sin formatVolumeMl (der for
 * US-mål) – men her i vanlige norske kjøkkenenheter (ts/ss/dl/l) siden
 * dette kun brukes til å vise SUMMEN etter kryss-enhet-sammenslåing i
 * handlelista, ikke til US-konvertering. Grensene følger naturlig når
 * neste enhet blir det mer lesbare valget (14,7868 ml = akkurat 1 ss,
 * 100 ml = 1 dl, 1000 ml = 1 l). */
function pickNiceVolumeUnit(totalMl: number): { amount: number; unit: string } {
  // Faktorene hentes fra samme kilde som selve omregningen (toBaseAmount
  // over/metricUnitToBaseFactor i lib/utils/units.ts) i stedet for å
  // duplisere tallene 14,7868/4,92892 en gang til her.
  const mlPerTbsp = metricUnitToBaseFactor("ss").factor;
  const mlPerTsp = metricUnitToBaseFactor("ts").factor;
  if (totalMl < mlPerTbsp) return { amount: totalMl / mlPerTsp, unit: "ts" };
  if (totalMl < 100) return { amount: totalMl / mlPerTbsp, unit: "ss" };
  if (totalMl < 1000) return { amount: totalMl / 100, unit: "dl" };
  return { amount: totalMl / 1000, unit: "l" };
}

/** Samme prinsipp som pickNiceVolumeUnit over, for vekt (g/kg). */
function pickNiceWeightUnit(totalG: number): { amount: number; unit: string } {
  if (totalG < 1000) return { amount: totalG, unit: "g" };
  return { amount: totalG / 1000, unit: "kg" };
}

/**
 * Enkel "X-Y"-intervall-tolkning (bindestrek ELLER kort tankestrek), KUN
 * brukt her i mergeIngredientsIntoList for å avgjøre om en linje kan
 * summeres med andre (05.10.2026, Henrik: "hvorfor er ikke parmesan samlet
 * til ett punkt?" – rot-årsak: "25-30 g parmesan" kunne ikke slås sammen
 * med "80 g parmesan" siden parseAmount i lib/utils/scale.ts – med god
 * grunn, se der – ikke tolker rene tallintervaller). Bruker midtpunktet som
 * et representativt, summérbart tall – fornuftig for en handleliste (man
 * kjøper uansett i hele pakninger), i motsetning til selve
 * oppskriftsvisningen der det faktiske intervallet er nyttig å vise
 * uendret. Faller tilbake til parseAmount for alt annet (desimaltall,
 * brøker osv.) – rører IKKE den delte parseAmount-funksjonen selv, som
 * også brukes til porsjonsskalering/US-konvertering andre steder i appen.
 */
function parseAmountForMerging(raw: string | null | undefined): number | null {
  const direct = parseAmount(raw);
  if (direct != null) return direct;
  if (!raw) return null;
  const rangeMatch = raw
    .trim()
    .replace(",", ".")
    .match(/^(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const [, lowRaw, highRaw] = rangeMatch;
    const low = Number(lowRaw);
    const high = Number(highRaw);
    if (Number.isFinite(low) && Number.isFinite(high)) return (low + high) / 2;
  }
  return null;
}

/** Sant hvis `raw` er et tallintervall («1-2», «8–10») som
 * parseAmountForMerging over kollapser til et midtpunkt – brukt til å
 * avgjøre om den opprinnelige intervall-teksten skal bevares for VISNING
 * (rawIntervalText, se lib/types.ts), uavhengig av midtpunkt-tallet som
 * fortsatt brukes til selve summerings-/avrundingslogikken. Samme
 * mønster/regex som rangeMatch over, bevisst IKKE eksportert fra
 * parseAmountForMerging selv (den har et annet formål og en annen
 * returtype). */
function looksLikeIntervalText(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return /^\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?$/.test(raw.trim());
}

/**
 * KJØPSNORMALISERING v2 (05.10.2026, Henriks produktgodkjente og autoritative
 * spesifikasjon `shopping-list-purchase-normalization-spec.md` v1.0) –
 * ERSTATTER den tidligere sitrus-/ferske urte-/hvitløk-logikken som sto her
 * (feil sitronyield 45 ml i stedet for 30 ml, feil appelsinyield 90 ml i
 * stedet for 50 ml bare for ferskpresset, ingen skallyield, automatisk
 * gram/ss/håndfull → bunt/potte for ferske urter som spesifikasjonen
 * EKSPLISITT forbyr, og en flat 10-fedd-per-løk-antakelse i stedet for den
 * godkjente 6-fedd-regelen). All faktisk regellogikk ligger nå i
 * lib/utils/purchase-engine.ts + lib/utils/purchase-registry-data.ts (734
 * eksakte aliaser, mekanisk generert fra spesifikasjonsteksten) – denne filen
 * bruker kun de eksporterte funksjonene derfra.
 *
 * Ferske urter (H-seksjonen) får IKKE lenger noen automatisk bunt/potte-
 * konvertering i det hele tatt – de går nå gjennom den vanlige, ueendrede
 * KEEP-sammenslåingen lenger ned i filen (samme kryss-enhet-maskin som alt
 * annet målt i g/ml), akkurat som spesifikasjonen krever.
 */

const GARLIC_PURCHASE_ID = "garlic";
const EGG_PURCHASE_ID = "egg";
const CITRUS_PURCHASE_IDS = new Set(["lemon", "lime", "orange"]);

/** Et (lavt,høyt,ukjent)-triplett er den serialiserbare formen av en
 * ParsedQuantity (se purchase-engine.ts) – ShoppingListPurchaseEvent i
 * lib/types.ts lagrer akkurat dette per delressurs-bøtte. */
function quantityToStored(q: ParsedQuantity): { low: number; high: number; unknown: boolean } {
  if (q.kind === "unknown") return { low: 0, high: 0, unknown: true };
  if (q.kind === "exact") return { low: q.value, high: q.value, unknown: false };
  return { low: q.low, high: q.high, unknown: false };
}

function storedToQuantity(s: { low: number; high: number; unknown: boolean } | undefined): ParsedQuantity {
  // VIKTIG: `undefined` (bøtten har ALDRI fått noe bidrag – f.eks. Zfruit
  // når linjen bare har levert saft, ikke skall) betyr "intet behov i
  // denne bøtta", altså eksakt 0 – IKKE "ukjent mengde". En S/E-gruppe har
  // alltid 5-6 mulige bøtter, men en enkelt oppskriftslinje fyller typisk
  // bare én eller to av dem; uten dette skillet ville
  // computeCitrusGroupPurchaseCount/computeEggGroupPurchaseCount sin
  // anyUnknown-sjekk (som ser på ALLE bøttene) alltid funnet minst én
  // uberørt bøtte og dermed flagget HVER linje som "usikker mengde" med
  // kjøpsantall 0 – oppdaget via testmatrisen (T001 osv.: et rent kjent
  // behov som «1,5 ss limesaft» ga ingen kjøpsantall i det hele tatt).
  // `unknown: true` er fortsatt reservert for en FAKTISK ikke-tallfestet
  // mengde i en bøtte som faktisk ble brukt (se quantityToStored).
  if (!s) return { kind: "exact", value: 0 };
  if (s.unknown) return { kind: "unknown" };
  if (s.low === s.high) return { kind: "exact", value: s.low };
  return { kind: "interval", low: s.low, high: s.high };
}

function addStored(
  a: { low: number; high: number; unknown: boolean } | undefined,
  b: { low: number; high: number; unknown: boolean },
): { low: number; high: number; unknown: boolean } {
  // VIKTIG: ingen tidligere bidrag (a === undefined) betyr "null/identitet",
  // IKKE "ukjent mengde" – addQuantities har ingen nøytral verdi og lar
  // "unknown" smitte over alt den møter (med god grunn: et reelt ukjent
  // delbehov SKAL gjøre resten av bøtta ukjent). Uten denne sjekken ville
  // ethvert FØRSTE bidrag til en bøtte blitt tolket som unknown+kjent =
  // unknown, og dermed gjort hele sitron-/lime-/appelsin-/egg-linjen
  // "usikker mengde" fra og med første ingrediens – oppdaget via T001 osv.
  // i testmatrisen, der et rent kjent behov (f.eks. «1,5 ss limesaft») ikke
  // ga noe kjøpsantall i det hele tatt.
  if (!a) return b;
  const sum = addQuantities(storedToQuantity(a), storedToQuantity(b));
  return quantityToStored(sum);
}

/**
 * Legger ingredienser fra en eller flere oppskrifter til en eksisterende
 * handleliste.
 *
 * To linjer slås sammen på to måter:
 *  1) SAMME enhet (etter normalisering) – summeres direkte i den enheten,
 *     akkurat som før (ingen omregning, ingen presisjonstap).
 *  2) ULIK, men KOMPATIBEL enhet (28.09.2026, se KRYSS-ENHET-SAMMENSLÅING
 *     under) – f.eks. "1 ss soyasaus" + "1 ts soyasaus": begge er
 *     volum-enheter, regnes om til ml, summeres, og vises tilbake i en
 *     naturlig enhet (ts/ss/dl/l for volum, g/kg for vekt).
 * Genuint ULIKE/ikke-omregnbare enheter (f.eks. "1 boks" + "400 g", eller
 * "3 fedd" + "10 g") slås ALDRI sammen – for usikkert å gjette riktig
 * omregning, se toBaseAmount over.
 *
 * `source` (valgfri) – strukturert sporbarhet (recipeId/slug/porsjoner), se
 * ShoppingListSourceRef i lib/types.ts. Lagt til for "kombinert
 * handleliste" (Fase 5 – Experience, 5.7); eksisterende kallere som ikke
 * sender den (enkelt-oppskrift-siden, se useShoppingList.ts) fortsetter å
 * fungere UENDRET – fromRecipes (tittel-teksten UI-et viser) settes alltid,
 * uavhengig av om `source` er oppgitt.
 *
 * Kjente basisvarer (salt, pepper, olje osv., se PANTRY_STAPLE_NAMES) legges
 * automatisk til allerede avhuket – vises overstrøket i UI-et med en gang,
 * akkurat som om man alt hadde krysset dem av selv. Helt vanlig
 * avkrysningsboks, så det er bare å klikke bort streken igjen dersom man
 * faktisk trenger å kjøpe akkurat den varen denne gangen. Gjelder kun ved
 * FØRSTE tilføyelse av en linje – slår senere tilføyelser sammen med en
 * eksisterende (uavhukede eller avhukede) linje, røres ikke det avhukede
 * valget brukeren allerede har tatt.
 *
 * Ingrediensnotater ("finhakket", "en fyldig rødvin") følger ALDRI med i
 * selve varenavnet (se merknad ved `name` under), men for vin-lignende
 * ingredienser (isBuyingTipWorthKeeping) beholdes notatet i et eget `note`-
 * felt, siden det da typisk er en kjøpstips – ikke en tilberedningsdetalj.
 */
/**
 * Slår én rå ingredienslinje sammen i en sitron/lime/appelsin- ELLER
 * egg-styrt handlelistelinje (S/E, seksjon S og E) – ÉN delt hendelses-ID
 * (`eventId`, satt én gang per kall til mergeIngredientsIntoList = én
 * oppskriftshendelse/faktisk tilberedningsøkt) sørger for at hver middags
 * delressurser avrundes HVER FOR SEG før de ferdige kjøpsantallene summeres,
 * aldri ceil(sum(...)) over flere middager (§sharingGroup). Returnerer
 * `true` dersom linjen ble håndtert her (kalleren skal da `continue`,
 * uansett om et bucket faktisk ble funnet – en REVIEW/ukjent-form-linje for
 * disse to varene skal IKKE også opprette en vanlig handlelistelinje via den
 * generelle sammenslåingen, se egen REVIEW-gren under).
 */
function mergeGovernedCitrusOrEgg(
  next: ShoppingListEntry[],
  purchaseId: "lemon" | "lime" | "orange" | "egg",
  bucketTag: string,
  quantity: ParsedQuantity,
  servingsMultiplier: number,
  eventId: string,
  recipeTitle: string,
  source: ShoppingListSourceRef | undefined,
  displayName: string,
  checkedDefault: boolean,
): void {
  const scaled: ParsedQuantity =
    quantity.kind === "unknown"
      ? quantity
      : quantity.kind === "exact"
        ? { kind: "exact", value: quantity.value * servingsMultiplier }
        : { kind: "interval", low: quantity.low * servingsMultiplier, high: quantity.high * servingsMultiplier };

  // MERK: filtrerer også på ruleId, ikke bare purchaseId – en linje med en
  // IKKE-godkjent form av samme frukt (f.eks. «limebåter», wedge-form uten
  // yield, se classifyCitrusLine) faller videre til den generelle KEEP-
  // sammenslåingen og kan også bli tagget med purchaseMeta.purchaseId
  // "lime" (se keepPurchaseId i mergeIngredientsIntoList) – men med
  // ruleId "KEEP", ikke "S"/"E". Uten ruleId-sjekken ville en slik KEEP-
  // linje blitt funnet og mutert her i stedet for at en egen, korrekt
  // styrt S/E-linje ble opprettet.
  let entry = next.find((e) => e.purchaseMeta?.purchaseId === purchaseId && e.purchaseMeta?.ruleId === (purchaseId === "egg" ? "E" : "S"));
  if (!entry) {
    entry = {
      id: generateId(),
      amount: 0,
      displayAmount: null,
      unit: null,
      name: displayName,
      checked: checkedDefault,
      fromRecipes: [],
      sources: source ? [] : undefined,
      purchaseMeta: {
        purchaseId,
        ruleId: purchaseId === "egg" ? "E" : "S",
        ruleVersion: "1.0.0",
        events: [],
      },
    };
    next.push(entry);
  }
  const meta = entry.purchaseMeta!;
  meta.events = meta.events ?? [];
  let event = meta.events.find((e) => e.eventId === eventId);
  if (!event) {
    event = { eventId, recipeTitle, buckets: {} };
    meta.events.push(event);
  }
  event.buckets[bucketTag] = addStored(event.buckets[bucketTag], quantityToStored(scaled));

  if (!entry.fromRecipes.includes(recipeTitle)) entry.fromRecipes.push(recipeTitle);
  if (source) {
    entry.sources = entry.sources ?? [];
    if (!hasSameSource(entry.sources, source)) entry.sources.push(source);
  }

  // Rekalkuler hele linjens ferdige kjøpsantall fra ALLE lagrede hendelser –
  // se §sharingGroup: hver hendelse avrundes for seg, så summeres de ferdige
  // tallene. Dette gjør mergeIngredientsIntoList trygt å kalle flere ganger
  // (én gang per oppskrift i Ukesmenyen) uten å gjette hvilke middager som
  // faktisk deler en tilberedningsøkt.
  let totalPurchaseCount = 0;
  let anyUnknown = false;
  for (const ev of meta.events) {
    if (purchaseId === "egg") {
      const acc = {
        whole: storedToQuantity(ev.buckets.whole),
        yolk: storedToQuantity(ev.buckets.yolk),
        white: storedToQuantity(ev.buckets.white),
      };
      const result = computeEggGroupPurchaseCount(acc);
      totalPurchaseCount += result.purchaseCount;
      anyUnknown = anyUnknown || result.needsReviewForUnknown;
    } else {
      const acc = {
        w: storedToQuantity(ev.buckets.W),
        jFruit: storedToQuantity(ev.buckets.Jfruit),
        jMl: storedToQuantity(ev.buckets.Jml),
        zFruit: storedToQuantity(ev.buckets.Zfruit),
        zMl: storedToQuantity(ev.buckets.Zml),
        bFruit: storedToQuantity(ev.buckets.Bfruit),
      };
      const result = computeCitrusGroupPurchaseCount(acc, purchaseId);
      totalPurchaseCount += result.purchaseCount;
      anyUnknown = anyUnknown || result.needsReviewForUnknown;
    }
  }
  entry.amount = totalPurchaseCount;
  meta.reviewReason = anyUnknown ? "unquantified_need" : undefined;
}

/** Hvitløk (G, seksjon G) – fedd/hele løk summeres GLOBALT (ikke per
 * hendelse, i motsetning til S/E over – se G-seksjonen), så dette trenger
 * ingen eventId. */
function mergeGovernedGarlic(
  next: ShoppingListEntry[],
  bucketTag: "clove" | "wholeHead",
  quantity: ParsedQuantity,
  servingsMultiplier: number,
  recipeTitle: string,
  source: ShoppingListSourceRef | undefined,
  checkedDefault: boolean,
): void {
  const scaled: ParsedQuantity =
    quantity.kind === "unknown"
      ? quantity
      : quantity.kind === "exact"
        ? { kind: "exact", value: quantity.value * servingsMultiplier }
        : { kind: "interval", low: quantity.low * servingsMultiplier, high: quantity.high * servingsMultiplier };

  // Samme ruleId-presisering som i mergeGovernedCitrusOrEgg over – en
  // tvetydig "1 hvitløk" (REVIEW, ambiguous_product) kan falle videre til
  // KEEP-sammenslåingen og dermed også få purchaseMeta.purchaseId
  // "garlic", men med ruleId "KEEP".
  let entry = next.find((e) => e.purchaseMeta?.purchaseId === GARLIC_PURCHASE_ID && e.purchaseMeta?.ruleId === "G");
  if (!entry) {
    entry = {
      id: generateId(),
      amount: 0,
      displayAmount: null,
      unit: null,
      name: "hvitløk",
      checked: checkedDefault,
      fromRecipes: [],
      sources: source ? [] : undefined,
      purchaseMeta: {
        purchaseId: GARLIC_PURCHASE_ID,
        ruleId: "G",
        ruleVersion: "1.0.0",
        garlicTotals: { reservedWholeHeads: 0, totalCloves: 0, anyUnknown: false },
      },
    };
    next.push(entry);
  }
  const meta = entry.purchaseMeta!;
  const totals = meta.garlicTotals ?? { reservedWholeHeads: 0, totalCloves: 0, anyUnknown: false };
  const current =
    bucketTag === "clove"
      ? { kind: "exact" as const, value: totals.totalCloves }
      : { kind: "exact" as const, value: totals.reservedWholeHeads };
  const added = addQuantities(totals.anyUnknown ? { kind: "unknown" } : current, scaled);
  const addedUpper = upperBound(added);
  if (bucketTag === "clove") {
    totals.totalCloves = addedUpper ?? totals.totalCloves;
  } else {
    totals.reservedWholeHeads = addedUpper ?? totals.reservedWholeHeads;
  }
  totals.anyUnknown = totals.anyUnknown || scaled.kind === "unknown";
  meta.garlicTotals = totals;

  if (!entry.fromRecipes.includes(recipeTitle)) entry.fromRecipes.push(recipeTitle);
  if (source) {
    entry.sources = entry.sources ?? [];
    if (!hasSameSource(entry.sources, source)) entry.sources.push(source);
  }

  const result = computeGarlicPurchaseCount(
    { kind: "exact", value: totals.reservedWholeHeads },
    { kind: "exact", value: totals.totalCloves },
  );
  entry.amount = totals.anyUnknown ? 0 : result.purchaseHeads;
  meta.reviewReason = totals.anyUnknown ? "unquantified_need" : undefined;
}

/** Legger til (eller finner og henger kilde på) ett navngitt, ukvantifisert
 * basisvarebehov – brukt KUN av «salt og pepper»-splitten over (seksjon B).
 * Et minimalt, bevisst forenklet sidespor av den generelle sammenslåingen
 * lenger ned: siden begge de splittede behovene alltid er ukvantifiserte
 * (ellers splittes det ikke, se kallstedet), er "samme vare" her rett og
 * slett samme normaliserte navn – ingen enhets-/kryss-enhet-logikk nødvendig. */
function mergeUnquantifiedKeepItem(
  next: ShoppingListEntry[],
  name: string,
  recipeTitle: string,
  source: ShoppingListSourceRef | undefined,
): void {
  const key = normalizeName(name);
  const existingEntry = next.find((e) => e.amount == null && normalizeName(e.name) === key);
  if (existingEntry) {
    if (!existingEntry.fromRecipes.includes(recipeTitle)) existingEntry.fromRecipes.push(recipeTitle);
    if (source) {
      existingEntry.sources = existingEntry.sources ?? [];
      if (!hasSameSource(existingEntry.sources, source)) existingEntry.sources.push(source);
    }
    return;
  }
  next.push({
    id: generateId(),
    amount: null,
    displayAmount: null,
    unit: null,
    name,
    checked: isPantryStaple(name),
    fromRecipes: [recipeTitle],
    sources: source ? [source] : undefined,
  });
}

export function mergeIngredientsIntoList(
  existing: ShoppingListEntry[],
  groups: IngredientGroup[],
  recipeTitle: string,
  servingsMultiplier = 1,
  source?: ShoppingListSourceRef,
): ShoppingListEntry[] {
  const next = [...existing];
  // Én delt hendelses-ID for HELE dette kallet – se §sharingGroup: uten
  // informasjon om en faktisk felles tilberedningsøkt brukes den enkelte
  // oppskriftshendelsen (= ett kall hit) som gruppe. Flere oppskrifter i
  // samme Ukesmeny-batch er fortsatt separate kall/separate eventId, akkurat
  // som spesifikasjonen krever (samme kalenderdag er IKKE en felles økt).
  const eventId = generateId();

  for (const group of groups) {
    for (const item of group.items) {
      // KJØPSNORMALISERING v2 – se filheader-kommentaren over
      // mergeGovernedCitrusOrEgg. Eksakt aliasoppslag MÅ kjøres FØR den
      // generelle sammenslåingen: biprodukter (N) skal aldri bli en linje i
      // det hele tatt, og sitron/lime/appelsin/hvitløk/egg (S/G/E) har sin
      // EGEN ressursmodell og skal ALDRI gå via den generelle
      // navnebaserte sammenslåingen under (som ikke kjenner til
      // delingsgrupper/ceil-per-middag).
      const resolved = resolvePurchaseLine(item.name, item.note, item.unit);

      if (resolved.kind === "byproduct") {
        // N – oppskriftsprodusert biprodukt. Vises ALDRI på handlelisten,
        // ingen kildekobling/REVIEW opprettes for selve biproduktet (se
        // N-seksjonen). Oppskriftslinjen er allerede uendret siden vi her
        // aldri rører `item`/`group` selv – kun hopper over å legge den til.
        continue;
      }

      if (resolved.purchaseId && CITRUS_PURCHASE_IDS.has(resolved.purchaseId) && resolved.form) {
        const quantity = parseQuantityValue(item.amount);
        const classified = classifyCitrusLine(resolved.form, quantity, item.unit, item.note);
        if (classified.bucket) {
          mergeGovernedCitrusOrEgg(
            next,
            resolved.purchaseId as "lemon" | "lime" | "orange",
            classified.bucket.tag,
            classified.bucket.quantity,
            servingsMultiplier,
            eventId,
            recipeTitle,
            source,
            resolved.purchaseId === "lemon" ? "sitron" : resolved.purchaseId === "lime" ? "lime" : "appelsin",
            isPantryStaple(item.name),
          );
          continue;
        }
        // Ingen godkjent yield for denne formen (skive/strimmel/filet, eller
        // en uventet enhet) – REVIEW, ALDRI gjett. Faller videre til den
        // generelle sammenslåingen under, som beholder linjen helt uendret
        // (samme konservative fallback som et ukjent navn ville fått).
      }

      if (resolved.purchaseId === GARLIC_PURCHASE_ID && resolved.form) {
        const quantity = parseQuantityValue(item.amount);
        const classified = classifyGarlicLine(resolved.form, quantity, item.unit, item.name, item.note);
        if (classified.bucket) {
          mergeGovernedGarlic(
            next,
            classified.bucket.tag,
            classified.bucket.quantity,
            servingsMultiplier,
            recipeTitle,
            source,
            isPantryStaple(item.name),
          );
          continue;
        }
        // Tvetydig "1 hvitløk"/"1 stk hvitløk" (REVIEW, ambiguous_product) –
        // faller videre til den generelle sammenslåingen under, uendret.
      }

      if (resolved.purchaseId === EGG_PURCHASE_ID && resolved.form) {
        const quantity = parseQuantityValue(item.amount);
        const classified = classifyEggLine(resolved.form, quantity, item.unit);
        if (classified.bucket) {
          mergeGovernedCitrusOrEgg(
            next,
            "egg",
            classified.bucket.tag,
            classified.bucket.quantity,
            servingsMultiplier,
            eventId,
            recipeTitle,
            source,
            "egg",
            isPantryStaple(item.name),
          );
          continue;
        }
        // Gram/ml-form av plomme/hvite – egen KEEP-produktidentitet, ingen
        // yield (se E-seksjonen: "Gram egg konverteres ikke"). Faller videre
        // til den generelle sammenslåingen under, uendret.
      }

      // B – «salt og pepper» i FELLES, UKVANTIFISERT linje splittes til to
      // ukvantifiserte basisvarebehov (seksjon B presedens: generisk salt +
      // sort malt pepper BARE når «sort» faktisk står i input, ellers
      // generisk pepper). En linje som FAKTISK har en mengde («1 ts salt og
      // pepper») kan IKKE deles trygt (ingen oppfunnet halvdeling) og faller
      // derfor bevisst videre til den generelle sammenslåingen under som én
      // udelt, uendret REVIEW-linje – se T091.
      if (resolved.purchaseId === "compound_salt_pepper" && !item.amount) {
        const hasSortMarker = /\bsort\b/.test(normalizeAliasKey(item.name));
        mergeUnquantifiedKeepItem(next, "salt", recipeTitle, source);
        mergeUnquantifiedKeepItem(next, hasSortMarker ? "sort malt pepper" : "pepper", recipeTitle, source);
        continue;
      }

      // ALT ANNET (alle 35 WHOLE_UNIT-rader, rene KEEP-rader, PANTRY,
      // REVIEW/choice/ukjente navn, gram-form egg, hvitløkspulver/-krydder,
      // og den tvetydige "1 hvitløk"-REVIEW-grenen over) – den eksisterende,
      // allerede godkjente sammenslåingsmaskinen, UENDRET. Den dekker
      // allerede «ceil etter samlet helbehov» korrekt for enhetsløse/
      // «stk»-mengder (se formatShoppingAmount under), og en ukjent
      // råvare/form her beholdes alltid 100 % uendret – nøyaktig den
      // konservative fallbacken spesifikasjonen krever.
      const effective = item;

      const scaledAmount = effective.amount
        ? parseAmountForMerging(effective.amount) != null
          ? (parseAmountForMerging(effective.amount) as number) * servingsMultiplier
          : null
        : null;

      // KJØPSNORMALISERT SAMMENSLÅING (05.10.2026, spesifikasjonens krav
      // «korrekt kjøpsnormalisert visning uten å endre oppskriftens
      // originale ingrediensdata», bevist av T122: «maisenna» og «maizena»
      // er to forskjellige skrivemåter av samme godkjente kjøps-ID
      // (`cornstarch`) og MÅ telle som samme vare på handlelisten, selv om
      // ren tekstlig navnelikhet (som mergeIdentity/normalizeName bruker
      // for et ukjent navn uten alias) aldri ville sett dem som like.
      // Gjelder KUN når aliasoppslaget faktisk traff en kjent, "normal"
      // kjøps-ID (ikke et ukjent navn – de har ingen stabil ID å slå
      // sammen etter, og beholdes derfor fortsatt bevisst på ren
      // tekstmatch akkurat som før). Endrer ALDRI selve visningsnavnet –
      // kun HVILKE linjer som anses som "samme vare": navnet til den
      // FØRSTE oppskriften som traff denne kjøps-ID-en vinner og blir
      // stående (se `next.push` nederst), nøyaktig slik eksisterende
      // navnebasert sammenslåing alltid har latt det første navnet vinne.
      const keepPurchaseId = resolved.kind === "normal" && resolved.purchaseId ? resolved.purchaseId : null;

      // MASSE↔VOLUM-WHITELIST (06.10.2026, Henriks del 1-spesifikasjon, se
      // MASS_VOLUME_WHITELIST i purchase-engine.ts) – gjelder KUN for de 14
      // eksplisitt godkjente kjøps-ID-ene, og KUN når selve enheten faktisk
      // er en kjent metrisk g/ml-enhet (toMetricBase – "boks"/"stk"/
      // "håndfull"/"klype" osv. gir aldri en konvertering, se
      // convertToPreferredBase). Normaliserer til varens foretrukne
      // sluttenhet FRA FØRSTE forekomst av varen (ikke bare når et andre
      // bidrag faktisk krysser g/ml-grensen) – dette er bevisst: uten det
      // ville f.eks. "1 ss smør" vist seg som "ss" ved første forekomst og
      // først blitt "g" i det øyeblikket en andre, vekt-basert linje for
      // smør dukket opp, et inkonsekvent sprang i visningen. "Pen enhet"
      // (g/kg, ml/dl/l) avgjøres av de eksisterende, allerede godkjente
      // pickNiceWeightUnit/pickNiceVolumeUnit-funksjonene – ALDRI en ny,
      // parallell avrundingsregel.
      let whitelistUnit: string | null = null;
      let whitelistAmount: number | null = null;
      if (keepPurchaseId && scaledAmount != null) {
        const converted = convertToPreferredBase(keepPurchaseId, scaledAmount, effective.unit);
        if (converted) {
          const nice = converted.base === "ml" ? pickNiceVolumeUnit(converted.value) : pickNiceWeightUnit(converted.value);
          whitelistAmount = nice.amount;
          whitelistUnit = nice.unit;
        }
      }
      // Resten av funksjonen (sammenslåingsnøkler, kryss-enhet-sammenslåing,
      // ny linje-opprettelse) bruker disse "effektive" verdiene i stedet for
      // item.amount/item.unit direkte – for ALT som ikke er whitelistet er
      // whitelistAmount/whitelistUnit alltid null, og effectiveAmount/
      // effectiveUnit er dermed bokstavelig talt de samme verdiene som før
      // denne utvidelsen (ingen endring i oppførsel for ikke-whitelistede
      // varer).
      const effectiveAmount = whitelistAmount ?? scaledAmount;
      const effectiveUnit = whitelistUnit ?? effective.unit;

      const normalizedName = normalizeName(effective.name);
      const normalizedUnit = normalizeUnit(effectiveUnit);
      const identity = mergeIdentity(effective.name, effectiveUnit);
      const mergeKey = identity.key;

      const sameItemAs = (entry: ShoppingListEntry): boolean =>
        keepPurchaseId
          ? entry.purchaseMeta?.ruleId === "KEEP" && entry.purchaseMeta?.purchaseId === keepPurchaseId
          : mergeIdentity(entry.name, entry.unit).key === mergeKey;
      // MERK: krevde tidligere at item.unit også var satt (f.eks. "g"/"dl"),
      // noe som gjorde at to enhetsløse linjer med samme navn – f.eks.
      // "3 løk" og "1 løk", der "løk" er navnet og ingen enhet er oppgitt –
      // ALDRI ble slått sammen, og ble stående som to forvirrende separate
      // linjer i handlelisten. Enheten trenger ikke være satt for at to
      // linjer skal kunne summeres, kun at de er LIKE (normalizedUnit-
      // sammenligningen under dekker "begge enhetsløse" som gyldig likhet,
      // på samme måte som "begge i g"). Det som fortsatt aldri slås sammen,
      // er ulike enheter (f.eks. "1 boks" + "400 g") – MED MINDRE de er
      // kompatible metriske enheter, se KRYSS-ENHET-SAMMENSLÅING under.
      const canMerge = effectiveAmount != null;

      const exactMatch = canMerge
        ? next.find((entry) => {
            if (entry.amount == null || !sameItemAs(entry)) return false;
            // Del-av-en-helhet-varer ("fedd"/"blad"/"kvist"/"båt", se
            // mergeIdentity over) slås sammen UAVHENGIG av om enheten er
            // skrevet eksplisitt eller bakt inn i selve navnet (ulik
            // bokstavelig enhet er da FORVENTET, ikke et tegn på at det er
            // to ulike varer). Alt annet krever fortsatt eksakt lik enhet,
            // som før.
            if (identity.partUnit) return true;
            return normalizeUnit(entry.unit) === normalizedUnit;
          })
        : undefined;

      if (exactMatch) {
        exactMatch.amount = (exactMatch.amount ?? 0) + (effectiveAmount ?? 0);
        // Et ANDRE bidrag slås nå sammen med denne linjen – spesifikasjonens
        // intervall-bevaring (se rawIntervalText i lib/types.ts) gjelder
        // KUN en linje med ett eneste, uendret bidrag. To forskjellige
        // intervaller har ingen definert/testet visningsregel for hvordan
        // de skal slås sammen, så linjen faller tilbake til den
        // eksisterende, allerede godkjente tallsummerings-visningen.
        exactMatch.rawIntervalText = null;
        if (!exactMatch.fromRecipes.includes(recipeTitle)) {
          exactMatch.fromRecipes.push(recipeTitle);
        }
        if (source) {
          exactMatch.sources = exactMatch.sources ?? [];
          if (!hasSameSource(exactMatch.sources, source)) exactMatch.sources.push(source);
        }
        // Fyller kun inn kjøpstips dersom linjen ikke alt har ett – den
        // FØRSTE oppskriftens tips vinner, i stedet for å overskrives av en
        // senere oppskrift som tilfeldigvis også bruker samme vin uten selv
        // å ha noe notat.
        if (!exactMatch.note && effective.note && isBuyingTipWorthKeeping(effective.name)) {
          exactMatch.note = effective.note;
        }
        continue;
      }

      // KRYSS-ENHET-SAMMENSLÅING (28.09.2026) – Henrik, med skjermbilde av
      // en reell handleliste: "se hvor mange ganger det står lime på
      // forskjellige måter her, og soyasaus og sesamfrø og, handlelista
      // blir jo en mil lang med gjentakelser". Rot-årsaken: "1 ss soyasaus"
      // fra én oppskrift og "1 ts soyasaus" fra en annen har ULIK enhet
      // (ss/ts), så det eksakte matchet over (samme enhet) traff aldri –
      // hver oppskrift fikk sin egen linje, selv om det er nøyaktig samme
      // vare. Løsningen: dersom IKKE noe eksakt-enhet-match ble funnet,
      // prøv å finne en eksisterende linje med samme navn hvis enhet er en
      // ANNEN, men KOMPATIBEL metrisk enhet (begge volum: ml/l/dl/ss/ts,
      // eller begge vekt: g/kg, se toBaseAmount over) – regn begge om til
      // samme grunnenhet, summer, og vis tilbake i en naturlig enhet
      // (pickNiceVolumeUnit/pickNiceWeightUnit). Rene tellbare/ukjente
      // enheter (stk, boks, fedd, håndfull) klassifiseres aldri av
      // toBaseAmount, så de faller alltid videre til NY linje under –
      // akkurat som "ulike varenavn" (lime/limebåter/limejuice) fortsatt
      // bevisst IKKE slås sammen, siden det ville krevd å gjette en
      // omregning vi ikke kan vite er riktig.
      if (canMerge) {
        const itemBase = toBaseAmount(effectiveAmount as number, effectiveUnit);
        if (itemBase) {
          const compatMatch = next.find((entry) => {
            if (!sameItemAs(entry) || entry.amount == null) return false;
            const entryBase = toBaseAmount(entry.amount, entry.unit);
            return entryBase != null && entryBase.base === itemBase.base;
          });

          if (compatMatch) {
            const compatMatchBase = toBaseAmount(compatMatch.amount as number, compatMatch.unit) as {
              base: "g" | "ml";
              value: number;
            };
            const totalBase = compatMatchBase.value + itemBase.value;
            const nice =
              itemBase.base === "ml" ? pickNiceVolumeUnit(totalBase) : pickNiceWeightUnit(totalBase);
            compatMatch.amount = nice.amount;
            compatMatch.unit = nice.unit;
            // Se samme begrunnelse som over ved exactMatch.
            compatMatch.rawIntervalText = null;
            if (!compatMatch.fromRecipes.includes(recipeTitle)) {
              compatMatch.fromRecipes.push(recipeTitle);
            }
            if (source) {
              compatMatch.sources = compatMatch.sources ?? [];
              if (!hasSameSource(compatMatch.sources, source)) compatMatch.sources.push(source);
            }
            if (!compatMatch.note && effective.note && isBuyingTipWorthKeeping(effective.name)) {
              compatMatch.note = effective.note;
            }
            continue;
          }
        }
      }

      // RENE, TOMME DUPLIKATER (28.09.2026) – ingredienser uten en
      // tallbar mengde (f.eks. "sesamfrø" helt uten "1 ts" foran, eller
      // "etter smak") kunne tidligere ALDRI slås sammen i det hele tatt,
      // siden canMerge da alltid er false. To linjer som er 100 % IDENTISKE
      // (samme navn, samme enhet, og samme opprinnelige fritekst-mengde –
      // f.eks. to helt like "sesamfrø"-oppføringer uten mengde) er en ren
      // duplikat, ikke to ulike behov, og slås derfor sammen her. MERK:
      // dette slår bevisst IKKE sammen en tom "sesamfrø" (f.eks. "til
      // servering") med en tallfestet "1 ts sesamfrø" (til marinaden) –
      // ulik enhet/mengde betyr et reelt, ULIKT behov (nok til marinaden
      // OG litt ekstra til pynt), og skal fortsatt vises som to linjer.
      if (!canMerge) {
        const blankDuplicate = next.find(
          (entry) =>
            entry.amount == null &&
            sameItemAs(entry) &&
            normalizeUnit(entry.unit) === normalizedUnit &&
            (entry.displayAmount ?? "").trim().toLowerCase() === (effective.amount ?? "").trim().toLowerCase(),
        );
        if (blankDuplicate) {
          if (!blankDuplicate.fromRecipes.includes(recipeTitle)) {
            blankDuplicate.fromRecipes.push(recipeTitle);
          }
          if (source) {
            blankDuplicate.sources = blankDuplicate.sources ?? [];
            if (!hasSameSource(blankDuplicate.sources, source)) blankDuplicate.sources.push(source);
          }
          if (!blankDuplicate.note && effective.note && isBuyingTipWorthKeeping(effective.name)) {
            blankDuplicate.note = effective.note;
          }
          continue;
        }

        // UKVANTIFISERT VARE SOM ALLEREDE FINNES MED MENGDE ANDRE STEDER
        // (05.10.2026, Henrik: "hvorfor er ikke parmesan samlet til ett
        // punkt?") – en ingrediens oppgitt UTEN mengde i én oppskrift
        // (f.eks. "Parmesan, til servering") endte tidligere alltid opp som
        // sin egen, forvirrende ekstra linje, selv om en annen oppskrift
        // alt hadde lagt til akkurat samme vare MED en tallfestet mengde
        // ("80 g parmesan"). Finner derfor – kun når ingen blank-duplikat
        // ble funnet over – en HVILKEN SOM HELST eksisterende linje med
        // samme vare (uavhengig av om den har en mengde), og henger kun
        // kilden/oppskrift-tittelen på den i stedet for å opprette en ny
        // linje. Selve mengden/enheten på den eksisterende linjen RØRES
        // ALDRI (vi gjetter aldri en mengde vi ikke har) – brukeren mister
        // dermed ingen informasjon, kun en overflødig ekstra "bar" linje
        // for samme vare.
        const anyNameMatch = next.find((entry) => sameItemAs(entry));
        if (anyNameMatch) {
          if (!anyNameMatch.fromRecipes.includes(recipeTitle)) {
            anyNameMatch.fromRecipes.push(recipeTitle);
          }
          if (source) {
            anyNameMatch.sources = anyNameMatch.sources ?? [];
            if (!hasSameSource(anyNameMatch.sources, source)) anyNameMatch.sources.push(source);
          }
          if (!anyNameMatch.note && effective.note && isBuyingTipWorthKeeping(effective.name)) {
            anyNameMatch.note = effective.note;
          }
          continue;
        }
      }

      next.push({
        id: generateId(), // se lib/utils/id.ts – crypto.randomUUID() alene kan mangle i nettleseren
        amount: canMerge ? effectiveAmount : null,
        displayAmount: canMerge ? null : effective.amount,
        // Se rawIntervalText i lib/types.ts – bevarer «1-2 ts»/«8-10 blad»
        // som opprinnelig skrevet FØRSTE gang linjen opprettes (kun når
        // porsjonstallet er uendret; en skalert mengde har ikke lenger noe
        // meningsfullt forhold til oppskriftens egen intervall-tekst, så da
        // brukes heller det eksisterende, allerede godkjente skalerte
        // midtpunkt-tallet – ingen gjetning på hvordan et intervall skal
        // skaleres). Fjernes igjen så snart et andre bidrag slås sammen inn
        // (se exactMatch/compatMatch over). MERK: utelates også når
        // masse↔volum-whitelisten (over) faktisk konverterte linjen – den
        // originale intervall-TEKSTEN ("1-2") svarer da ikke lenger til den
        // viste enheten (f.eks. "ss" → "g"), så linjen faller i stedet
        // tilbake til det vanlige, allerede godkjente tallvisningen.
        rawIntervalText:
          canMerge && whitelistUnit == null && servingsMultiplier === 1 && looksLikeIntervalText(effective.amount)
            ? effective.amount
            : null,
        unit: effectiveUnit,
        // MERK: brukte tidligere å henge på item.note her (f.eks.
        // "løk (finhakket)") – ikke bare unødvendig detalj i en handleliste
        // (man trenger ikke vite HVORDAN man skjærer noe før man er på
        // kjøkkenet), men det ødela også sammenslåingen over: "løk
        // (finhakket)" og "løk (finrevet)" normaliserer til to ULIKE navn,
        // så "1 løk" to steder i samme oppskrift ble aldri gjenkjent som
        // samme vare. Notatet henges derfor ALDRI på selve navnet lenger –
        // se `note`-feltet under for de få tilfellene notatet faktisk skal
        // med (kjøpstips, ikke tilberedning).
        name: effective.name,
        // Basisvarer (salt, pepper, olje osv., se PANTRY_STAPLE_NAMES over)
        // legges automatisk til som avhuket/overstrøket – de aller fleste
        // har dette fra før, og slipper da å måtte fjerne den samme varen
        // manuelt hver gang. Helt vanlig avkrysningsboks, så det er bare å
        // klikke den bort igjen dersom man faktisk trenger å kjøpe akkurat
        // denne gangen (f.eks. gått tom for salt).
        checked: isPantryStaple(effective.name),
        fromRecipes: [recipeTitle],
        sources: source ? [source] : undefined,
        // Se isBuyingTipWorthKeeping over – kun vin-lignende ingredienser
        // tar med notatet sitt til handlelista (f.eks. "en fyldig rødvin,
        // Chianti eller lignende"), alt annet notat (kuttemåte,
        // romtemperert osv.) forblir kun i fremgangsmåten.
        note: effective.note && isBuyingTipWorthKeeping(effective.name) ? effective.note : undefined,
        // Satt KUN når aliasoppslaget traff en kjent kjøps-ID (se
        // keepPurchaseId/sameItemAs over) – gjør at en SENERE forekomst av
        // en annen skrivemåte av samme vare (f.eks. "maizena" etter
        // "maisenna") finner igjen og slår seg sammen med akkurat denne
        // linjen i stedet for å opprette en ny. Ingen `events`/
        // `garlicTotals` her – KEEP-linjer har ingen delressurs-modell, kun
        // selve matche-nøkkelen.
        purchaseMeta: keepPurchaseId
          ? { purchaseId: keepPurchaseId, ruleId: "KEEP", ruleVersion: "1.0.0" }
          : undefined,
      });
    }
  }

  return next;
}

/**
 * Enheter som beskriver en DEL av en hel vare, ikke noe man kjøper i akkurat
 * det antallet – man kjøper ikke "4 blader" i butikken, man kjøper ett
 * hjertesalat; man kjøper ikke "2 fedd", man kjøper en hel hvitløk. Når en
 * handlelistelinje har en av disse enhetene, gir det ingen mening å vise det
 * bokstavelige oppskrift-tallet – linjen kollapses i stedet til "1 <navn>",
 * uten enhet, siden ett eksemplar av varen normalt dekker det oppskriften(e)
 * trenger. Se tilbakemelding 27.08.2026 ("4 blader hjertesalat, da holder
 * det med 1 hjertesalat").
 *
 * Bevisst kort/konservativ liste – kun de klareste "del av en helhet"-
 * enhetene (blader, fedd, kvist, båt). Mer tvetydige enheter som "skiver"
 * (brød/bacon selges ofte i pakker med et bestemt skivetall, ikke som "1
 * stykke") er bevisst utelatt – en feilaktig kollaps er verre enn å la et
 * fåtall tilfeller vise det rå tallet.
 */
const WHOLE_ITEM_PART_UNITS = new Set(
  ["blad", "blader", "leaf", "leaves", "fedd", "clove", "cloves", "kvist", "kvister", "sprig", "sprigs", "båt", "båter", "wedge", "wedges"].map(
    (u) => u.toLowerCase(),
  ),
);

/**
 * Enheter som selv BETYR "tellbare, hele eksemplarer" – "stk" er den vanlige
 * norske forkortelsen for "stykk(er)" og brukes akkurat som ingen enhet i det
 * hele tatt (se f.eks. "0,5 stk. rødløk" – helt likeverdig med "0,5 løk" uten
 * enhet, bare skrevet med et eksplisitt "stk" av admin/AI-en som opprettet
 * oppskriften). Må derfor behandles helt likt som enhetsløse mengder under –
 * uten dette rundes f.eks. "0,5 stk. rødløk" IKKE opp, siden `!entry.unit`
 * alene ikke fanger opp at "stk" faktisk ER et enhetsløst antall. Se
 * tilbakemelding 27.08.2026 (screenshot: "0.5 stk. rødløk" og "0.5 stk.
 * sitron" viste seg fortsatt, siden begge har unit="stk", ikke unit=null).
 */
const DISCRETE_COUNT_UNITS = new Set(["stk", "stykk", "stykker", "pcs", "piece", "pieces"]);

export function formatShoppingAmount(entry: ShoppingListEntry): string {
  // Spesifikasjonens intervall-regel (§«Mengder, enheter og ukjent behov»)
  // – se rawIntervalText i lib/types.ts. Vises FØR all annen logikk under,
  // inkludert del-av-en-helhet-kollapsen rett under: en ferskurt oppgitt
  // som «8–10 blader» skal verken bli et midtpunkt-tall ELLER kollapses til
  // "1" (se H-seksjonens forbud mot bunt/potte-gjetning, FRESH_HERB_...
  // -settet rett under dekker kun den SEPARATE "ingen intervall"-saken).
  if (entry.rawIntervalText) {
    return [entry.rawIntervalText, entry.unit].filter(Boolean).join(" ");
  }

  if (entry.amount != null) {
    const normalizedUnit = normalizeUnit(entry.unit);

    // KJØPSNORMALISERT SITRON/LIME/APPELSIN/EGG/HVITLØK (v2, S/E/G) –
    // entry.amount er her ALLEREDE det ferdig utregnede, avrundede
    // kjøpsantallet (se mergeGovernedCitrusOrEgg/mergeGovernedGarlic i
    // mergeIngredientsIntoList over, som rekalkulerer det fra
    // entry.purchaseMeta ved hver tilføyelse) – ikke et råtall som skal
    // regnes om her ved visning. unit er alltid null for disse, så den
    // generiske enhetsløse-grenen lenger ned viser tallet direkte og
    // korrekt, uten noen egen spesialgren nødvendig.

    // H – FERSKE URTER (05.10.2026): spesifikasjonen forbyr EN HVER
    // automatisk blad/kvist/håndfull/ukjent → bunt/potte-konvertering for
    // nettopp disse radene (se FRESH_HERB_PART_UNIT_EXEMPT_IDS). Den
    // generelle del-av-en-helhet-kollapsen rett under («8 fedd» -> "1",
    // «4 limebåter» -> "1") er fortsatt riktig og UENDRET for alt annet
    // (hvitløksfedd, salatblader, limebåter) – kun disse navngitte
    // urterradene er unntatt.
    const isHerbPartUnitExempt =
      !!entry.purchaseMeta?.purchaseId && FRESH_HERB_PART_UNIT_EXEMPT_IDS.has(entry.purchaseMeta.purchaseId);

    if (!isHerbPartUnitExempt && normalizedUnit && WHOLE_ITEM_PART_UNITS.has(normalizedUnit)) {
      return "1";
    }

    // Enhetsløse mengder ("3 løk", "0,5 løk") og eksplisitte "stk"-mengder
    // ("0,5 stk. rødløk") representerer begge et antall HELE, tellbare
    // eksemplarer – man kan ikke kjøpe en halv løk i butikken, så et
    // ikke-heltall rundes alltid opp til nærmeste hele tall, minimum 1. Se
    // tilbakemelding 27.08.2026 ("0,5 løk" ble vist bokstavelig, "det er
    // unaturlig, da må det legges minimum 1 løk"). Gjelder kun disse to
    // tilfellene – ekte målenheter ("0,5 dl", "0,5 kg") er upåvirket.
    if ((!entry.unit || DISCRETE_COUNT_UNITS.has(normalizedUnit)) && entry.amount % 1 !== 0) {
      return String(Math.max(1, Math.ceil(entry.amount)));
    }

    const rounded =
      entry.amount % 1 === 0 ? entry.amount : Math.round(entry.amount * 100) / 100;
    return [rounded, entry.unit].filter(Boolean).join(" ");
  }
  if (entry.displayAmount) {
    return [entry.displayAmount, entry.unit].filter(Boolean).join(" ");
  }
  return entry.unit ?? "";
}

/**
 * Valgfritt, sekundært "kjøps-notat" til en handlelistelinje – i dag kun
 * hvitløk (§6): "1 hvitløk (ca. 7 fedd)" i stedet for å la det kollapsede
 * hoved-tallet ("1"/"2") stå helt alene og skjule hvor mye det faktisk er
 * tale om. Returnerer null for alt annet (inkludert hvitløk under
 * GARLIC_WHOLE_BULB_THRESHOLD, der "1 hvitløk" alene fortsatt er dekkende og
 * uendret fra før denne utvidelsen). Egen funksjon i stedet for å bake inn i
 * selve formatShoppingAmount-strengen, siden den brukes mange steder
 * (PDF-eksport, delingstekst, print) som forventer én enkel "mengde + enhet"-
 * streng – se ShoppingListView.tsx for hvor notatet vises separat, samme
 * mønster som kilde-/kjøpstips-linjene der.
 */
export function getPurchaseNote(entry: ShoppingListEntry): string | null {
  const meta = entry.purchaseMeta;
  if (!meta) return null;

  if (meta.reviewReason) {
    // Ukjent/ikke tallfestet delressurs innen minst én hendelse/gruppe – se
    // §ukjent mengde: linjen viser fortsatt det ferdig utregnede
    // minimumsantallet fra de KJENTE delene (entry.amount), men notatet
    // gjør det tydelig at det finnes et udekket behov i tillegg, i stedet
    // for å late som alt er dekket.
    return "usikker mengde i minst én oppskrift – kontroller behovet";
  }

  if (meta.ruleId === "G" && meta.garlicTotals) {
    const { totalCloves, reservedWholeHeads } = meta.garlicTotals;
    const parts: string[] = [];
    if (totalCloves > 0) parts.push(`${formatPlainNumber(totalCloves)} fedd`);
    if (reservedWholeHeads > 0) parts.push(`${formatPlainNumber(reservedWholeHeads)} hel(e)`);
    if (parts.length === 0) return null;
    return `ca. ${parts.join(" + ")} trengs`;
  }

  if (meta.ruleId === "S" && meta.events) {
    const fruit = meta.purchaseId === "lemon" ? "sitron" : meta.purchaseId === "lime" ? "lime" : "appelsin";
    const yieldInfo = CITRUS_YIELDS[meta.purchaseId as "lemon" | "lime" | "orange"];
    let juiceMl = 0;
    let zestMl = 0;
    for (const ev of meta.events) {
      const acc = {
        w: storedToQuantity(ev.buckets.W),
        jFruit: storedToQuantity(ev.buckets.Jfruit),
        jMl: storedToQuantity(ev.buckets.Jml),
        zFruit: storedToQuantity(ev.buckets.Zfruit),
        zMl: storedToQuantity(ev.buckets.Zml),
        bFruit: storedToQuantity(ev.buckets.Bfruit),
      };
      const result = computeCitrusGroupPurchaseCount(acc, meta.purchaseId as "lemon" | "lime" | "orange");
      if (result.juiceMlNeeded) juiceMl += result.juiceMlNeeded;
      if (result.zestMlNeeded) zestMl += result.zestMlNeeded;
    }
    const parts: string[] = [];
    if (juiceMl > 0) parts.push(`${formatPlainNumber(juiceMl)} ml saft`);
    if (zestMl > 0) parts.push(`${formatPlainNumber(zestMl)} ml skall`);
    if (parts.length === 0) return null;
    void fruit;
    return `${parts.join(" + ")} trengs`;
  }

  if (meta.ruleId === "E" && meta.events) {
    let whole = 0;
    let yolk = 0;
    let white = 0;
    for (const ev of meta.events) {
      whole += storedToQuantity(ev.buckets.whole).kind === "exact" ? (storedToQuantity(ev.buckets.whole) as { value: number }).value : 0;
      yolk += storedToQuantity(ev.buckets.yolk).kind === "exact" ? (storedToQuantity(ev.buckets.yolk) as { value: number }).value : 0;
      white += storedToQuantity(ev.buckets.white).kind === "exact" ? (storedToQuantity(ev.buckets.white) as { value: number }).value : 0;
    }
    const parts: string[] = [];
    if (whole > 0) parts.push(`${formatPlainNumber(whole)} hele`);
    if (yolk > 0) parts.push(`${formatPlainNumber(yolk)} plommer`);
    if (white > 0) parts.push(`${formatPlainNumber(white)} hviter`);
    if (parts.length === 0) return null;
    return parts.join(" + ");
  }

  return null;
}

function formatPlainNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : String(rounded).replace(".", ",");
}

// ---------------------------------------------------------------------------
// NY PRESENTASJON – «navn på hovedlinjen, mengde som diskret sekundærtekst»
// (06.10.2026, Henriks del 2-spesifikasjon). Bygger DIREKTE på den
// eksisterende formatShoppingAmount over (gjenbrukt uendret, ingen
// parallell tallformatterings-logikk) – det NYE her er kun (a) et skille
// mellom "eksakt, tellbart antall" og "tilnærmet/målt/konvertert mengde",
// som avgjør om "ca."-prefikset skal med, og (b) en grupperings-funksjon
// for de (sjeldne, se KRYSS-ENHET-SAMMENSLÅING i mergeIngredientsIntoList)
// tilfellene der SAMME vare har flere, ikke-sammenslåbare behov (f.eks.
// "15 g koriander" OG "1 håndfull koriander" i to ulike oppskrifter) – disse
// forblir to SEPARATE ShoppingListEntry-rader (ingen gjetning på hvordan de
// skal summeres, se eksisterende KRYSS-ENHET-kommentar), men vises samlet
// under ÉN rad/ett varenavn, slik at ingen informasjon går tapt eller må
// gjettes bort (Henriks eksplisitte krav).
// ---------------------------------------------------------------------------

/**
 * Sant dersom denne linjens mengde er en TILNÆRMET/MÅLT/KONVERTERT mengde
 * (ekte målenheter som g/kg/ml/l/dl/ss/ts, eller en vag enhet som
 * "håndfull"/"klype"/"skive") – disse får "ca."-prefiks i den nye
 * presentasjonen, se formatShoppingSecondaryAmount under. Usant for et
 * EKSAKT, tellbart antall hele eksemplarer (enhetsløse/«stk»-mengder, og de
 * allerede kollapsede "del av en helhet"-radene som viser "1") – man kjøper
 * nøyaktig så mange hele enheter, det er ikke et anslag. Også usant for et
 * bevart intervall (rawIntervalText, «1-2», «8-10») – det ER allerede et
 * spenn, et "ca." foran ville vært misvisende/redundant – og for
 * fritekst-fallback (entry.displayAmount, f.eks. "etter smak") – ikke et
 * tall å anslå i det hele tatt, vises akkurat som skrevet.
 *
 * MERK: ser på "hvilken ENHET er dette", ikke "ble tallet faktisk avrundet
 * akkurat nå" – et enkelt, uendret bidrag ("90 g smør" fra én oppskrift,
 * ingen sammenslåing involvert) er like mye et ANSLAG å handle etter som et
 * sammenslått/konvertert tall, siden man uansett ikke kjøper nøyaktig
 * 90,00 g smør i butikken.
 */
export function isApproximateShoppingAmount(entry: ShoppingListEntry): boolean {
  if (entry.rawIntervalText) return false;
  if (entry.amount == null) return false;
  const normalizedUnit = normalizeUnit(entry.unit);
  const isHerbPartUnitExempt =
    !!entry.purchaseMeta?.purchaseId && FRESH_HERB_PART_UNIT_EXEMPT_IDS.has(entry.purchaseMeta.purchaseId);
  if (!isHerbPartUnitExempt && normalizedUnit && WHOLE_ITEM_PART_UNITS.has(normalizedUnit)) return false;
  if (!entry.unit || DISCRETE_COUNT_UNITS.has(normalizedUnit)) return false;
  return true;
}

/**
 * Sekundærtekst-mengden for ÉN visningsgruppe (vanligvis ett eneste bidrag –
 * se groupShoppingEntriesForDisplay under for de sjeldne tilfellene med
 * flere). Gjenbruker formatShoppingAmount for selve tall-/enhet-formateringen
 * av HVER rad, og legger kun på ETT delt "ca."-prefiks foran HELE den
 * sammenslåtte teksten dersom MINST én av radene faktisk er en tilnærmet
 * mengde (se isApproximateShoppingAmount) – «ca. 15 g + 1 håndfull», ikke
 * «ca. 15 g + ca. 1 håndfull», se Henriks eget eksempel. Returnerer "" for
 * en helt tom/ukvantifisert vare (f.eks. bart "salt" uten mengde i det hele
 * tatt) – kalleren viser da ingen sekundærlinje overhodet, se
 * ShoppingListView.tsx.
 */
export function formatShoppingSecondaryAmount(entries: ShoppingListEntry[]): string {
  const parts = entries
    .map((entry) => ({ text: formatShoppingAmount(entry).trim(), approximate: isApproximateShoppingAmount(entry) }))
    .filter((part) => part.text.length > 0);
  if (parts.length === 0) return "";
  const joined = parts.map((part) => part.text).join(" + ");
  return parts.some((part) => part.approximate) ? `ca. ${joined}` : joined;
}

/**
 * Én visningsgruppe – ÉN rad/ett varenavn i den nye presentasjonen, se
 * filheaderen over. `checked` er sann kun når ALLE underliggende rader er
 * avhuket (en gruppe med flere, ikke-sammenslåtte behov vises/avhukes som
 * én samlet enhet i UI-et, se ShoppingListView.tsx).
 */
export interface ShoppingDisplayGroup {
  key: string;
  name: string;
  entries: ShoppingListEntry[];
  checked: boolean;
}

/** Samme vare-identitet som sameItemAs i mergeIngredientsIntoList (over) –
 * kjøps-ID når aliasoppslaget traff en kjent vare (dekker også S/G/E, som
 * alltid er én enkelt rad per purchaseId og derfor trivielt blir en
 * gruppe på én), ellers mergeIdentity-nøkkelen på navn+enhet. INGEN ny,
 * parallell "er dette samme vare"-regel – kun den samme identiteten
 * gjenbrukt for VISNINGS-gruppering i stedet for sammenslåing. */
function displayGroupKey(entry: ShoppingListEntry): string {
  if (entry.purchaseMeta?.purchaseId) return `p:${entry.purchaseMeta.purchaseId}`;
  return `n:${mergeIdentity(entry.name, entry.unit).key}`;
}

/**
 * Grupperer en liste med ShoppingListEntry til visningsgrupper – se
 * ShoppingDisplayGroup over. For de aller fleste varer er dette en 1:1
 * passthrough (allerede slått sammen til én rad av mergeIngredientsIntoList);
 * grupperer kun faktisk sammen de sjeldne tilfellene der samme vare har
 * flere, bevisst IKKE-sammenslåtte behov (inkompatible enheter, se
 * KRYSS-ENHET-SAMMENSLÅING-kommentaren der). Bevarer rekkefølgen varene
 * først dukker opp i `entries`.
 */
export function groupShoppingEntriesForDisplay(entries: ShoppingListEntry[]): ShoppingDisplayGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, ShoppingListEntry[]>();
  for (const entry of entries) {
    const key = displayGroupKey(entry);
    const list = byKey.get(key);
    if (list) {
      list.push(entry);
    } else {
      byKey.set(key, [entry]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const groupEntries = byKey.get(key)!;
    return {
      key,
      name: groupEntries[0].name,
      entries: groupEntries,
      checked: groupEntries.every((e) => e.checked),
    };
  });
}

/**
 * Del/eksporter-linje for ÉN visningsgruppe (06.10.2026, Henriks del 3-
 * spesifikasjon) – komprimerer den to-linjers på-skjerm-presentasjonen
 * (navn, så mengde under) til ÉN linje («Kremfløte — ca. 6 dl») for
 * tekstbasert deling (Notater o.l.), UTEN at noen mengdeinformasjon går
 * tapt – samme formatShoppingSecondaryAmount som på-skjerm-visningen,
 * bare satt sammen på én linje i stedet for to. En helt ukvantifisert vare
 * (ingen mengde i det hele tatt) vises med bare navnet, uten en tom
 * "— "-rest.
 */
export function formatShoppingShareLine(group: ShoppingDisplayGroup): string {
  const amount = formatShoppingSecondaryAmount(group.entries);
  return amount ? `${group.name} — ${amount}` : group.name;
}

/**
 * BUTIKKATEGORIER (05.10.2026, redesign av Handleliste-siden – "Grupper
 * handlelisten etter butikkategori i stedet for én lang liste") – samme
 * prinsipp som PANTRY_STAPLE_PATTERNS over: en fast, deterministisk
 * ordliste per kategori (ingen AI – rask, gratis, 100 % forutsigbart likt
 * for alle), matchet som HELE, avgrensede ord/fraser (\b…\b) på et
 * normalisert navn. Bevisst en EKSTRA, uavhengig klassifisering (ikke
 * samme liste som PANTRY_STAPLE_PATTERNS) – "basisvare" (har du antakelig
 * fra før) og "butikkategori" (hvor i butikken den står) er to helt ulike
 * spørsmål; et avhuket basisvare-eple ville likevel trengt en kategori
 * dersom det en dag dukket opp uavhuket.
 *
 * Rekkefølgen under (SHOPPING_CATEGORY_ORDER) følger en vanlig norsk
 * dagligvarebutikks naturlige gangretning – frukt/grønt og ferskvarer først
 * (slik de fleste butikker er lagt opp), tørrvarer/krydder i midten, drikke
 * og "annet" sist. Katalogen er bevisst ikke uttømmende – nye/sjeldne
 * ingrediensnavn som ikke matcher noe havner i "annet" (catch-all) i stedet
 * for å krasje eller gjette feil; listene kan utvides etter hvert som nye
 * "annet"-tilfeller dukker opp i praksis.
 *
 * Sjekkes i en FAST rekkefølge (CATEGORY_CHECK_ORDER) – ikke samme som
 * visningsrekkefølgen – fra mest spesifikke/trange ordforråd (meieri, kjøtt/
 * fisk) til bredest/mest generelle (tørrvarer er en svært bred kategori og
 * sjekkes derfor nest sist, rett før catch-all "annet"), slik at f.eks.
 * "kyllingbuljong" (inneholder både "kylling" og "buljong") havner i
 * tørrvarer (buljongterninger er hylle-/tørrvare) og ikke i kjøtt/fisk.
 */
export type ShoppingCategoryKey =
  | "produce"
  | "meatFish"
  | "dairy"
  | "frozen"
  | "bakery"
  | "pantry"
  | "spicesSauces"
  | "drinks"
  | "other";

/** Visningsrekkefølge – følger butikkens gangretning, se filheaderen over. */
export const SHOPPING_CATEGORY_ORDER: ShoppingCategoryKey[] = [
  "produce",
  "meatFish",
  "dairy",
  "frozen",
  "bakery",
  "pantry",
  "spicesSauces",
  "drinks",
  "other",
];

type MatchableCategory = Exclude<ShoppingCategoryKey, "other">;

const CATEGORY_KEYWORDS: Record<MatchableCategory, string[]> = {
  dairy: [
    "melk",
    "helmelk",
    "lettmelk",
    "skummet melk",
    "fløte",
    "kremfløte",
    "matfløte",
    "rømme",
    "yoghurt",
    "gresk yoghurt",
    "naturell yoghurt",
    "smør",
    "ost",
    "parmesan",
    "parmesanost",
    "mozzarella",
    "burrata",
    "fetaost",
    "feta",
    "cheddar",
    "brie",
    "gauda",
    "norvegia",
    "jarlsberg",
    "kremost",
    "cottage cheese",
    "kesam",
    "egg",
    "eggehvite",
    "eggeplomme",
    "creme fraiche",
    "crème fraîche",
    "kefir",
    "skyr",
    "gulost",
    "blåmuggost",
    "geitost",
    "ricotta",
    "milk",
    "cream",
    "heavy cream",
    "sour cream",
    "yogurt",
    "yoghurt",
    "butter",
    "cheese",
    "cream cheese",
    "cottage cheese",
    "eggs",
    "egg white",
    "egg yolk",
  ],
  meatFish: [
    "kylling",
    "kyllingfilet",
    "kyllinglår",
    "kyllingbryst",
    "biff",
    "storfekjøtt",
    "svinekjøtt",
    "svinefilet",
    "lammekjøtt",
    "lammekoteletter",
    "bacon",
    "pølse",
    "pølser",
    "wienerpølse",
    "karbonade",
    "karbonadedeig",
    "kjøttdeig",
    "laks",
    "røkelaks",
    "gravlaks",
    "torsk",
    "ørret",
    "reker",
    "blåskjell",
    "makrell",
    "breiflabb",
    "lysing",
    "uer",
    "uerfilet",
    "sei",
    "seifilet",
    "kveite",
    "piggvar",
    "steinbit",
    "hyse",
    "rødspette",
    "fisk",
    "fiskefilet",
    "skalldyr",
    "krabbe",
    "hummer",
    "skinke",
    "parmaskinke",
    "entrecôte",
    "mørbrad",
    "indrefilet",
    "ytrefilet",
    "kalkun",
    "andebryst",
    "lever",
    "nduja",
    "salami",
    "chorizo",
    "pepperoni",
    "kjøttboller",
    "chicken",
    "chicken breast",
    "chicken thigh",
    "beef",
    "pork",
    "lamb",
    "bacon",
    "sausage",
    "sausages",
    "ground beef",
    "ground pork",
    "mince",
    "minced meat",
    "salmon",
    "smoked salmon",
    "cod",
    "trout",
    "shrimp",
    "prawns",
    "mussels",
    "mackerel",
    "fish fillet",
    "seafood",
    "crab",
    "lobster",
    "ham",
    "prosciutto",
    "turkey",
    "duck",
    "liver",
    "meatballs",
  ],
  produce: [
    "løk",
    "rødløk",
    "sjalottløk",
    "hvitløk",
    // (05.10.2026, Henrik: "hvitløk blir lagt i frukt og grønt, men
    // hvitløksfedd ligger i annet") – "hvitløksfedd" er et norsk
    // SAMMENSATT ord (hvitløk + s + fedd, uten mellomrom), så \bhvitløk\b
    // traff aldri midt inni det (ingen ordgrense mellom "hvitløk" og
    // "sfedd"). Lagt til som egen, eksplisitt oppføring i stedet for en
    // generell prefiks-match-regel for alle nøkkelord – en slik generell
    // regel ville gitt ekte risiko for FEILAKTIGE kategorier andre steder
    // (f.eks. "kylling" som prefiks midt i en annen sammensatt tørrvare),
    // og katalogens egen filosofi (se filheaderen) er at et ukjent navn
    // heller skal havne trygt i "annet" enn gjette feil. Legg til flere
    // sammensatte former her etter hvert som de dukker opp i praksis.
    "hvitløksfedd",
    "vårløk",
    "purre",
    "gulrot",
    "gulrøtter",
    "potet",
    "poteter",
    "nypotet",
    "søtpotet",
    "tomat",
    "tomater",
    "cherrytomat",
    "agurk",
    "paprika",
    "salat",
    "hjertesalat",
    "romanosalat",
    "ruccola",
    "spinat",
    "brokkoli",
    "blomkål",
    "kål",
    "rødkål",
    "hvitkål",
    "grønnkål",
    "savoykål",
    "rosenkål",
    "selleri",
    "fennikel",
    "squash",
    "courgette",
    "aubergine",
    "champignon",
    "sopp",
    "kantarell",
    "steinsopp",
    "sitron",
    "lime",
    "appelsin",
    "mandarin",
    "grapefrukt",
    "eple",
    "pære",
    "banan",
    "avokado",
    "chili",
    "ingefær",
    "persille",
    "bladpersille",
    "basilikum",
    "koriander",
    "dill",
    "timian",
    "rosmarin",
    "mynte",
    "salvie",
    "estragon",
    "gressløk",
    "reddik",
    "asparges",
    "grønne erter",
    "mais",
    "grønne bønner",
    "brekkbønner",
    "jordbær",
    "bringebær",
    "blåbær",
    "rips",
    "solbær",
    "bjørnebær",
    "drue",
    "druer",
    "fersken",
    "aprikos",
    "plomme",
    "mango",
    "ananas",
    "granateple",
    "rabarbra",
    "ramsløk",
    "rødbet",
    "kålrot",
    "onion",
    "red onion",
    "shallot",
    "garlic",
    "spring onion",
    "scallion",
    "leek",
    "carrot",
    "carrots",
    "potato",
    "potatoes",
    "new potatoes",
    "sweet potato",
    "tomato",
    "tomatoes",
    "cherry tomatoes",
    "cucumber",
    "bell pepper",
    "lettuce",
    "arugula",
    "rocket",
    "spinach",
    "broccoli",
    "cauliflower",
    "cabbage",
    "red cabbage",
    "kale",
    "brussels sprouts",
    "celery",
    "fennel",
    "zucchini",
    "eggplant",
    "aubergine",
    "mushroom",
    "mushrooms",
    "chanterelle",
    "lemon",
    "orange",
    "mandarin",
    "grapefruit",
    "apple",
    "pear",
    "banana",
    "avocado",
    "chilli",
    "ginger",
    "parsley",
    "basil",
    "cilantro",
    "coriander",
    "thyme",
    "rosemary",
    "mint",
    "sage",
    "tarragon",
    "chives",
    "radish",
    "asparagus",
    "peas",
    "corn",
    "green beans",
    "strawberry",
    "raspberry",
    "blueberry",
    "grape",
    "grapes",
    "peach",
    "apricot",
    "plum",
    "pineapple",
    "pomegranate",
    "rhubarb",
    "beetroot",
    "swede",
  ],
  bakery: [
    "brød",
    "loff",
    "rundstykker",
    "rundstykke",
    "baguette",
    "lefse",
    "pita",
    "focaccia",
    "ciabatta",
    "knekkebrød",
    "gjær",
    "bakepulver",
    "natron",
    "boller",
    "grovbrød",
    "bread",
    "baguette",
    "tortilla",
    "focaccia",
    "ciabatta",
    "crispbread",
    "yeast",
    "baking powder",
    "baking soda",
    "buns",
    "rolls",
  ],
  frozen: ["frossen", "fryst", "iskrem", "frosne bær", "frosne erter", "frozen", "ice cream", "frozen peas", "frozen berries"],
  drinks: [
    "rødvin",
    "hvitvin",
    "musserende vin",
    "champagne",
    "prosecco",
    "øl",
    "brus",
    "cola",
    "juice",
    "eplejuice",
    "appelsinjuice",
    "kaffe",
    "te",
    "mineralvann",
    "red wine",
    "white wine",
    "sparkling wine",
    "champagne",
    "prosecco",
    "beer",
    "soda",
    "cola",
    "juice",
    "coffee",
    "sparkling water",
  ],
  spicesSauces: [
    "krydder",
    "spisskummen",
    "karve",
    "karripulver",
    "karri",
    "paprikapulver",
    "chiliflak",
    "chilipulver",
    "cayennepepper",
    "muskat",
    "kanel",
    "kardemomme",
    "nellik",
    "vaniljesukker",
    "vaniljestang",
    "soyasaus",
    "fiskesaus",
    "østerssaus",
    "sesamolje",
    "sennep",
    "dijonsennep",
    "ketchup",
    "majones",
    "pesto",
    "tabasco",
    "worcestersaus",
    "harissa",
    "sambal oelek",
    "sriracha",
    "tahini",
    "honning",
    "lønnesirup",
    "sirup",
    "kapers",
    "oliven",
    "sylteagurk",
    "tomatpuré",
    "spice",
    "spices",
    "cumin",
    "caraway",
    "curry powder",
    "chili flakes",
    "cayenne pepper",
    "nutmeg",
    "cinnamon",
    "cardamom",
    "cloves",
    "vanilla sugar",
    "vanilla pod",
    "soy sauce",
    "fish sauce",
    "oyster sauce",
    "sesame oil",
    "mustard",
    "dijon mustard",
    "ketchup",
    "mayo",
    "mayonnaise",
    "pesto",
    "worcestershire",
    "harissa",
    "sriracha",
    "tahini",
    "honey",
    "maple syrup",
    "syrup",
    "capers",
    "olives",
    "pickles",
    "tomato paste",
    "tomato puree",
  ],
  pantry: [
    "ris",
    "basmatiris",
    "jasminris",
    "pasta",
    "spaghetti",
    "rigatoni",
    "penne",
    "fusilli",
    "tagliatelle",
    "lasagneplater",
    "couscous",
    "bulgur",
    "linser",
    "røde linser",
    "kikerter",
    "hermetiske tomater",
    "hermetisk tomat",
    "hermetikk",
    "hermetiske bønner",
    "hvite bønner",
    "svarte bønner",
    "kidneybønner",
    "havregryn",
    "quinoa",
    "nøtter",
    "mandler",
    "valnøtter",
    "peanøtter",
    "cashewnøtter",
    "pinjekjerner",
    "hasselnøtter",
    "tørket frukt",
    "rosiner",
    "buljong",
    "buljongterning",
    "kraft",
    "kyllingkraft",
    "grønnsakskraft",
    "polenta",
    "panko",
    "brødsmuler",
    "sprøstekt løk",
    "rice",
    "pasta",
    "spaghetti",
    "rigatoni",
    "penne",
    "fusilli",
    "couscous",
    "bulgur",
    "lentils",
    "chickpeas",
    "canned tomatoes",
    "canned beans",
    "white beans",
    "black beans",
    "kidney beans",
    "oats",
    "quinoa",
    "nuts",
    "almonds",
    "walnuts",
    "peanuts",
    "cashews",
    "pine nuts",
    "hazelnuts",
    "dried fruit",
    "raisins",
    "stock",
    "stock cube",
    "broth",
    "chicken stock",
    "vegetable stock",
    "polenta",
    "panko",
    "breadcrumbs",
  ],
};

/** Rekkefølgen de ulike kategoriene SJEKKES i – smalest/mest spesifikt
 * ordforråd først, se filheaderen over. */
const CATEGORY_CHECK_ORDER: MatchableCategory[] = [
  "dairy",
  "meatFish",
  "produce",
  "bakery",
  "frozen",
  "drinks",
  "spicesSauces",
  "pantry",
];

type CategoryMatcher = { pattern: RegExp; termLength: number; category: MatchableCategory };

/** Flat liste av alle (kategori, nokkelord)-par, i CATEGORY_CHECK_ORDER. Brukt
 * av categorizeShoppingItem under til a finne det mest SPESIFIKKE treffet pa
 * tvers av ALLE kategorier - ikke bare forste kategori i sjekkerekkefolgen,
 * se neste kommentar. */
const CATEGORY_MATCHERS: CategoryMatcher[] = CATEGORY_CHECK_ORDER.flatMap((category) =>
  CATEGORY_KEYWORDS[category].map(normalizeName).map((term) => ({
    pattern: new RegExp(`\\b${term}\\b`),
    termLength: term.length,
    category,
  })),
);

/** Klassifiserer et handlelistenavn til en butikkategori (se filheaderen
 * over) – "other" (ANNET) er alltid et trygt fallback for navn som ikke
 * matcher noe kjent.
 *
 * Matcher mot ALLE kategorier og velger den mest SPESIFIKKE (lengste)
 * nokkelordfrasen som treffer, fremfor bare forste kategori i
 * CATEGORY_CHECK_ORDER. Dette trengs fordi flere kategorier kan treffe
 * samtidig pa ulikt presisjonsniva - f.eks. inneholder "400 g hermetiske
 * tomater" bade pantry sin flerords-frase "hermetiske tomater" (19 tegn) OG
 * produce sitt enkeltstaende, generiske ord "tomater" (7 tegn). Uten denne
 * lengde-regelen ville produce (som sjekkes for pantry i CATEGORY_CHECK_ORDER)
 * vunnet feilaktig over den mer presise hermetikk-frasen. Ved likt antall
 * tegn brukes CATEGORY_CHECK_ORDER som tiebreak (forste i rekkefolgen
 * vinner). */
export function categorizeShoppingItem(name: string): ShoppingCategoryKey {
  const normalized = normalizeName(name);
  let best: CategoryMatcher | null = null;
  for (const matcher of CATEGORY_MATCHERS) {
    if (!matcher.pattern.test(normalized)) continue;
    if (!best || matcher.termLength > best.termLength) {
      best = matcher;
    }
  }
  return best?.category ?? "other";
}
