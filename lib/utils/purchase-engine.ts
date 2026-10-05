/**
 * KJØPSNORMALISERING v2 – deterministisk regelmotor etter Henriks spesifikasjon
 * `shopping-list-purchase-normalization-spec.md` v1.0 (5. oktober 2026), som er
 * produktgodkjent og autoritativ (se samtalen/commit-historikken for selve
 * bestillingen). INGEN AI, INGEN fuzzy matching, INGEN heuristikk i runtime –
 * kun eksakt oppslag i det genererte aliasregisteret
 * (lib/utils/purchase-registry-data.ts, 734 rader + U1/U2, mekanisk generert
 * fra spesifikasjonsteksten), typede enhetsregler og noen få godkjente og
 * AKTIVE empiriske konstanter (sitrus-yields, hvitløk-fedd-per-løk) som
 * spesifikasjonen selv erklærer godkjent og aktiv.
 *
 * Denne filen implementerer:
 *  - Eksakt aliasoppslag (ALIAS_INDEX) – høyeste presedens, se presedensregel 1.
 *  - Et generalisert, men fortsatt deterministisk N-fallback-mønster for
 *    biprodukter («X fra Y») for råvarenavn som IKKE allerede finnes eksakt i
 *    registeret (alle kjente biprodukt-fraser i CONVITE i dag er allerede
 *    dekket av eksakte aliaser til `byproduct_*`, se N-seksjonen).
 *  - Typet mengde-/enhetstolkning: eksakt tall, intervall [lav,høy], ukjent;
 *    desimal komma/punktum, enkle og blandede brøker, ingen gjetning på
 *    negative/ugyldige uttrykk.
 *  - De tre delte ressursmodellene S (sitron/lime/appelsin), G (hvitløk) og E
 *    (egg), samt generisk WHOLE_UNIT-avrunding for de øvrige 35 radene.
 *  - PANTRY-flagg for det konservative 8-vare-settet (seksjon B).
 *  - REVIEW/fallback som ALDRI gjetter – ukjent råvare/form bevares uendret
 *    og flagges med en konkret auditflagg-grunn.
 *
 * Alt som IKKE eksplisitt er godkjent i spesifikasjonen (nye yields, nye
 * aliaser, nye pakningsstørrelser, stemming/pluralmorfologi utover de
 * karaktertegn-nivå-variantene som alt ligger i aliasregisteret) er med
 * vilje IKKE implementert her – se §9/§12 i spesifikasjonens presedensregler.
 */

import { PURCHASE_ALIASES, type PurchaseAlias } from "./purchase-registry-data";
import { normalizeUnit as classifyMetricUnit, metricUnitToBaseFactor, type MetricUnitKind } from "@/lib/utils/units";

// ---------------------------------------------------------------------------
// Aliasoppslag (eksakt, etter begrenset normalisering – se presedensregel 1 og
// den innledende teksten til aliasregisteret: «Oppslag er eksakt etter den
// begrensede tekstnormaliseringen»). Normaliseringen her er bevisst MINIMAL
// (trim, lowercase, kollaps av mellomrom) – INGEN stemming, INGEN fjerning av
// tegn utover det, slik at hele aliasregisterets 734 eksakte strenger fortsatt
// er de eneste som treffer.
// ---------------------------------------------------------------------------

export function normalizeAliasKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const ALIAS_INDEX: Map<string, PurchaseAlias> = new Map(
  PURCHASE_ALIASES.map((a) => [normalizeAliasKey(a.name), a]),
);

export function lookupAlias(name: string): PurchaseAlias | null {
  return ALIAS_INDEX.get(normalizeAliasKey(name)) ?? null;
}

// ---------------------------------------------------------------------------
// N – biprodukt-fallback for navn som IKKE finnes eksakt i registeret.
// Alle i dag kjente biproduktfraser («kraft fra kyllingen», «olje fra de
// soltørkede tomatene», «lake fra sylteagurken», «stekesmør fra biff», osv.)
// er allerede eksakte aliaser til `byproduct_*` (se N-seksjonen), så dette er
// bevisst bare et sikkerhetsnett for FREMTIDIGE oppskrifter med en tilsvarende
// formulering som ikke er i registeret ennå – aldri en erstatning for
// aliasoppslaget. Eksplisitte kjøps-/tilsetningsmarkører («kjøpt»,
// «ferdigkjøpt», «tilsatt», «tilsett», «ekstra») har presedens og blokkerer
// klassifiseringen, se N-seksjonen.
// ---------------------------------------------------------------------------

const BYPRODUCT_TRIGGER_WORDS = [
  "kraft",
  "sjy",
  "stekesjy",
  "fett",
  "stekefett",
  "stekesmør",
  "andefett",
  "olje",
  "lake",
  "væske",
  "kokevann",
];
const BYPRODUCT_PATTERN = new RegExp(`\\b(${BYPRODUCT_TRIGGER_WORDS.join("|")})\\b[^.;]*\\bfra\\b`);
const PURCHASE_OVERRIDE_MARKERS = ["kjøpt", "ferdigkjøpt", "tilsatt", "tilsett", "ekstra"];
const PURCHASE_OVERRIDE_PATTERN = new RegExp(`\\b(${PURCHASE_OVERRIDE_MARKERS.join("|")})\\b`);

