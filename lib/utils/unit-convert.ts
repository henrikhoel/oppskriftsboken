/**
 * DETERMINISTISK konvertering av amerikanske mål (cups/tbsp/tsp/oz/lb/°F) til
 * norske kjøkkenmål (ss/ts/dl/l/g/kg/°C) – brukt av "Importer fra lenke" (se
 * lib/actions/recipe-import.ts) for oppskrifter hentet fra amerikanske
 * nettsider. Samme prinsipp som resten av import-funksjonaliteten: selve
 * REGNESTYKKET er alltid deterministisk (eksakte konverteringsfaktorer, ikke
 * AI-gjetting), og kjøres som et etterbehandlingssteg PÅ DE FERDIG STRUKTURERTE
 * ingrediensene/stegene AI-en allerede har delt opp – se
 * applyImperialConversion i recipe-import.ts. AI-en er eksplisitt bedt om å
 * IKKE konvertere selv, nettopp for å unngå upresise/inkonsekvente
 * AI-uregninger av noe som har ett eksakt riktig svar.
 *
 * Avrunding: rå konvertering gir stygge tall (1 cup mel = 2,36999… dl) som
 * ingen skriver i en oppskrift – se runde til NATURLIGE kjøkkentall
 * (roundToStep under) i stedet, og VELGER samtidig riktig målenhet ut fra
 * størrelsen (få ss i stedet for en brøkdel av en dl, kg i stedet for 1200 g),
 * akkurat slik en ekte oppskrift ville vært skrevet.
 */

export type MetricVolumeUnit = "ts" | "ss" | "dl" | "l";
export type MetricWeightUnit = "g" | "kg";

interface UnitDef {
  type: "volume" | "weight";
  /** Konverteringsfaktor til basisenheten (ml for volum, g for vekt). */
  toBase: number;
}

// Kun entydige enhetsord/forkortelser er med her – bevisst IKKE bare "c"
// eller "t"/"T" alene, som er for tvetydige (kolliderer lett med andre
// forkortelser) til å konvertere trygt automatisk.
const IMPERIAL_UNITS: Record<string, UnitDef> = {
  cup: { type: "volume", toBase: 236.588 },
  cups: { type: "volume", toBase: 236.588 },
  tbsp: { type: "volume", toBase: 14.7868 },
  tbsps: { type: "volume", toBase: 14.7868 },
  "tbsp.": { type: "volume", toBase: 14.7868 },
  tablespoon: { type: "volume", toBase: 14.7868 },
  tablespoons: { type: "volume", toBase: 14.7868 },
  tsp: { type: "volume", toBase: 4.92892 },
  tsps: { type: "volume", toBase: 4.92892 },
  "tsp.": { type: "volume", toBase: 4.92892 },
  teaspoon: { type: "volume", toBase: 4.92892 },
  teaspoons: { type: "volume", toBase: 4.92892 },
  "fl oz": { type: "volume", toBase: 29.5735 },
  "fl. oz.": { type: "volume", toBase: 29.5735 },
  "fluid ounce": { type: "volume", toBase: 29.5735 },
  "fluid ounces": { type: "volume", toBase: 29.5735 },
  quart: { type: "volume", toBase: 946.353 },
  quarts: { type: "volume", toBase: 946.353 },
  qt: { type: "volume", toBase: 946.353 },
  pint: { type: "volume", toBase: 473.176 },
  pints: { type: "volume", toBase: 473.176 },
  pt: { type: "volume", toBase: 473.176 },
  oz: { type: "weight", toBase: 28.3495 },
  ozs: { type: "weight", toBase: 28.3495 },
  "oz.": { type: "weight", toBase: 28.3495 },
  ounce: { type: "weight", toBase: 28.3495 },
  ounces: { type: "weight", toBase: 28.3495 },
  lb: { type: "weight", toBase: 453.592 },
  lbs: { type: "weight", toBase: 453.592 },
  "lb.": { type: "weight", toBase: 453.592 },
  pound: { type: "weight", toBase: 453.592 },
  pounds: { type: "weight", toBase: 453.592 },
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/** Ser opp om `unit` (case-insensitivt, trimmet) er et gjenkjent amerikansk
 * mål. Returnerer null for alt annet – inkludert allerede-metriske enheter
 * (g/kg/dl/ss/ts/stk/…), som skal stå helt urørt. */
function lookupImperialUnit(unit: string): UnitDef | null {
  return IMPERIAL_UNITS[unit.trim().toLowerCase()] ?? null;
}

/** Parser en mengdetekst til et tall – støtter heltall, desimaltall (med
 * punktum ELLER komma), enkle brøker ("1/2"), blandede tall ("1 1/2"), og
 * Unicode-brøktegn (både "1 ½" og sammenskrevet "1½"). Returnerer null for
 * alt den ikke trygt kan tolke (f.eks. intervaller som "1-2") – kalleren lar
 * da beløpet/enheten stå urørt i stedet for å gjette. */
export function parseQuantity(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  // Unicode-brøk, evt. med et heltall rett foran (med eller uten mellomrom).
  const fractionMatch = text.match(/^(\d+)?\s*([½¼¾⅓⅔⅛⅜⅝⅞])$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? Number(fractionMatch[1]) : 0;
    return whole + UNICODE_FRACTIONS[fractionMatch[2]];
  }

  // Blandet tall med vanlig brøk: "1 1/2".
  const mixedMatch = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, num, den] = mixedMatch;
    const denominator = Number(den);
    if (denominator === 0) return null;
    return Number(whole) + Number(num) / denominator;
  }

  // Ren brøk: "3/4".
  const fracMatch = text.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const denominator = Number(fracMatch[2]);
    if (denominator === 0) return null;
    return Number(fracMatch[1]) / denominator;
  }

  // Vanlig tall, punktum eller komma som desimalskille.
  const numMatch = text.match(/^(\d+)([.,](\d+))?$/);
  if (numMatch) {
    return Number(`${numMatch[1]}.${numMatch[3] ?? "0"}`);
  }

  return null;
}

