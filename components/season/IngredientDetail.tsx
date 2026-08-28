import Link from "next/link";
import type { Season, SeasonalIngredient } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import { localizedIngredientName, localizedSeasonName, originGroupLabel } from "@/lib/utils/season-format";
import { IngredientDetailBody } from "@/components/season/IngredientDetailBody";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { type Lang } from "@/lib/i18n";

/**
 * Selve råvaresiden (spesifikasjonens punkt 22/23) – siste steg i
 * progressive disclosure-kjeden SESONG → RÅVARE → FORKLARING → KILDE →
 * OPPSKRIFTER (punkt 1). Skal svare på nøyaktig fem ting: når er dette i
 * sesong, når er det på sitt beste, hvorfor, hvor kommer informasjonen fra,
 * og hva kan jeg lage med det – IKKE bli et Wikipedia-oppslag, et
 * næringsinnhold-dashboard eller 15 kort (punkt 22).
 *
 * `homeSeason` er råvarens EGEN "hjemme"-sesong (styrer brødsmulesporet
 * øverst). Viste tidligere også hvilke ANDRE sesongsider råvaren dukker opp
 * på (flersesong-visning) – fjernet 28.08.2026 sammen med resten av
 * forenklingen av statuslinjen i IngredientDetailBody.tsx, se filheaderen
 * der.
 */
export function IngredientDetail({
  ingredient,
  homeSeason,
  recipes,
  lang,
}: {
  ingredient: SeasonalIngredient;
  homeSeason: Season;
  recipes: SearchableRecipe[];
  lang: Lang;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/sesong/${homeSeason.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {localizedSeasonName(homeSeason, lang)}
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {originGroupLabel(ingredient.originGroup, lang)}
      </p>
      <h1 className="mt-1.5 font-serif text-4xl text-ink sm:text-5xl">{localizedIngredientName(ingredient, lang)}</h1>

      <IngredientDetailBody ingredient={ingredient} homeSeason={homeSeason} recipes={recipes} lang={lang} />
    </article>
  );
}