/** Sant hvis (navn, notat) matcher det generelle, deterministiske
 * biprodukt-mønsteret `[kraft|sjy|...] fra [...]`, og INGEN eksplisitt
 * kjøps-/tilsetningsmarkør står i samme tekst (som ville gitt presedens for å
 * beholde leddet som kjøpsvare – se N-seksjonen). Brukes KUN som fallback når
 * aliasoppslaget ikke traff. */
export function matchesGenericByproductPattern(name: string, note: string | null): boolean {
  const haystack = normalizeAliasKey(`${name} ${note ?? ""}`);
  if (PURCHASE_OVERRIDE_PATTERN.test(haystack)) return false;
  return BYPRODUCT_PATTERN.test(haystack);
}

// ---------------------------------------------------------------------------
// Mengde-/brøk-/intervall-tolkning (§ «Mengder, enheter og ukjent behov»).
// ---------------------------------------------------------------------------

export type ParsedQuantity =
  | { kind: "exact"; value: number }
  | { kind: "interval"; low: number; high: number }
  | { kind: "unknown" };

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };

function parseSingleNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (s in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[s];
  const mixedUnicode = s.match(/^(\d+)\s*([¼½¾])$/);
  if (mixedUnicode) return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];
  const mixedAscii = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedAscii) {
    const denom = Number(mixedAscii[3]);
    if (denom === 0) return null;
    return Number(mixedAscii[1]) + Number(mixedAscii[2]) / denom;
  }
  const asciiFraction = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (asciiFraction) {
    const denom = Number(asciiFraction[2]);
    if (denom === 0) return null;
    return Number(asciiFraction[1]) / denom;
  }
  const dec = s.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(dec)) return null;
  const num = Number(dec);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return num;
}

/** Tolker en rå mengde-streng som eksakt tall, intervall [lav,høy] eller
 * ukjent – ALDRI som en gjennomsnittlig/midtpunkt-verdi (det ville tapt
 * informasjon spesifikasjonen krever bevart, se intervall-regelen). Et
 * «ca.»-prefiks fjernes før selve tall-tolkningen (et anslag, ikke en målt
 * garanti – se §«ca.»), men påvirker ikke hvilken grein som treffer.
 * Ugyldige/negative uttrykk gir ukjent (REVIEW), ALDRI 0 eller en gjetning. */
export function parseQuantityValue(raw: string | null | undefined): ParsedQuantity {
  if (raw == null) return { kind: "unknown" };
  const trimmed = raw.trim().replace(/^ca\.?\s*/i, "").trim();
  if (!trimmed) return { kind: "unknown" };

  const rangeMatch = trimmed.match(
    /^([¼½¾]|\d+(?:\s+\d+\/\d+)?(?:[.,]\d+)?|\d+\/\d+)\s*[-–]\s*([¼½¾]|\d+(?:\s+\d+\/\d+)?(?:[.,]\d+)?|\d+\/\d+)$/,
  );
  if (rangeMatch) {
    const low = parseSingleNumber(rangeMatch[1]);
    const high = parseSingleNumber(rangeMatch[2]);
    if (low == null || high == null) return { kind: "unknown" };
    return { kind: "interval", low, high };
  }

  const value = parseSingleNumber(trimmed);
  if (value == null) return { kind: "unknown" };
  return { kind: "exact", value };
}

/** Øvre grense for en tolket mengde – brukt til W/Y-avrunding («beregnet fra
 * øvre behov»), ALDRI til vanlig KEEP-visning (der skal hele intervallet
 * bevares uendret). */
export function upperBound(q: ParsedQuantity): number | null {
  if (q.kind === "exact") return q.value;
  if (q.kind === "interval") return q.high;
  return null;
}

/** Summerer to tolkede mengder punktvis (eksakt+eksakt=eksakt,
 * alt med minst ett intervall blir et intervall, ukjent forblir ukjent og
 * SKAL ALDRI behandles som 0 av kalleren). */
export function addQuantities(a: ParsedQuantity, b: ParsedQuantity): ParsedQuantity {
  if (a.kind === "unknown" || b.kind === "unknown") return { kind: "unknown" };
  const aLow = a.kind === "exact" ? a.value : a.low;
  const aHigh = a.kind === "exact" ? a.value : a.high;
  const bLow = b.kind === "exact" ? b.value : b.low;
  const bHigh = b.kind === "exact" ? b.value : b.high;
  if (a.kind === "exact" && b.kind === "exact") return { kind: "exact", value: a.value + b.value };
  return { kind: "interval", low: aLow + bLow, high: aHigh + bHigh };
}

export const ZERO_QUANTITY: ParsedQuantity = { kind: "exact", value: 0 };

// ---------------------------------------------------------------------------
// Metrisk grunnenhet (gjenbruker den eksisterende, delte lib/utils/units.ts –
// samme kilde som resten av filen allerede bruker for kryss-enhet-sammenslåing
// av ordinære KEEP-varer. Kun g/kg (vekt) og ml/l/dl/ss/ts (volum) er
// kompatible «rene mål» – se presedens: «toppet ss», «stor skje», scoop, cup,
// pinch har ingen faktor og klassifiseres derfor aldri her).
// ---------------------------------------------------------------------------