/** Runder `value` til nærmeste multiplum av `step`, aldri lavere enn ett
 * steg (unngår at et lite, men reelt tilstedeværende beløp rundes bort til
 * 0). Avrunder selve resultatet til 2 desimaler for å unngå
 * flyttall-støy (f.eks. 1.5000000000000002). */
function roundToStep(value: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  const result = rounded < step ? step : rounded;
  return Math.round(result * 100) / 100;
}

/** Formaterer et avrundet tall til norsk stil – komma som desimalskille, og
 * ALDRI mer enn ett desimal (avrundingsstegene over gir uansett aldri mer
 * enn det). Hele tall vises uten desimal ("12", ikke "12,0"). */
function formatAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(".", ",");
}

/** Velger naturlig norsk volumenhet (ts/ss/dl/l) ut fra en mengde i ml, og
 * runder til et "kjøkkenvennlig" steg for den enheten – halve ss/ts/dl/l er
 * vanlig i norske oppskrifter, kvarte er det ikke. Grensene mellom
 * ts/ss/dl/l er satt til der en norsk oppskrift typisk ville byttet enhet
 * selv (f.eks. "5 ss" fremfor "0,75 dl"). */
function chooseVolumeUnit(ml: number): { amount: number; unit: MetricVolumeUnit } {
  if (ml < 10) return { amount: roundToStep(ml / 5, 0.5), unit: "ts" };
  if (ml < 75) return { amount: roundToStep(ml / 15, 0.5), unit: "ss" };
  if (ml < 1000) return { amount: roundToStep(ml / 100, 0.5), unit: "dl" };
  return { amount: roundToStep(ml / 1000, 0.5), unit: "l" };
}

/** Velger naturlig norsk vektenhet (g/kg) ut fra en mengde i gram, og runder
 * til et steg som passer størrelsen – hele gram for små mengder (krydder),
 * nærmeste 5/10 g for vanlige mengder, nærmeste 100 g (0,1 kg) når det
 * uansett rundes opp til kilo. */
