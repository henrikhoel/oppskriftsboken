import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { formatMinutes, localizedTitle } from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * Lett, visuelt kort for rutenettet under "Utvalgt" på /helg-og-gjester
 * (03.10.2026, se WeekendGuestsClient.tsx). BEVISST ikke RecipeCard.tsx –
 * Henrik sin spesifikasjon: "Kortene skal være mer visuelle og mindre
 * 'database' enn kortene på Alle oppskrifter [...] Ikke fyll kortene med
 * kategori-, vanskelighets- og andre badges." Ingen Badge/kategori/
 * vanskelighetsgrad/rating/favoritt-hjerte her – kun bilde, serif-tittel,
 * evt. tid, og en egen "Gjør det til en kveld →"-lenke.
 *
 * To SEPARATE <Link>-elementer (bilde+tittel vs. "Gjør det til en
 * kveld →"), ikke én stor kort-lenke som RecipeCard.tsx – HTML tillater
 * ikke nøstede <a>-tagger, og spesifikasjonen ber eksplisitt om en synlig
 * "Gjør det til en kveld →" i tillegg. Bilde-lenken er aria-hidden/
 * tabIndex=-1 (ren visuell snarvei) – tittelen er den ene, tilgjengelige
 * "se oppskriften"-lenken, samme mål. Ingen egen "Se oppskriften →"-tekst
 * trengs her (bildet/tittelen er allerede implisitt klikkbare, samme
 * "man skjønner at man kan trykke på den"-prinsipp som
 * FeaturedEditorial.tsx på forsiden) – til forskjell fra selve
 * UTVALGT-seksjonen (WeekendGuestsFeatured.tsx), som viser begge CTA-ene
 * eksplisitt siden den er større og mer editoriell.
 *
 * "Gjør det til en kveld →" lenker til oppskriftssidens EKSISTERENDE
 * MealBuilder-seksjon via #gjor-det-til-en-kveld (se id-en lagt til i
 * RecipeInteractive.tsx) – ingen ny, parallell funksjon bygget her.
 */
export function WeekendGuestsCard({
  recipe,
  priority = false,
  lang = "no",
}: {
  recipe: RecipeSummary;
  priority?: boolean;
  lang?: Lang;
}) {
  return (
    <div className="group flex flex-col gap-3">
      <Link
        href={`/oppskrifter/${recipe.slug}`}
        className="block overflow-hidden rounded-card bg-paper"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
          {recipe.heroImageUrl ? (
            <Image
              src={recipe.heroImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint">
              <span className="font-serif text-sm">{t(lang, "recipeCard.imageComing")}</span>
            </div>
          )}
        </div>
      </Link>
      <div>
        {/* Egen, synlig lenke for tittelen (bildet over er aria-hidden/
            tabIndex=-1 nettopp for å unngå to identiske, etterfølgende
            tab-stopp til samme mål – tittelen alene bærer den tilgjengelige
            "se oppskriften"-handlingen). */}
        <Link href={`/oppskrifter/${recipe.slug}`} className="transition-colors hover:text-clay-dark">
          <h3 className="text-balance font-serif text-lg leading-snug text-ink">{localizedTitle(recipe, lang)}</h3>
        </Link>
        {recipe.totalTimeMinutes != null && (
          <p className="mt-1 text-xs text-ink-faint">{formatMinutes(recipe.totalTimeMinutes, lang)}</p>
        )}
        <Link
          href={`/oppskrifter/${recipe.slug}#gjor-det-til-en-kveld`}
          className="mt-2 inline-block text-sm font-medium text-clay transition-colors hover:text-clay-dark"
        >
          {t(lang, "weekendGuests.makeItANight")}
        </Link>
      </div>
    </div>
  );
}