// Spesifikasjonens EGNE, eksplisitt definerte norske kjøkkenmål for
// yield-/ressursmatematikken i S/G/E (§«Mengder, enheter og ukjent behov»:
// «1 ss = 15 ml, 1 ts = 5 ml. Dette er definerte norske kjøkkenmål, ikke
// råvare-yields.») – IKKE samme tall som lib/utils/units.ts sine
// ML_PER_TBSP/ML_PER_TSP (14,7868/4,92892), som er den presise amerikanske
// tablespoon/teaspoon-definisjonen brukt til metrisk→US-visningskonvertering
// et helt annet sted i appen. De to tallsettene tjener bevisst ulike formål
// og skal IKKE dele konstant – oppdaget via testmatrisen (T001/T003/T005/
// T084 forventer «22,5 ml», «30 ml», «10 ml», «15 ml», ikke de US-presise
// tallene en delt faktor ville gitt).
const PURCHASE_ML_PER_SS = 15;
const PURCHASE_ML_PER_TS = 5;

export function toMetricBase(amount: number, unit: string | null): { base: "g" | "ml"; value: number } | null {
  if (!unit) return null;
  const kind: MetricUnitKind | null = classifyMetricUnit(unit);
  if (!kind) return null;
  if (kind === "ss") return { base: "ml", value: amount * PURCHASE_ML_PER_SS };
  if (kind === "ts") return { base: "ml", value: amount * PURCHASE_ML_PER_TS };
  const { base, factor } = metricUnitToBaseFactor(kind);
  return { base, value: amount * factor };
}

export const DISCRETE_COUNT_UNITS = new Set(["stk", "stykk", "stykker", "pcs", "piece", "pieces"]);

// ---------------------------------------------------------------------------
// B – konservativt basisvaresett (seksjon B). EKSAKT de 8 oppgitte ID-ene –
// ikke en bredere ordliste. Dette er en SEPARAT klassifisering fra den
// eksisterende isPantryStaple-funksjonen i shopping-list.ts (som styrer
// "automatisk avhuket i UI"-adferden og bevares uendret, se eget avsnitt i
// commit-meldingen) – PANTRY_CANONICAL_IDS her brukes kun til den nye
// regelmotorens egen rapportering/flagging.
// ---------------------------------------------------------------------------

export const PANTRY_CANONICAL_IDS: ReadonlySet<string> = new Set([
  "salt",
  "salt_fine",
  "pepper_black_ground",
  "pepper_unspecified",
  "neutral_oil",
  "olive_oil",
  "sugar_white",
  "wheat_flour",
]);

// ---------------------------------------------------------------------------
// H – ferske urter (seksjon H): «ingen automatisk gram/ss/blad/kvist/
// håndfull/ukjent → bunt/potte-konvertering i det hele tatt». Dette settet
// er hentet DIREKTE fra hovedtabellens rader som selv er markert med nettopp
// dette forbeholdet (Persille, Timian, Oregano, Koriander (fersk), Vårløk,
// Basilikum, Dill, Gressløk, Rosmarin, Mynte, Stangselleri, Asparges,
// Estragon, Salvie, Urter (uspesifisert)) – ikke en egen, oppfunnet liste.
// Brukes KUN til å unnta disse radene fra den eksisterende, generelle
// del-av-en-helhet-sammenslåingen i shopping-list.ts (mergeIdentity/
// WHOLE_ITEM_PART_UNITS), som – helt uavhengig av denne spesifikasjonen –
// kollapser «8 blad»/«2 kvist» til kjøpsantall "1" for andre varer (f.eks.
// salatblader, hvitløksfedd, limebåter). Den generelle oppførselen er
// fortsatt riktig og UENDRET for alt som ikke står i dette settet; se
// T044 («8–10 blader fersk basilikum» skal vises akkurat slik, ikke som
// "1" eller en gjettet bunt/potte).
// ---------------------------------------------------------------------------

export const FRESH_HERB_PART_UNIT_EXEMPT_IDS: ReadonlySet<string> = new Set([
  "parsley_flat_fresh",
  "parsley_fresh",
  "choice_parsley_mint",
  "choice_tarragon_parsley",
  "thyme_unspecified",
  "thyme_fresh",
  "thyme_dried",
  "oregano_dried",
  "oregano_unspecified",
  "coriander_fresh",
  "choice_thaibasil_coriander",
  "r035",
  "basil_fresh",
  "basil_unspecified",
  "basil_thai_fresh",
  "basil_dried",
  "choice_holy_thai_basil",
  "dill_fresh",
  "dill_unspecified",
  "dill_dried",
  "r075",
  "rosemary_unspecified",
  "rosemary_fresh",
  "mint_fresh",
  "mint_dried",
  "mint_unspecified",
  "r110",
  "r111",
  "tarragon_unspecified",
  "tarragon_fresh",
  "tarragon_dried",
  "sage_fresh",
  "r285",
]);

// ---------------------------------------------------------------------------
// W – generisk «hele enheter»-avrunding (seksjon W). Kuratert liste over
// kjøpsvare-ID-er for nettopp den FERSKE/HELE varianten av hver av de 35
// radene i spesifikasjonens W-liste – IKKE alle ID-er på raden (f.eks.
// utelates `onion_powder`/`onion_crispy`/`paprika_powder`/`potato_cooked`/
// `broccolini`/`onion_red_pickled`/`fennel_seed`/`chili_flakes` osv., se
// radenes egne kommentarer og W-seksjonens presiseringer «bare fersk frukt»/
// «ikke brokkolini-pakke»/«hode»/«knoll»/«stilk»). Hvitløk/sitron/lime/
// appelsin/egg er META med i W-seksjonens tekst, men har sin EGEN, mer
// presise ressursmodell (G/S/E) og er derfor META UTELATT herfra for å unngå
// dobbel avrunding – se resourceModels.ts-funksjonene under.
// ---------------------------------------------------------------------------

