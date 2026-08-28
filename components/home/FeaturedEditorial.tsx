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

/**
 * Sekundærbilde til høyre for hovedoppslaget. Samme visuelle språk som
 * hovedbildet (bilde + mørk nedtoning + tekst lagt over) i stedet for den
 * gamle "liten firkant + tekst ved siden av"-thumben – det gjør at de to
 * her faktisk kan strekke seg og fylle hele høyden til hovedbildet
 * (ønsket av Henrik 26.08.2026) uten at det ser ut som et løsrevet
 * miniatyr-rutenett. aspect-[4/3] er kun en fallback-minstehøyde for
 * mobil (der de stables under hverandre, ikke ved siden av hovedbildet);
 * fra lg og opp overstyres den av flex-1 i den flex-kolonnen som pakker
 * dem inn (se under), slik at de to sammen deler nøyaktig hovedbildets
 * fulle høyde.
 */
function SecondaryPick({ recipe, lang }: { recipe: RecipeSummary; lang: Lang }) {
  return (
    <Link
      href={`/oppskrifter/${recipe.slug}`}
      className="group relative flex aspect-[4/3] w-full overflow-hidden rounded-card bg-paper lg:aspect-auto lg:flex-1"
    >
      {recipe.heroImageUrl ? (
        <Image
          src={recipe.heroImageUrl}
          alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-faint">
          <span className="font-serif text-sm">{t(lang, "recipeCard.imageComing")}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      {recipe.category && (
        <span className="absolute left-4 top-4 rounded-full bg-cream/85 px-2.5 py-1 text-[0.7rem] font-medium tracking-wide text-ink backdrop-blur-sm">
          {localizedCategoryName(recipe.category, lang)}
        </span>
      )}
      <div className="relative mt-auto w-full p-4 sm:p-5">
        {/* text-ink (IKKE text-cream – "cream" er nær-sort i denne
            paletten, se globals.css, og var derfor praktisk talt usynlig
            her). text-ink er den faktiske lyse/krembeige tekstfargen, samme
            prinsipp som h1-en i heroen lenger opp på siden bruker oppå sitt
            mørke bilde. Litt mindre skrift på mobil (Henrik 26.08.2026: må
            være synlig der også, gjerne i mindre skrift). */}
        <h3 className="text-balance font-serif text-sm leading-snug text-ink transition-colors group-hover:text-clay-dark sm:text-base lg:text-lg">
          {localizedTitle(recipe, lang)}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-ink/80 sm:text-xs">
          <ClockIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-5 lg:items-stretch lg:gap-12">
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
          // flex-col + lg:h-full: sammen med lg:items-stretch på griden over
          // gir dette de to (eller ett, hvis kun 2 oppskrifter totalt) bildene
          // her nøyaktig hovedbildets fulle høyde å dele på (via flex-1 i
          // SecondaryPick), i stedet for å stoppe når egen tekst/bilde-innhold
          // er brukt opp og etterlate tomrom nederst.
          <div className="flex flex-col gap-5 lg:col-span-2 lg:h-full">
            {others.map((recipe) => (
              <SecondaryPick key={recipe.id} recipe={recipe} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
