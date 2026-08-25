/**
 * Metrisk → US-konvertering av ingrediensmengder.
 *
 * Kun rene tall+enhet konverteres (g, kg, dl, l, ml, ss, ts) – alt annet
 * (stk, fedd, bokser, håndfull, ukjente enheter, ikke-tallmengder som
 * "etter smak") vises helt uendret, siden slike enheter ikke har noe
 * meningsfullt "US-ekvivalent" å regne om til.
 *
 * Mål: aldri vise stygge brøker som "1 1/11 cup" – vi runder ALLTID til
 * nærmeste "pene" mål (¼, ⅓, ½, ⅔, ¾ cup/tbsp/tsp, eller hele/kvarte oz/lb),
 * på samme måte som lib/utils/scale.ts gjør for porsjonsskalering.
 */

import { parseAmount } from "@/lib/utils/scale";

export type UnitSystem = "metric" | "us";

type MetricUnitKind = "g" | "kg" | "ml" | "l" | "dl" | "ss" | "ts";

const G_PER_OZ = 28.3495;
const G_PER_LB = 453.592;
const ML_PER_TSP = 4.92892;
const ML_PER_TBSP = 14.7868;
const ML_PER_CUP = 236.588;
const ML_PER_QT = 946.353;

function normalizeUnit(unit: string): MetricUnitKind | null {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (["g", "gram"].includes(u)) return "g";
  if (["kg", "kilo", "kilogram"].includes(u)) return "kg";
  if (["ml", "milliliter"].includes(u)) return "ml";
  if (["dl", "desiliter"].includes(u)) return "dl";
  if (["l", "liter"].includes(u)) return "l";
  if (["ss", "spiseskje", "spiseskjeer"].includes(u)) return "ss";
  if (["ts", "teskje", "teskjeer"].includes(u)) return "ts";
  return null;
}

const EIGHTHS: Array<{ value: number; label: string }> = [
  { value: 1 / 8, label: "⅛" },
  { value: 1 / 4, label: "¼" },
  { value: 1 / 3, label: "⅓" },
  { value: 3 / 8, label: "⅜" },
  { value: 1 / 2, label: "½" },
  { value: 5 / 8, label: "⅝" },
  { value: 2 / 3, label: "⅔" },
  { value: 3 / 4, label: "¾" },
  { value: 7 / 8, label: "⅞" },
];

/** Runder et positivt tall til nærmeste "pene" brøk (⅛, ¼, ⅓ osv.), eller
 * helt tall dersom det er nærmest. Snapper ALLTID – gir aldri stygge
 * desimaler eller uvanlige brøker tilbake. */
function formatNiceFraction(value: number): string {
  if (value <= 0) return "0";
  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < 0.06) return String(whole || 0);
  if (remainder > 0.94) return String(whole + 1);

  const closest = EIGHTHS.reduce((best, f) =>
    Math.abs(f.value - remainder) < Math.abs(best.value - remainder) ? f : best,
  );

  return whole === 0 ? closest.label : `${whole}${closest.label}`;
}

/** Runder til nærmeste halve, for tbsp/tsp der brøker ikke er like naturlig. */
function formatNearestHalf(value: number): string {
  const rounded = Math.round(value * 2) / 2;
  if (rounded <= 0) return "0";
  const whole = Math.floor(rounded);
  const half = rounded - whole;
  if (half === 0) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}

function formatVolumeMl(totalMl: number): { amount: string; unit: string } {
  if (totalMl < ML_PER_TBSP * 0.75) {
    const tsp = totalMl / ML_PER_TSP;
    return { amount: formatNearestHalf(tsp), unit: "tsp" };
  }
  if (totalMl < ML_PER_CUP * 0.2) {
    const tbsp = totalMl / ML_PER_TBSP;
    return { amount: formatNearestHalf(tbsp), unit: "tbsp" };
  }
  if (totalMl < ML_PER_QT) {
    const cups = totalMl / ML_PER_CUP;
    return { amount: formatNiceFraction(cups), unit: cups <= 1.01 ? "cup" : "cups" };
  }
  const qt = totalMl / ML_PER_QT;
  return { amount: formatNiceFraction(qt), unit: "qt" };
}

function formatWeightG(totalG: number): { amount: string; unit: string } {
  if (totalG < G_PER_LB) {
    const oz = totalG / G_PER_OZ;
    return { amount: oz < 8 ? formatNearestHalf(oz) : String(Math.round(oz)), unit: "oz" };
  }
  const lb = totalG / G_PER_LB;
  return { amount: formatNiceFraction(lb), unit: "lb" };
}

/**
 * Konverterer én ingrediensmengde (allerede porsjonsskalert) til nærmeste
 * pene US-mål. Ukjente/ikke-metriske enheter, eller mengder som ikke lar
 * seg tolke som tall (f.eks. "etter smak"), returneres helt uendret.
 */
export function convertAmountToUs(
  amount: string | null,
  unit: string | null,
): { amount: string | null; unit: string | null } {
  if (!unit) return { amount, unit };

  const kind = normalizeUnit(unit);
  if (!kind) return { amount, unit };

  const parsed = parseAmount(amount);
  if (parsed == null) return { amount, unit };

  switch (kind) {
    case "g": {
      const { amount: a, unit: u } = formatWeightG(parsed);
      return { amount: a, unit: u };
    }
    case "kg": {
      const { amount: a, unit: u } = formatWeightG(parsed * 1000);
      return { amount: a, unit: u };
    }
    case "ml": {
      const { amount: a, unit: u } = formatVolumeMl(parsed);
      return { amount: a, unit: u };
    }
    case "dl": {
      const { amount: a, unit: u } = formatVolumeMl(parsed * 100);
      return { amount: a, unit: u };
    }
    case "l": {
      const { amount: a, unit: u } = formatVolumeMl(parsed * 1000);
      return { amount: a, unit: u };
    }
    case "ss": {
      const { amount: a, unit: u } = formatVolumeMl(parsed * ML_PER_TBSP);
      return { amount: a, unit: u };
    }
    case "ts": {
      const { amount: a, unit: u } = formatVolumeMl(parsed * ML_PER_TSP);
      return { amount: a, unit: u };
    }
    default:
      return { amount, unit };
  }
}
