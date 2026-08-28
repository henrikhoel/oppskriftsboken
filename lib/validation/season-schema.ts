import { z } from "zod";

/**
 * Server-side validering av sesong-/sesongråvare-skjemaene – samme
 * "aldri stol kun på frontend-sjekker"-prinsipp som
 * lib/validation/guide-schema.ts. Kjøres i lib/actions/seasons.ts FØR noe
 * skrives til databasen.
 *
 * Utvidet 28.08.2026 med det tre-lags TILGJENGELIG/SESONG/PEAK-vinduet,
 * redaksjonell gruppering, opprinnelse og strukturert kildegrunnlag – se
 * filheaderen til SeasonalIngredient i lib/types.ts for hvorfor. `.max(40)`
 * på ingredients-arrayet er hevet til 100: spesifikasjonens punkt 12 sier
 * eksplisitt at sensommer alene bør bli en av de RIKESTE sesongene (30+
 * råvarer er realistisk), og admin trenger rom til å vokse videre.
 */

const monthField = z.coerce.number().int().min(1).max(12).nullable();

const categoryEnum = z.enum([
  "vegetable",
  "fruit",
  "berry",
  "herb",
  "mushroom",
  "fish",
  "shellfish",
  "game",
  "meat",
]);

const originGroupEnum = z.enum(["havet", "skogen", "jorda", "hagen", "beite"]);

const originEnum = z.enum(["norwegian", "imported"]);

/** Tom streng fra et valgfritt tekstfelt i admin-skjemaet skal bety
 * "ikke satt" (null), ikke en tom streng lagret i databasen – samme
 * "tom = null"-normalisering brukes for descriptionNo/En allerede
 * (transform under). */
function optionalTrimmed(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((value) => (value === null || value === "" ? null : value));
}

export const seasonalIngredientInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug må ha minst 2 tegn")
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  nameNo: z.string().trim().min(1, "Navn må ha minst 1 tegn").max(80),
  nameEn: z.string().trim().max(80).nullable(),
  aliases: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  category: categoryEnum,
  originGroup: originGroupEnum,
  origin: originEnum,
  availableStartMonth: monthField,
  availableEndMonth: monthField,
  seasonStartMonth: monthField,
  seasonEndMonth: monthField,
  peakStartMonth: monthField,
  peakEndMonth: monthField,
  descriptionNo: z.string().trim().max(300).nullable(),
  descriptionEn: z.string().trim().max(300).nullable(),
  seasonNoteNo: optionalTrimmed(600),
  seasonNoteEn: optionalTrimmed(600),
  sourceName: optionalTrimmed(120),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((value) => (value === null || value === "" ? null : value))
    .refine((value) => value === null || /^https?:\/\//.test(value), "Kilde-URL må starte med http(s)://"),
  sourceNote: optionalTrimmed(300),
  verifiedAt: z
    .string()
    .trim()
    .max(10)
    .nullable()
    .transform((value) => (value === null || value === "" ? null : value)),
});

export type SeasonalIngredientInput = z.infer<typeof seasonalIngredientInputSchema>;

export const seasonInputSchema = z.object({
  nameNo: z.string().trim().min(2, "Navn må ha minst 2 tegn").max(60),
  nameEn: z.string().trim().max(60).nullable(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug må ha minst 2 tegn")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  months: z
    .array(z.coerce.number().int().min(1).max(12))
    .min(1, "Velg minst én måned")
    .max(12)
    .refine((arr) => new Set(arr).size === arr.length, "Samme måned kan ikke velges flere ganger"),
  introNo: z.string().trim().min(1, "Introtekst kan ikke være tom").max(500),
  introEn: z.string().trim().max(500).nullable(),
  isPublished: z.boolean(),
  ingredients: z.array(seasonalIngredientInputSchema).max(100).default([]),
});

export type SeasonInput = z.infer<typeof seasonInputSchema>;
