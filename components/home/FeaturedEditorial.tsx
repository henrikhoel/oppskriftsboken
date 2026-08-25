import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import {
  formatMinutes,
  localizedTitle,
  localizedDescription,
  localizedCategoryName,
} from "@/lib/utils/format";
import { ClockIcon, ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Redaksjonell erstatning for den gamle, jevnstore kort-raden med
 * "utvalgte oppskrifter". Én oppskrift dominerer visuelt (stort bilde,
 * stor tittel), 1-2 mindre ved siden av – asymmetrisk på desktop, en
 * ryddig vertikal stabling på mobil. Bruker eksisterende oppskriftsdata
 * (favoritt/featured-utvalg gjort i app/page.tsx), ingen hardkoding.
 */

function SmallPick({ recipe, lang }: { recipe: RecipeSummary; lang: Lang }) {
  return (
    <Link
      href={`/oppskrifter/${recipe.slug}`}
      className="group flex gap-4 overflow-hidden rounded-card"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-card bg-paper sm:w-32">
        {recipe.heroImageUrl ? (
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <span className="font-serif text-sm">{t(lang, "recipeCard.imageComing")}</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center py-1">
        {recipe.category && (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-clay">
            {localizedCategoryName(recipe.category, lang)}
          </p>
        )}
        <h3 className="mt-1 text-balance font-serif text-lg leading-snug text-ink transition-colors group-hover:text-clay-dark">
          {localizedTitle(recipe, lang)}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-faint">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{formatMinutes(recipe.totalTimeMinutes, lang)}</span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedEditorial({
  main,
  others,
  lang,
}: {
  main: RecipeSummary;
  others: RecipeSummary[];
  lang: Lang;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
        {t(lang, "home.editorial.eyebrow")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
        <Link
          href={`/oppskrifter/${main.slug}`}
          className="group lg:col-span-3"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-paper sm:aspect-[16/10]">
            {main.heroImageUrl ? (
              <Image
                src={main.heroImageUrl}
                alt={main.heroImageAlt || localizedTitle(main, lang)}
                fill
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-faint">
                <span className="font-serif text-lg">{t(lang, "recipeCard.imageComing")}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            {main.category && (
              <span className="absolute left-5 top-5 rounded-full bg-cream/85 px-3 py-1 text-xs font-medium tracking-wide text-ink backdrop-blur-sm">
                {localizedCategoryName(main.category, lang)}
              </span>
            )}
          </div>
          <div className="mt-5 max-w-xl">
            <h2 className="text-balance font-serif text-3xl leading-tight text-ink transition-colors group-hover:text-clay-dark sm:text-4xl">
              {localizedTitle(main, lang)}
            </h2>
            {main.description && (
              <p className="mt-2.5 line-clamp-2 text-pretty text-sm text-ink-soft sm:text-base">
                {localizedDescription(main, lang)}
              </p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-clay group-hover:text-clay-dark">
              {t(lang, "home.editorial.viewRecipe")}
              <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {others.length > 0 && (
          <div className="lg:col-span-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              {t(lang, "home.editorial.also")}
            </p>
            <div className="mt-4 space-y-5 divide-y divide-line lg:space-y-0 lg:divide-y-0">
              {others.map((recipe) => (
                <div key={recipe.id} className="pt-5 first:pt-0 lg:border-t lg:border-line lg:pt-5 lg:first:border-t-0 lg:first:pt-0">
                  <SmallPick recipe={recipe} lang={lang} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