export const WHOLE_UNIT_IDS: ReadonlySet<string> = new Set([
  "onion_yellow",
  "potato",
  "potato_small",
  "potato_floury",
  "potato_waxy",
  "chili_red_fresh",
  "chili_green_fresh",
  "r023", // Sjalottløk
  "onion_red",
  "r032", // Gulrot
  "r035", // Vårløk (kun stk/stilk – se isWholeUnitEligibleVarloek under)
  "tomato_cherry",
  "tomato_fresh",
  "r038", // Agurk
  "pepper_red",
  "pepper_yellow",
  "pepper_green",
  "pepper_fruit_unspecified",
  "r055", // Avokado
  "broccoli",
  "r098", // Hjertesalat
  "r107", // Isbergsalat
  "r108", // Purre
  "r112", // Mango
  "r136", // Vaniljestang
  "r142", // Eple
  "r144", // Aubergine
  "r150", // Squash
  "r160", // Pak choi
  "r168", // Blomkål
  "r179", // Romanosalat
  "r201", // Sellerirot
  "r203", // Pastinakk
  "r204", // Kålrot
  "r207", // Pære
  "fennel_bulb",
  "r269", // Reddik
  "r308", // Sitrongress
]);

/** Vårløk (r035) er W «stilk/stk, ikke bunt» – en linje angitt i bunt skal
 * IKKE regnes med i det generiske hel-antall-behovet. */
export function isWholeUnitUnitEligible(purchaseId: string, unit: string | null): boolean {
  if (purchaseId !== "r035") return true;
  const u = (unit ?? "").trim().toLowerCase();
  return u !== "bunt";
}

// ---------------------------------------------------------------------------
// S – sitron/lime/appelsin ressursmodell (seksjon S). Yields er GODKJENT OG
// AKTIV i standardprofilen (MEDIUM confidence, eksplisitt aktivert av
// produkteier – se spesifikasjonens S-seksjon og kildehenvisning til
// Sunkist). IKKE endre disse tallene uten en ny, eksplisitt produkteier-
// godkjenning.
// ---------------------------------------------------------------------------

export interface CitrusYield {
  juiceMl: number;
  zestMl: number;
}

export const CITRUS_YIELDS: Record<"lemon" | "lime" | "orange", CitrusYield> = {
  lime: { juiceMl: 30, zestMl: 5 },
  lemon: { juiceMl: 30, zestMl: 5 },
  orange: { juiceMl: 50, zestMl: 10 },
};

export interface CitrusGroupAccumulator {
  w: ParsedQuantity;
  jFruit: ParsedQuantity;
  jMl: ParsedQuantity;
  zFruit: ParsedQuantity;
  zMl: ParsedQuantity;
  bFruit: ParsedQuantity;
}

export function emptyCitrusAccumulator(): CitrusGroupAccumulator {
  return {
    w: ZERO_QUANTITY,
    jFruit: ZERO_QUANTITY,
    jMl: ZERO_QUANTITY,
    zFruit: ZERO_QUANTITY,
    zMl: ZERO_QUANTITY,
    bFruit: ZERO_QUANTITY,
  };
}

/** `purchaseCount_g = ceil(Wg + max(Jg, Zg))` for ÉN delingsgruppe (= én
 * oppskriftshendelse/faktisk tilberedningsøkt, se §sharingGroup). Bruker
 * ØVRE grense på alle intervall-/ukjent-komponenter før avrunding – en ukjent
 * delressurs behandles ALDRI som 0 (se §ukjent mengde), men kan heller ikke
 * gi et trygt avrundet tall, så den returnerte `needsReviewForUnknown`
 * markerer at visningen må vise den ukjente delen i tillegg, ikke late som
 * den er dekket. */
export function computeCitrusGroupPurchaseCount(
  acc: CitrusGroupAccumulator,
  fruit: "lemon" | "lime" | "orange",
): { purchaseCount: number; needsReviewForUnknown: boolean; juiceMlNeeded: number | null; zestMlNeeded: number | null } {
  const yieldInfo = CITRUS_YIELDS[fruit];
  const anyUnknown = [acc.w, acc.jFruit, acc.jMl, acc.zFruit, acc.zMl, acc.bFruit].some((q) => q.kind === "unknown");

  const wUpper = upperBound(acc.w) ?? 0;
  const jFruitUpper = upperBound(acc.jFruit) ?? 0;
  const jMlUpper = upperBound(acc.jMl) ?? 0;
  const zFruitUpper = upperBound(acc.zFruit) ?? 0;
  const zMlUpper = upperBound(acc.zMl) ?? 0;
  const bFruitUpper = upperBound(acc.bFruit) ?? 0;

  const j = jFruitUpper + bFruitUpper + jMlUpper / yieldInfo.juiceMl;
  const z = zFruitUpper + bFruitUpper + zMlUpper / yieldInfo.zestMl;
  const purchaseCount = Math.ceil(wUpper + Math.max(j, z));

  return {
    purchaseCount: anyUnknown ? 0 : purchaseCount,
    needsReviewForUnknown: anyUnknown,
    juiceMlNeeded: jMlUpper > 0 || jFruitUpper > 0 || bFruitUpper > 0 ? jMlUpper + (jFruitUpper + bFruitUpper) * yieldInfo.juiceMl : null,
    zestMlNeeded: zMlUpper > 0 || zFruitUpper > 0 || bFruitUpper > 0 ? zMlUpper + (zFruitUpper + bFruitUpper) * yieldInfo.zestMl : null,
  };
}