function chooseWeightUnit(grams: number): { amount: number; unit: MetricWeightUnit } {
  if (grams >= 1000) return { amount: roundToStep(grams / 1000, 0.1), unit: "kg" };
  const step = grams < 20 ? 1 : grams < 100 ? 5 : 10;
  return { amount: roundToStep(grams, step), unit: "g" };
}

/** Hovedfunksjonen: konverterer ett amount+unit-par fra amerikanske mål til
 * norske kjøkkenmål. Returnerer null (behold originalen urørt) dersom
 * enheten ikke er en kjent amerikansk enhet, eller mengden ikke lot seg
 * tolke – ALDRI en gjetning. */
export function convertImperialAmount(
  amount: string,
  unit: string,
): { amount: string; unit: string } | null {
  const unitDef = lookupImperialUnit(unit);
  if (!unitDef) return null;

  const quantity = parseQuantity(amount);
  if (quantity === null || quantity <= 0) return null;

  const baseValue = quantity * unitDef.toBase;
  const { amount: rounded, unit: targetUnit } =
    unitDef.type === "volume" ? chooseVolumeUnit(baseValue) : chooseWeightUnit(baseValue);

  return { amount: formatAmount(rounded), unit: targetUnit };
}

/** Bytter ut Fahrenheit-oppgitte ovnstemperaturer i fri tekst (fremgangsmåte-
 * steg) med Celsius, avrundet til nærmeste 5 grader – slik ovnsbryteren
 * faktisk er inndelt, i stedet for f.eks. "176,67 °C". Gjenkjenner "350°F",
 * "350 °F" og "350F". Lar alt annet i teksten stå urørt. */
export function convertFahrenheitInText(text: string): string {
  return text.replace(/(\d{2,4})\s*°?\s*F\b/g, (_match, degreesF: string) => {
    const celsius = ((Number(degreesF) - 32) * 5) / 9;
    const rounded = Math.round(celsius / 5) * 5;
    return `${rounded}°C`;
  });
}

// Enhetsord som er trygge å lete etter midt i løpende tekst (fremgangsmåte-
// steg, f.eks. "warm 5 cups ragu") – et SNEVRERE utvalg enn IMPERIAL_UNITS
// over: utelater former med punktum ("tbsp."/"oz.") og "fl oz", som lager
// vansker for grense-sjekken (?![a-zA-Z]) under og uansett er sjeldne midt i
// en setning. AI-en er bedt om å la disse stå urørt i steg-teksten (se
// system-promptene i lib/actions/recipe-import.ts) nettopp for at denne
// funksjonen skal kunne finne og konvertere dem etterpå.
const TEXT_SAFE_UNIT_WORDS = [
  "cups",
  "cup",
  "tablespoons",
  "tablespoon",
  "tbsps",
  "tbsp",
  "teaspoons",
  "teaspoon",
  "tsps",
  "tsp",
  "ounces",
  "ounce",
  "oz",
  "pounds",
  "pound",
  "lbs",
  "lb",
  "quarts",
  "quart",
  "qt",
  "pints",
  "pint",
  "pt",
];

const TEXT_MENTION_RE = new RegExp(
  `(\\d+(?:\\s+\\d+\\/\\d+)?(?:[.,]\\d+)?|\\d+\\/\\d+|[½¼¾⅓⅔⅛⅜⅝⅞])\\s*(${TEXT_SAFE_UNIT_WORDS.join("|")})(?![a-zA-Z])`,
  "gi",
);

/** Som convertFahrenheitInText, men for amerikanske mål (cups/tbsp/tsp/oz/lb)
 * nevnt midt i fremgangsmåte-tekst – f.eks. "warm 5 cups ragu" -> "warm 1 l
 * ragu". Gjenbruker samme konverterings-/avrundingslogikk som
 * convertImperialAmount (se den for detaljer om avrunding til naturlige
 * tall). Treff som IKKE er en kjent enhet, eller der mengden ikke lar seg
 * tolke, står urørt – akkurat som i convertImperialAmount. */
export function convertImperialUnitsInText(text: string): string {
  return text.replace(TEXT_MENTION_RE, (match, qty: string, unit: string) => {
    const converted = convertImperialAmount(qty, unit);
    return converted ? `${converted.amount} ${converted.unit}` : match;
  });
}
