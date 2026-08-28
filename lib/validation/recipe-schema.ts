import { z } from "zod";

/**
 * Server-side validering av oppskriftsskjemaet. Kjøres i lib/actions/recipes.ts
 * FØR noe skrives til databasen – frontend-validering i skjemaet er kun for
 * god UX, ikke sikkerhet (se spesifikasjonens krav om å aldri stole på
 * kun frontend-sjekker).
 */

export const ingredientItemSchema = z.object({
  amount: z.string().trim().max(20).nullable(),
  unit: z.string().trim().max(20).nullable(),
  name: z.string().trim().min(1, "Ingrediensnavn kan ikke være tomt").max(120),
  note: z.string().trim().max(120).nullable(),
});

export const ingredientGroupSchema = z.object({
  title: z.string().trim().max(80).nullable(),
  items: z.array(ingredientItemSchema).min(1, "Legg til minst én ingrediens"),
});

export const stepSchema = z.object({
  groupTitle: z.string().trim().max(80).nullable(),
  text: z.string().trim().min(1, "Steget kan ikke være tomt").max(2000),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(2, "Tittel må ha minst 2 tegn").max(150),
  slug: z
    .string()
    .trim()
    .min(2, "Slug må ha minst 2 tegn")
    .max(150)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  description: z.string().trim().max(500).default(""),
  heroImageUrl: z.string().trim().url().nullable().or(z.literal("")).transform((v) => v || null),
  heroImageAlt: z.string().trim().max(200).nullable(),
  heroImageIsAiGenerated: z.boolean().default(false),
  categoryId: z.string().uuid().nullable().or(z.literal("")).transform((v) => v || null),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(20),
  images: z
    .array(
      z.object({
        url: z.string().trim().url(),
        alt: z.string().trim().max(200).nullable(),
      }),
    )
    .max(12)
    .default([]),
  servings: z.coerce.number().int().min(1).max(100),
  prepTimeMinutes: z.coerce.number().int().min(0).max(2000).nullable(),
  cookTimeMinutes: z.coerce.number().int().min(0).max(2000).nullable(),
  // Valgfri ØVRE grense for et intervall admin skrev inn ("5-7") i
  // "Tilberedning (min)"-feltet, tolket i RecipeForm.tsx sin
  // parseMinutesRange(). Null = ikke et intervall, kun cookTimeMinutes brukes.
  cookTimeMinutesMax: z.coerce.number().int().min(0).max(2000).nullable(),
  totalTimeMinutes: z.coerce.number().int().min(0).max(4000).nullable(),
  difficulty: z.enum(["enkel", "middels", "avansert"]),
  ingredientGroups: z.array(ingredientGroupSchema).min(1, "Legg til minst én ingrediensgruppe"),
  steps: z.array(stepSchema).min(1, "Legg til minst ett steg"),
  notes: z.string().trim().max(2000).nullable(),
  tips: z.string().trim().max(2000).nullable(),
  warnings: z.string().trim().max(2000).nullable(),
  source: z.string().trim().max(200).nullable(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
