import type { Recipe } from "@/lib/types";
import { siteConfig } from "@/lib/config";
import { toIsoDuration, localizedTitle, localizedDescription, localizedCategoryName } from "@/lib/utils/format";
import type { Lang } from "@/lib/i18n/lang";

/**
 * Bygger schema.org Recipe JSON-LD for en oppskriftsside. Vi finner kun på
 * felt vi faktisk har data for – ingen nutrition-info dikteres opp, slik
 * spesifikasjonen krever. `lang` brukes kun til å velge norsk/engelsk
 * navn+beskrivelse (via lib/utils/format.ts) – selve siden oversetter
 * resten av innholdet (ingredienser/steg) live med AI, se
 * RecipeInteractive.tsx.
 */
export function buildRecipeJsonLd(recipe: Recipe, lang: Lang = "no") {
  const url = `${siteConfig.url}/oppskrifter/${recipe.slug}`;

  const recipeIngredient = recipe.ingredientGroups.flatMap((group) =>
    group.items.map((item) =>
      [item.amount, item.unit, item.name, item.note && `(${item.note})`]
        .filter(Boolean)
        .join(" "),
    ),
  );

  const recipeInstructions = recipe.steps.map((step) => ({
    "@type": "HowToStep" as const,
    text: step.text,
    ...(step.groupTitle ? { name: step.groupTitle } : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: localizedTitle(recipe, lang),
    description: localizedDescription(recipe, lang),
    ...(recipe.heroImageUrl ? { image: [recipe.heroImageUrl] } : {}),
    ...(recipe.source ? { author: { "@type": "Organization", name: recipe.source } } : {}),
    datePublished: recipe.createdAt,
    dateModified: recipe.updatedAt,
    recipeCategory: recipe.category ? localizedCategoryName(recipe.category, lang) : undefined,
    recipeCuisine: "Norsk",
    keywords: recipe.tags.map((t) => t.name).join(", ") || undefined,
    recipeYield: `${recipe.servings} porsjoner`,
    ...(toIsoDuration(recipe.prepTimeMinutes)
      ? { prepTime: toIsoDuration(recipe.prepTimeMinutes) }
      : {}),
    ...(toIsoDuration(recipe.cookTimeMinutes)
      ? { cookTime: toIsoDuration(recipe.cookTimeMinutes) }
      : {}),
    ...(toIsoDuration(recipe.totalTimeMinutes)
      ? { totalTime: toIsoDuration(recipe.totalTimeMinutes) }
      : {}),
    recipeIngredient,
    recipeInstructions,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
