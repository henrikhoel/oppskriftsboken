import { z } from "zod";

/**
 * Server-side validering av "Hvordan gjør jeg det?"-guideskjemaet – samme
 * "aldri stol kun på frontend-sjekker"-prinsipp som
 * lib/validation/recipe-schema.ts. Kjøres i lib/actions/guides.ts FØR noe
 * skrives til databasen.
 */

const shortLine = z.string().trim().min(1).max(200);

export const guideStepSchema = z.object({
  text: z.string().trim().min(1, "Steget kan ikke være tomt").max(1000),
  textEn: z.string().trim().max(1000).nullable(),
  note: z.string().trim().max(300).nullable(),
  noteEn: z.string().trim().max(300).nullable(),
  durationMinutes: z.coerce.number().int().min(0).max(600).nullable(),
  temperature: z.string().trim().max(40).nullable(),
});

export const guideInputSchema = z.object({
  title: z.string().trim().min(2, "Tittel må ha minst 2 tegn").max(150),
  titleEn: z.string().trim().max(150).nullable(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug må ha minst 2 tegn")
    .max(150)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  intro: z.string().trim().max(500).default(""),
  introEn: z.string().trim().max(500).nullable(),
  quickAnswerLines: z.array(shortLine).max(8).default([]),
  quickAnswerLinesEn: z.array(shortLine).max(8).default([]),
  categoryId: z.string().uuid().nullable().or(z.literal("")).transform((v) => v || null),
  difficulty: z.enum(["enkel", "middels", "avansert"]),
  estimatedTimeMinutes: z.coerce.number().int().min(0).max(2000).nullable(),
  estimatedTimeMinutesMax: z.coerce.number().int().min(0).max(2000).nullable(),
  steps: z.array(guideStepSchema).min(1, "Legg til minst ett steg"),
  tips: z.array(shortLine).max(10).default([]),
  tipsEn: z.array(shortLine).max(10).default([]),
  warnings: z.array(shortLine).max(10).default([]),
  warningsEn: z.array(shortLine).max(10).default([]),
  searchTerms: z.array(shortLine).max(20).default([]),
  searchTermsEn: z.array(shortLine).max(20).default([]),
  aliases: z.array(shortLine).max(20).default([]),
  aliasesEn: z.array(shortLine).max(20).default([]),
  relatedGuideIds: z.array(z.string().uuid()).max(12).default([]),
  isPublished: z.boolean(),
  isDemo: z.boolean().default(false),
});

export type GuideInput = z.infer<typeof guideInputSchema>;

export const guideCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
});

export type GuideCategoryInput = z.infer<typeof guideCategoryInputSchema>;
