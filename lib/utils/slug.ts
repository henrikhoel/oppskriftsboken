/** Norske tegn -> ASCII, brukt når vi lager slugs fra oppskriftstitler. */
const NORWEGIAN_MAP: Record<string, string> = {
  æ: "ae",
  ø: "o",
  å: "a",
  Æ: "ae",
  Ø: "o",
  Å: "a",
  é: "e",
  è: "e",
  ê: "e",
  ü: "u",
};

export function slugify(input: string): string {
  const normalized = input
    .split("")
    .map((char) => NORWEGIAN_MAP[char] ?? char)
    .join("");

  return normalized
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // fjern gjenværende aksenter
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sikrer en unik slug ved å sjekke mot en liste av eksisterende slugs
 * (typisk alle andre oppskrifter i databasen) og legge på -2, -3, osv.
 * ved kollisjon. `currentId`/`excludeId` lar oss ekskludere oppskriften vi
 * selv redigerer fra kollisjonssjekken.
 */
export function ensureUniqueSlug(
  base: string,
  existingSlugs: string[],
): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (taken.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}
