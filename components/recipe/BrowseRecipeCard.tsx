import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { SPICE_LEVEL_CLASSES, type SpiceLevel } from "@/lib/config";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";
import {
  formatMinutes,
  difficultyLabel,
  localizedTitle,
  localizedCategoryName,
  spiceLevelLabel,
} from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * Kort for /oppskrifter sitt redesignede, kompakte bibliotek-rutenett
 * (04.10.2026, Henrik: "Jeg vil bort fra dagens store mørke oppskriftskort
 * med bakgrunnsflate. Bruk heller samme rene, editorial prinsipp som
 * oppskriftslisten på 'Helg & gjester', men behold høyere
 * informasjonstetthet"). BEVISST en EGEN komponent, IKKE en endring av
 * RecipeCard.tsx – RecipeCard brukes fortsatt akkurat som før på
 * favoritter, kategori-sider, forsidens seksjoner, handlekurv-forslag osv.
 * (se grep-treff på "RecipeCard"/"RecipeGrid" i resten av komponenttreet),
 * og Henrik ba kun om å redesigne SELVE "Alle oppskrifter"-gridet, ikke
 * disse andre stedene.
 *
 * Til forskjell fra WeekendGuestsCard.tsx (som card-mønsteret er inspirert
 * av) beholder dette kortet favoritt-hjertet og en diskret metadata-linje
 * – Henrik: "behold høyere informasjonstetthet fordi 'Alle oppskrifter' har
 * mange hundre oppskrifter", til forskjell fra Helg & gjester sin kuraterte
 * håndfull. Ingen kort-bakgrunn/skygge/padding rundt hele kortet (kun selve
 * bildet har en bakgrunnsflate, som plassholder før bildet er lastet) –
 * resten av informasjonen ligger fritt på sidens egen bg-cream, akkurat som
 * spesifisert.
 *
 * Bildeformatet er UENDRET 4:3 (ikke ekte 1:1 – Henrik beskrev det som
 * "1:1-bildene", men bekreftet ved spørsmål at dagens 4:3-utsnitt, identisk
 * med RecipeCard/WeekendGuestsCard, skal beholdes, ikke byttes til et nytt,
 * strammere kvadratisk utsnitt).
 *
 * Metadata-linjen («Kylling · Enkel · 40 min») erstatter de tidligere STORE
 * kategori-/vanskelighetsgrad-badgene (Badge-komponenten) med ren,
 * typografisk tekst – ett enkelt tekstelement, delene limt sammen med
 * " · ", med `.filter(Boolean)` som hopper over felt enkelte oppskrifter
 * mangler (f.eks. ingen kategori). Oppskriftsbeskrivelsen og stjerne-
 * ratingen fra RecipeCard er bevisst UTELATT her – ikke nevnt i det nye
 * innholdshierarkiet Henrik spesifiserte (metadata → serif-tittel, ferdig),
 * og høyere tetthet handler her om FLERE kort synlige samtidig, ikke mer
 * tekst per kort.
 *
 * Sterkhetsgrad (04.10.2026, Henrik: "få sterkheten fram her også, på
 * oversikten over rettene, til høyre rett under bildet") – samme liten
 * fargetone-pill som på selve oppskriftssiden (RecipeHero.tsx, se
 * SPICE_LEVEL_CLASSES sin filheader i lib/config.ts), men plassert til
 * HØYRE på metadata-raden (egen flex-rad, justify-between) i stedet for
 * i selve metadata-strengen – styrkegrad er ikke "enda et sted" på
 * samme linje som kategori/vanskelighetsgrad/tid, det skal skille seg ut
 * visuelt akkurat som på oppskriftssiden. Vises kun når oppskriften
 * faktisk har en satt styrkegrad (ikke alle oppskrifter er sterk mat).
 */
export function BrowseRecipeCard({
  recipe,
  priority = false,
  isAdmin = false,
  isLoggedIn = false,
  lang = "no",
}: {
  recipe: RecipeSummary;
  priority?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  lang?: Lang;
}) {
  const metaParts = [
    recipe.category ? localizedCategoryName(recipe.category, lang) : null,
    difficultyLabel(recipe.difficulty, lang),
    recipe.totalTimeMinutes != null ? formatMinutes(recipe.totalTimeMinutes, lang) : null,
  ].filter((part): part is string => Boolean(part));

  const spiceLevel = recipe.spiceLevel as SpiceLevel | null | undefined;
  const spiceText = spiceLevel ? spiceLevelLabel(spiceLevel, lang) : null;

  return (
    <Link href={`/oppskrifter/${recipe.slug}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-cream-dark">
        {recipe.heroImageUrl ? (
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <span className="font-serif text-sm">{t(lang, "recipeCard.imageComing")}</span>
          </div>
        )}
        {/* Samme "ingen hjerte for en ikke-innlogget besøkende"-regel som
            RecipeCard.tsx, se FavoriteButton.tsx sin filheader. */}
        {(isAdmin || isLoggedIn) && (
          <div className="absolute right-3 top-3 shadow-card">
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorited={isAdmin ? recipe.favoritedByAdmin : false}
              isAdmin={isAdmin}
              isLoggedIn={isLoggedIn}
              size="sm"
              lang={lang}
            />
          </div>
        )}
      </div>

      {(metaParts.length > 0 || spiceText) && (
        <div className="mt-3 flex items-start justify-between gap-2">
          {metaParts.length > 0 ? (
            <p className="text-xs text-ink-faint">{metaParts.join(" · ")}</p>
          ) : (
            <span />
          )}
          {spiceLevel && spiceText ? (
            <span
              className={clsx(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
                SPICE_LEVEL_CLASSES[spiceLevel],
              )}
              aria-label={`${t(lang, "recipeDetail.spicy")}: ${spiceText}`}
            >
              {spiceText}
            </span>
          ) : null}
        </div>
      )}
      <h3 className="mt-1 text-balance font-serif text-sm leading-snug text-ink transition-colors group-hover:text-clay-dark sm:text-base">
        {localizedTitle(recipe, lang)}
      </h3>
    </Link>
  );
}