// ---------------------------------------------------------------------------
// G – hvitløk (seksjon G). `purchaseHeads = ceil(reservedWholeHeads +
// totalCloves/6)`. IKKE delingsgruppe-bundet i spesifikasjonen (i motsetning
// til S/E) – fedd fra ulike oppskrifter/middager summeres globalt FØR
// avrunding, siden fedd er samme forbrukte ressurs (ikke et max()-valg som
// saft/skall).
// ---------------------------------------------------------------------------

export const GARLIC_CLOVES_PER_HEAD = 6;

export function computeGarlicPurchaseCount(
  reservedWholeHeads: ParsedQuantity,
  totalCloves: ParsedQuantity,
): { purchaseHeads: number; totalClovesNeeded: number | null; needsReviewForUnknown: boolean } {
  const anyUnknown = reservedWholeHeads.kind === "unknown" || totalCloves.kind === "unknown";
  const headsUpper = upperBound(reservedWholeHeads) ?? 0;
  const clovesUpper = upperBound(totalCloves) ?? 0;
  const purchaseHeads = Math.ceil(headsUpper + clovesUpper / GARLIC_CLOVES_PER_HEAD);
  return {
    purchaseHeads: anyUnknown ? 0 : purchaseHeads,
    totalClovesNeeded: clovesUpper > 0 ? clovesUpper : null,
    needsReviewForUnknown: anyUnknown,
  };
}

// ---------------------------------------------------------------------------
// E – egg, plommer og hviter (seksjon E). `eggCount_g = ceil(wholeEggs_g +
// max(yolkCount_g, whiteCount_g))` – samme delingsgruppe-avgrensning som S
// (én oppskriftshendelse/faktisk tilberedningsøkt, aldri mellom separate
// middager).
// ---------------------------------------------------------------------------

export interface EggGroupAccumulator {
  whole: ParsedQuantity;
  yolk: ParsedQuantity;
  white: ParsedQuantity;
}

export function emptyEggAccumulator(): EggGroupAccumulator {
  return { whole: ZERO_QUANTITY, yolk: ZERO_QUANTITY, white: ZERO_QUANTITY };
}

export function computeEggGroupPurchaseCount(
  acc: EggGroupAccumulator,
): { purchaseCount: number; needsReviewForUnknown: boolean } {
  const anyUnknown = [acc.whole, acc.yolk, acc.white].some((q) => q.kind === "unknown");
  const wholeUpper = upperBound(acc.whole) ?? 0;
  const yolkUpper = upperBound(acc.yolk) ?? 0;
  const whiteUpper = upperBound(acc.white) ?? 0;
  const purchaseCount = Math.ceil(wholeUpper + Math.max(yolkUpper, whiteUpper));
  return { purchaseCount: anyUnknown ? 0 : purchaseCount, needsReviewForUnknown: anyUnknown };
}

// ---------------------------------------------------------------------------
// Typet behov – resultatet av å tolke ÉN rå ingredienslinje mot registeret.
// ---------------------------------------------------------------------------

export type PurchaseLineKind = "normal" | "byproduct" | "review" | "choice" | "unknown";

export interface ResolvedPurchaseLine {
  kind: PurchaseLineKind;
  purchaseId: string | null;
  auditRow: string | null;
  form: string | null;
  /** Hvorfor linjen evt. må til REVIEW/audit – én av de faste kodene fra
   * «Utvikler-audit for fremtidige oppskrifter»-seksjonen. */
  reviewReason?:
    | "unknown_ingredient"
    | "unknown_form"
    | "unknown_unit"
    | "invalid_quantity"
    | "ambiguous_product"
    | "yield_not_approved";
}

/** Kjører selve oppslaget (§kjørerekkefølge: N-klassifisering kjøres FØR
 * ukjent-alias-fallback, men alle i dag kjente biprodukt-fraser er allerede
 * eksakte aliaser – se filheaderen). Gjetter ALDRI: en ukjent råvare/form gir
 * `kind: "unknown"` med en konkret reviewReason, og kalleren MÅ beholde
 * linjen uendret i så fall (se shopping-list.ts). */
/**
 * Presedensregel 4 – «den særskilt produkteieravklarte ts-formen av
 * «paprika» er paprikapulver» – et ENKELTSTÅENDE, eksplisitt godkjent
 * produkteierunntak for nettopp dette ene ordet/denne ene enheten, IKKE en
 * generell slutningsregel for andre krydder/andre ukjente paprikaformer (se
 * presedensteksten). Spesifikasjonens egen tabellcelle for aliasrad 041 var
 * betinget tekst («`paprika_powder` ved ts-form; ellers
 * `pepper_fruit_unspecified`») i stedet for en ren ID som de andre 733
 * radene – løst her som kode i stedet for i det generelle aliasoppslaget,
 * se merknaden i purchase-registry-data.ts.
 */
