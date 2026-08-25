/**
 * Porsjonsskalering av ingrediensmengder.
 *
 * Mål: aldri vise stygge tall som "166.6666667 g". Vi runder til et
 * lettlest presisjonsnivå avhengig av størrelsen på tallet, og bruker
 * pene brøker (¼, ½, ¾ osv.) for små mengder der det gir mer kjøkkenvennlig
 * lesbarhet enn desimaltall (f.eks. "1½ dl" fremfor "1.5 dl").
 *
 * Ikke-numeriske mengder ("etter smak", "1 knivsodd", "en klype") skaleres
 * aldri – de vises uendret.
 */

const FRACTIONS: Array<{ value: number; label: string }> = [
  { value: 1 / 4, label: "¼" },
  { value: 1 / 3, label: "⅓" },
  { value: 1 / 2, label: "½" },
  { value: 2 / 3, label: "⅔" },
  { value: 3 / 4, label: "¾" },
];

const FRACTION_TOLERANCE = 0.04;

/**
 * Parser en mengde-streng til et tall dersom mulig. Støtter vanlige norske
 * skrivemåter: "200", "1,5", "1.5", "1/2", "1 1/2".
 */
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;

  // "1 1/2" -> blandet tall
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, num, den] = mixedMatch;
    const denominator = Number(den);
    if (denominator === 0) return null;
    return Number(whole) + Number(num) / denominator;
  }

  // "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, num, den] = fractionMatch;
    const denominator = Number(den);
    if (denominator === 0) return null;
    return Number(num) / denominator;
  }

  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/** Runder et skalert tall til et kjøkkenvennlig presisjonsnivå. */
function roundKitchenFriendly(value: number): number {
  if (value === 0) return 0;
  if (value < 1) {
    // Kvarte enheter under 1 (0.25, 0.33, 0.5, 0.67, 0.75 osv.)
    return Math.round(value * 12) / 12;
  }
  if (value < 10) {
    // Halve enheter opp til 10
    return Math.round(value * 2) / 2;
  }
  if (value < 100) {
    // Nærmeste hele tall
    return Math.round(value);
  }
  // Nærmeste 5 for store mengder (f.eks. gram)
  return Math.round(value / 5) * 5;
}

function formatWithFraction(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < FRACTION_TOLERANCE) {
    return String(whole || 0);
  }

  const closest = FRACTIONS.reduce((best, f) =>
    Math.abs(f.value - remainder) < Math.abs(best.value - remainder) ? f : best,
  );

  if (Math.abs(closest.value - remainder) > FRACTION_TOLERANCE) {
    // Ingen pen brøk passer godt nok – fall tilbake til én desimal.
    const rounded = Math.round(value * 10) / 10;
    return String(rounded);
  }

  if (whole === 0) return closest.label;
  return `${whole}${closest.label}`;
}

/**
 * Skalerer en mengde fra `fromServings` til `toServings` og returnerer en
 * kjøkkenvennlig streng klar til visning. Bruker brøker for mengder under
 * ca. 10 (typisk dl, ss, ts, stk) og hele/halve tall for større mengder
 * (typisk gram).
 */
export function scaleAmount(
  raw: string | null | undefined,
  fromServings: number,
  toServings: number,
): string | null {
  const parsed = parseAmount(raw);
  if (parsed == null || fromServings <= 0) return raw ?? null;

  const scaled = (parsed / fromServings) * toServings;
  const rounded = roundKitchenFriendly(scaled);

  if (rounded < 10 && rounded % 1 !== 0) {
    return formatWithFraction(rounded);
  }

  // Fjern unødvendige desimaler ("4.0" -> "4"), behold én desimal ellers.
  return rounded % 1 === 0 ? String(rounded) : String(Math.round(rounded * 10) / 10);
}
