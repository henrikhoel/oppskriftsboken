import { DIFFICULTY_LABELS } from "@/lib/config";
import type { Difficulty } from "@/lib/config";

/** Formaterer minutter som "45 min" eller "1 t 15 min" (evt. "1 h 15 min" på engelsk). */
export function formatMinutes(minutes: number | null | undefined, lang: "no" | "en" = "no"): string {
  if (minutes == null || Number.isNaN(minutes)) return "–";
  const minUnit = lang === "en" ? "min" : "min";
  if (minutes < 60) return `${minutes} ${minUnit}`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourUnit = lang === "en" ? "h" : "t";
  return rest === 0 ? `${hours} ${hourUnit}` : `${hours} ${hourUnit} ${rest} ${minUnit}`;
}

/** Formaterer et tidsintervall som "5-7 min" – for tilberedningstid der admin
 * har skrevet et intervall (se cookTimeMinutesMax i lib/types.ts, satt via
 * "fra-til"-feltet i RecipeForm.tsx). Faller tilbake til vanlig
 * formatMinutes() når max er null/lik min, så eksisterende oppskrifter med
 * kun ett tall vises helt uendret. */
export function formatMinutesRange(
  min: number | null | undefined,
  max: number | null | undefined,
  lang: "no" | "en" = "no",
): string {
  if (min == null || Number.isNaN(min)) return "–";
  if (max == null || Number.isNaN(max) || max === min) return formatMinutes(min, lang);
  if (min < 60 && max < 60) return `${min}-${max} min`;
  return `${formatMinutes(min, lang)}–${formatMinutes(max, lang)}`;
}

/**
 * Velger engelsk tittel/beskrivelse (recipe.titleEn/descriptionEn – forhånds-
 * generert med AI i admin, se lib/actions/recipes.ts ->
 * generateEnglishTitleDescription) når lang="en" OG en engelsk variant
 * faktisk er lagret, ellers den norske originalteksten. Brukes i alle
 * lister/kort (RecipeCard, forsiden, Mat & vin osv.) slik at oppskrifts-
 * innhold også blir engelsk når man bytter språk – IKKE det samme som den
 * fulle, live AI-oversettelsen på selve oppskriftssiden (som fortsatt kjøres
 * automatisk der, se RecipeInteractive.tsx).
 */
export function localizedTitle(
  recipe: { title: string; titleEn?: string | null },
  lang: "no" | "en" = "no",
): string {
  return lang === "en" && recipe.titleEn ? recipe.titleEn : recipe.title;
}

export function localizedDescription(
  recipe: { description: string; descriptionEn?: string | null },
  lang: "no" | "en" = "no",
): string {
  return lang === "en" && recipe.descriptionEn ? recipe.descriptionEn : recipe.description;
}

/** Samme mønster som localizedTitle/localizedDescription over, for
 * kategorinavn (category.nameEn – generert med AI i admin, se
 * lib/actions/categories.ts -> generateEnglishCategoryName). */
export function localizedCategoryName(
  category: { name: string; nameEn?: string | null },
  lang: "no" | "en" = "no",
): string {
  return lang === "en" && category.nameEn ? category.nameEn : category.name;
}

const DIFFICULTY_LABELS_EN: Record<Difficulty, string> = {
  enkel: "Easy",
  middels: "Medium",
  avansert: "Advanced",
};

export function difficultyLabel(difficulty: Difficulty, lang: "no" | "en" = "no"): string {
  if (lang === "en") return DIFFICULTY_LABELS_EN[difficulty] ?? difficulty;
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

export function formatDateNorwegian(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Gjennomsnittlig stjernevurdering (0-5), eller null om ingen vurderinger finnes. */
export function ratingAverage(ratingSum: number, ratingCount: number): number | null {
  if (ratingCount <= 0) return null;
  return ratingSum / ratingCount;
}

/** F.eks. "(4,3 · 12 vurderinger)" / "(4.3 · 12 ratings)", eller null om ingen vurderinger finnes ennå. */
export function formatRatingSummary(
  ratingSum: number,
  ratingCount: number,
  lang: "no" | "en" = "no",
): string | null {
  const avg = ratingAverage(ratingSum, ratingCount);
  if (avg == null) return null;
  const formatted = avg.toLocaleString(lang === "en" ? "en-US" : "nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const unit =
    lang === "en" ? (ratingCount === 1 ? "rating" : "ratings") : ratingCount === 1 ? "vurdering" : "vurderinger";
  return `${formatted} · ${ratingCount} ${unit}`;
}

/** ISO 8601-varighet ("PT45M") for schema.org Recipe JSON-LD. */
export function toIsoDuration(minutes: number | null | undefined): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let out = "PT";
  if (hours > 0) out += `${hours}H`;
  if (mins > 0 || hours === 0) out += `${mins}M`;
  return out;
}