function applyParikaTsPrecedence(name: string, unit: string | null, resolved: ResolvedPurchaseLine): ResolvedPurchaseLine {
  if (resolved.purchaseId !== "pepper_fruit_unspecified") return resolved;
  if (normalizeAliasKey(name) !== "paprika") return resolved;
  if ((unit ?? "").trim().toLowerCase() !== "ts") return resolved;
  return { kind: "normal", purchaseId: "paprika_powder", auditRow: resolved.auditRow, form: "as_named" };
}

/** De tre eneste ID-ene i registeret som er NOT_PURCHASED UTEN
 * `byproduct_`-prefiks (rent vann og de to kokevann-produktene – se
 * N-seksjonens tabell: «vann»/«varmt vann»/«kaldt vann» → `water`;
 * «pastavann»/«pastavann ved behov» → `pasta_water`; «kokevann» →
 * `cooking_water`). ALDRI `tuna_canned_water` (boks tunfisk i vann er en
 * ordinær kjøpsvare, se samme seksjon). */
const PLAIN_NOT_PURCHASED_IDS = new Set(["water", "pasta_water", "cooking_water"]);

/** Andefett er den ENE raden i registeret der selve kjøpsvare-/biprodukt-
 * statusen avhenger av NOTATET, ikke av navnet alene (§N: «andefett MED
 * notat 'fra steking' er NOT_PURCHASED; generisk andefett uten
 * prosessmarkør er kjøpsvare»). Dette er bevisst IKKE implementert som en
 * generell «sjekk biprodukt-mønsteret på ALLE eksakte alias-treff»-regel –
 * det ville gitt falske treff for ordinære kjøpsvarer med en uskyldig
 * opprinnelses-/produsent-«fra» i notatet (f.eks. «olivenolje fra Italia»,
 * som presedensreglene eksplisitt sier ALDRI er en biproduktmarkør). Den
 * generelle `matchesGenericByproductPattern`-sjekken lenger ned er derfor
 * fortsatt KUN et sikkerhetsnett for navn som ikke står i registeret ennå. */
function applyDuckFatNotePrecedence(resolved: ResolvedPurchaseLine, note: string | null): ResolvedPurchaseLine {
  if (resolved.purchaseId !== "duck_fat") return resolved;
  const haystack = normalizeAliasKey(note ?? "");
  if (PURCHASE_OVERRIDE_PATTERN.test(haystack)) return resolved;
  if (/\bfra\s+steking(en)?\b/.test(haystack)) {
    return { kind: "byproduct", purchaseId: "byproduct_duck_fat_frying", auditRow: resolved.auditRow, form: "byproduct_not_purchased" };
  }
  return resolved;
}

/**
 * Presedensregel 4/H – tre navngitte, EKSPLISITT instruerte nedgraderinger
 * fra en «fersk»-kandidat-ID til uspesifisert+REVIEW, fordi selve
 * audit-plasseringen/aliaset IKKE i seg selv er bevis på fersk tilstand for
 * FREMTIDIGE linjer med samme ord:
 *  - bare `koriander` (uten frisk/fersk-markør i selve navnet) → fra
 *    `coriander_fresh` til `coriander_unspecified` + REVIEW. «frisk
 *    koriander»/«fersk koriander» har markøren i NAVNET og nedgraderes IKKE.
 *  - `finhakket timian` → fra `thyme_fresh` til `thyme_unspecified` + REVIEW.
 *  - `finhakket dill` → fra `dill_fresh` til `dill_unspecified` + REVIEW.
 * Se presedensregel 4 og H-seksjonen («Kandidatene thyme_fresh for
 * "finhakket timian" og dill_fresh for "finhakket dill" må uten annen
 * fersk-markør nedgraderes»).
 */
const FRESH_CANDIDATE_DOWNGRADES: Record<string, { from: string; to: string }> = {
  koriander: { from: "coriander_fresh", to: "coriander_unspecified" },
  "finhakket timian": { from: "thyme_fresh", to: "thyme_unspecified" },
  "finhakket dill": { from: "dill_fresh", to: "dill_unspecified" },
};

function applyFreshCandidateDowngrade(name: string, resolved: ResolvedPurchaseLine): ResolvedPurchaseLine {
  const downgrade = FRESH_CANDIDATE_DOWNGRADES[normalizeAliasKey(name)];
  if (!downgrade || resolved.purchaseId !== downgrade.from) return resolved;
  return { kind: "review", purchaseId: downgrade.to, auditRow: resolved.auditRow, form: "unspecified_fresh_state", reviewReason: "unknown_form" };
}

