import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { localizedTitle, localizedDescription } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * "UTVALGT" – den store, editorielle enkelt-rett-seksjonen rett under
 * hero/filterområdet på /helg-og-gjester (03.10.2026, se
 * WeekendGuestsClient.tsx for hvordan `recipe` velges). Henrik sin
 * spesifikasjon: "stort bilde, omtrent 60 % av bredden, informasjon om
 * retten ved siden av, stor serif-tittel, kort beskrivelse,
 * «Se oppskriften →», «Gjør det til en kveld →» [...] Hold uttrykket
 * luftig og editorial. Ikke lag dette som et vanlig card."
 *
 * Bevisst IKKE FeaturedEditorial.tsx (forsidens "Husets favoritter") –
 * den stabler bilde øverst/tekst under selv på desktop. Her ligger bildet
 * og teksten derimot SIDE OM SIDE fra lg og opp (flex-row, bildet ~60 %),
 * og stables vertikalt under lg – nettopp layouten Henrik ba om
 * ("ved siden av", ikke under).
 *
 * Ingen admin-styrt "velg featured manuelt" i denne første versjonen
 * (Henrik: "I første versjon trenger vi ikke egen admin-funksjon [...]
 * Arkitekturen bør ikke gjøre det vanskelig å legge til manuelt featured-
 * valg senere") – `recipe` kommer inn som en ferdig, deterministisk valgt
 * prop fra WeekendGuestsClient.tsx (høyeste displayOrder i aktivt filter).
 * Skulle et manuelt valg komme senere, er denne komponenten uendret – kun
 * HVORDAN `recipe` velges i kalleren ville endre seg.
 */
export function WeekendGuestsFeatured({ recipe, lang }: { recipe: RecipeSummary; lang: Lang }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
        {t(lang, "weekendGuests.featuredEyebrow")}
      </p>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
        <Link
          href={`/oppskrifter/${recipe.slug}`}
          className="group block w-full overflow-hidden rounded-card bg-paper lg:w-[60%] lg:shrink-0"
        >
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
            {recipe.heroImageUrl ? (
              <Image
                src={recipe.heroImageUrl}
                alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
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
          </div>
        </Link>

        <div className="lg:flex-1">
          <h2 className="text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">
            {localizedTitle(recipe, lang)}
          </h2>
          {recipe.description && (
            <p className="mt-4 max-w-md text-pretty text-ink-soft">{localizedDescription(recipe, lang)}</p>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link
              href={`/oppskrifter/${recipe.slug}`}
              className="text-sm font-medium text-ink transition-colors hover:text-clay-dark"
            >
              {t(lang, "weekendGuests.viewRecipe")}
            </Link>
            <Link
              href={`/oppskrifter/${recipe.slug}#gjor-det-til-en-kveld`}
              className="text-sm font-medium text-clay transition-colors hover:text-clay-dark"
            >
              {t(lang, "weekendGuests.makeItANight")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