export function resolvePurchaseLine(name: string, note: string | null, unit: string | null = null): ResolvedPurchaseLine {
  const alias = lookupAlias(name);
  if (alias) {
    if (FRESH_CANDIDATE_DOWNGRADES[normalizeAliasKey(name)]) {
      return applyFreshCandidateDowngrade(name, {
        kind: "normal",
        purchaseId: alias.id,
        auditRow: alias.auditRow,
        form: alias.form,
      });
    }
    if (alias.id === "pepper_fruit_unspecified" && normalizeAliasKey(name) === "paprika") {
      return applyParikaTsPrecedence(name, unit, {
        kind: "normal",
        purchaseId: alias.id,
        auditRow: alias.auditRow,
        form: alias.form,
      });
    }
    if (alias.id.startsWith("byproduct_") || PLAIN_NOT_PURCHASED_IDS.has(alias.id)) {
      return { kind: "byproduct", purchaseId: alias.id, auditRow: alias.auditRow, form: alias.form };
    }
    if (alias.id.startsWith("review_")) {
      return {
        kind: "review",
        purchaseId: alias.id,
        auditRow: alias.auditRow,
        form: alias.form,
        reviewReason: "ambiguous_product",
      };
    }
    if (alias.id.startsWith("choice_")) {
      return { kind: "choice", purchaseId: alias.id, auditRow: alias.auditRow, form: alias.form };
    }
    if (alias.id === "duck_fat") {
      return applyDuckFatNotePrecedence(
        { kind: "normal", purchaseId: alias.id, auditRow: alias.auditRow, form: alias.form },
        note,
      );
    }
    return { kind: "normal", purchaseId: alias.id, auditRow: alias.auditRow, form: alias.form };
  }

  if (matchesGenericByproductPattern(name, note)) {
    return { kind: "byproduct", purchaseId: null, auditRow: null, form: "byproduct_not_purchased" };
  }

  return { kind: "unknown", purchaseId: null, auditRow: null, form: null, reviewReason: "unknown_ingredient" };
}

// ---------------------------------------------------------------------------
// Form → ressurs-bøtte. Dette er limet mellom en rå linje (navn/enhet/notat)
// og selve S/G-akkumulatorene over. Bygget direkte på de faktiske
// formhint-verdiene i aliasregisteret (se grep av PURCHASE_ALIASES: `juice`,
// `zest`, `zest_fruit_count:N`, `wedge`, `peel_strip`, `segment`, `clove`,
// `context_required`), supplert med notat-presedens (presedensregel 3) for
// `context_required`-raden (bare «sitron»/«lime»/«appelsin»/«hvitløk»).
// ---------------------------------------------------------------------------

export type CitrusBucket = { tag: "W" | "Jfruit" | "Jml" | "Zfruit" | "Zml" | "Bfruit"; quantity: ParsedQuantity } | null;

const JUICE_NOTE_PATTERN = /\bsaft(en)?\b|\bjuice\b/;
const ZEST_NOTE_PATTERN = /\bskall(et)?\b|\bzest\b|finrevet/;

/** Klassifiserer en sitrus-linje (lemon/lime/orange) til riktig
 * ressursbøtte, eller `null` (+ reviewReason) dersom formen ikke har en
 * godkjent yield (skiver/strimler/fileter) eller enheten er uventet. */
export function classifyCitrusLine(
  form: string,
  quantity: ParsedQuantity,
  unit: string | null,
  note: string | null,
): { bucket: CitrusBucket; reviewReason?: ResolvedPurchaseLine["reviewReason"] } {
  const normalizedUnit = (unit ?? "").trim().toLowerCase();
  const isDiscreteOrBare = !normalizedUnit || DISCRETE_COUNT_UNITS.has(normalizedUnit);
  // MERK: probes enheten alene (med en vilkårlig prøveverdi) for å avgjøre
  // om den er en volum-enhet – IKKE via den faktiske `quantity`, som kan
  // være et INTERVALL («1–2 ss») og dermed aldri har kind "exact". Den
  // forrige versjonen beregnet `asMetric` kun for "exact"-mengder, så et
  // intervall falt alltid videre til "uventet enhet"-REVIEW i stedet for
  // riktig Jml/Zml-bøtte – oppdaget via T018 («1–2 ss sitron (saften)»
  // skulle gi 1 sitron fra øvre grense 2 ss, men ble i stedet en uendret
  // REVIEW-linje).
  const asMetric = toMetricBase(1, unit);
  const isVolumeUnit = asMetric?.base === "ml";

  const zestFruitCountMatch = form.match(/^zest_fruit_count:(\d+)$/);
  if (zestFruitCountMatch) {
    const n = Number(zestFruitCountMatch[1]);
    const multiplier = quantity.kind === "exact" && Number.isInteger(quantity.value) && quantity.value > 0 ? quantity.value : 1;
    return { bucket: { tag: "Zfruit", quantity: { kind: "exact", value: n * multiplier } } };
  }

  if (form === "wedge" || form === "peel_strip" || form === "segment") {
    // Ingen godkjent yield for skive/strimmel/filet-antall per hel frukt –
    // behold linjen uendret og flagg i stedet for å gjette, se S-seksjonen
    // («Strimler skall og fileter mangler trygg yield»).
    return { bucket: null, reviewReason: "yield_not_approved" };
  }

  if (form === "juice") {
    if (quantity.kind === "unknown") return { bucket: { tag: "Jml", quantity } };
    if (isVolumeUnit) {
      const low = quantity.kind === "exact" ? toMetricBase(quantity.value, unit)!.value : toMetricBase(quantity.low, unit)!.value;
      const high = quantity.kind === "exact" ? low : toMetricBase(quantity.high, unit)!.value;
      return { bucket: { tag: "Jml", quantity: low === high ? { kind: "exact", value: low } : { kind: "interval", low, high } } };
    }
    if (isDiscreteOrBare) return { bucket: { tag: "Jfruit", quantity } };
    return { bucket: null, reviewReason: "unknown_unit" };
  }

  if (form === "zest") {
    if (quantity.kind === "unknown") return { bucket: { tag: "Zml", quantity } };
    if (isVolumeUnit) {
      const low = quantity.kind === "exact" ? toMetricBase(quantity.value, unit)!.value : toMetricBase(quantity.low, unit)!.value;
      const high = quantity.kind === "exact" ? low : toMetricBase(quantity.high, unit)!.value;
      return { bucket: { tag: "Zml", quantity: low === high ? { kind: "exact", value: low } : { kind: "interval", low, high } } };
    }
    if (isDiscreteOrBare) return { bucket: { tag: "Zfruit", quantity } };
    return { bucket: null, reviewReason: "unknown_unit" };
  }

  if (form === "context_required") {
    const haystack = normalizeAliasKey(note ?? "");
    const hasJuiceNote = JUICE_NOTE_PATTERN.test(haystack);
    const hasZestNote = ZEST_NOTE_PATTERN.test(haystack);
    if (hasJuiceNote && hasZestNote) {
      // Eksplisitt «saft og skall» av samme frukt i én linje – én fysisk
      // ressurs, se Bfruit.
      return { bucket: { tag: "Bfruit", quantity } };
    }
    if (hasJuiceNote) return classifyCitrusLine("juice", quantity, unit, note);
    if (hasZestNote) return classifyCitrusLine("zest", quantity, unit, note);
    // Ingen saft-/skall-markør – bokstavelig hel frukt (evt. «i båter»/«båter»
    // som ren tilberedningsinfo, ikke en egen enhet, se W-seksjonen).
    if (isDiscreteOrBare) return { bucket: { tag: "W", quantity } };
    return { bucket: null, reviewReason: "unknown_unit" };
  }

  return { bucket: null, reviewReason: "unknown_form" };
}

export type GarlicBucket = { tag: "clove" | "wholeHead"; quantity: ParsedQuantity } | null;

const GARLIC_WHOLE_MARKERS = /\bhel\b|\bhele\b|\bhode\b/;

/** Klassifiserer en hvitløk-linje til fedd eller hel(e) løk. Bare
 * `1 hvitløk`/`1 stk hvitløk` uten fedd-enhet eller hel/hode-markør er
 * tvetydig og skal til REVIEW – IKKE auto-resolve, se G-seksjonen. */
export function classifyGarlicLine(
  form: string,
  quantity: ParsedQuantity,
  unit: string | null,
  name: string,
  note: string | null,
): { bucket: GarlicBucket; reviewReason?: ResolvedPurchaseLine["reviewReason"] } {
  if (form === "clove") return { bucket: { tag: "clove", quantity } };
  if (form === "context_required") {
    const normalizedUnit = (unit ?? "").trim().toLowerCase();
    if (/\bfedd\b/.test(normalizedUnit)) return { bucket: { tag: "clove", quantity } };
    const haystack = normalizeAliasKey(`${name} ${note ?? ""}`);
    if (GARLIC_WHOLE_MARKERS.test(haystack)) return { bucket: { tag: "wholeHead", quantity } };
    return { bucket: null, reviewReason: "ambiguous_product" };
  }
  return { bucket: null, reviewReason: "unknown_form" };
}

export type EggBucket = { tag: "whole" | "yolk" | "white"; quantity: ParsedQuantity } | null;

/** Egg: `whole`/`yolk`/`white`-formen kommer direkte fra aliaset. Gram/ml av
 * plomme/hvite konverteres ALDRI til et antall («Gram egg konverteres
 * ikke») – slike linjer er egen KEEP-produktidentitet og går ikke inn i
 * E-ressursmodellen. */
export function classifyEggLine(
  form: string,
  quantity: ParsedQuantity,
  unit: string | null,
): { bucket: EggBucket; isGramForm: boolean } {
  const normalizedUnit = (unit ?? "").trim().toLowerCase();
  const isDiscreteOrBare = !normalizedUnit || DISCRETE_COUNT_UNITS.has(normalizedUnit);
  if (!isDiscreteOrBare) return { bucket: null, isGramForm: true };
  if (form === "whole") return { bucket: { tag: "whole", quantity }, isGramForm: false };
  if (form === "yolk") return { bucket: { tag: "yolk", quantity }, isGramForm: false };
  if (form === "white") return { bucket: { tag: "white", quantity }, isGramForm: false };
  return { bucket: null, isGramForm: false };
}

// ---------------------------------------------------------------------------
// Generisk WHOLE_UNIT – ceil over summert helbehov for de 35 radene som ikke
// har en egen S/G/E-modell (seksjon W). Delingsgruppe-uavhengig: alle bidrag
// summeres globalt (på tvers av middager) FØR én avsluttende ceil, se
// radenes «ceil etter samlet helbehov» (ingen per-middag-avgrensning som
// S/E, siden f.eks. gulrøtter ikke har en delbar saft-/skall-ressurs å
// unngå dobbel-deling av).
// ---------------------------------------------------------------------------

export function computeWholeUnitPurchaseCount(total: ParsedQuantity): { count: number; needsReviewForUnknown: boolean } {
  if (total.kind === "unknown") return { count: 0, needsReviewForUnknown: true };
  const upper = upperBound(total) ?? 0;
  return { count: Math.max(0, Math.ceil(upper)), needsReviewForUnknown: false };
}

export { PURCHASE_ALIASES, type PurchaseAlias };
