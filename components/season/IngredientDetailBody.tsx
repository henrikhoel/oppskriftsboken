import Link from "next/link";
import type { Season, SeasonalIngredient } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import { computeIngredientStatus } from "@/lib/kitchen-intelligence/seasonal";
import {
  ingredientOriginLabel,
  ingredientStatusLabel,
  localizedIngredientDescription,
  localizedIngredientName,
  localizedIngredientSeasonNote,
} from "@/lib/utils/season-format";
import { localizedTitle } from "@/lib/utils/format";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * De fem tingene råvaresiden skal svare på (spesifikasjonens punkt 22:
 * når er dette i sesong, når er det på sitt beste, hvorfor, hvor kommer
 * informasjonen fra, hva kan jeg lage med det) – FRITATT header-blokken
 * (tilbakelenke, opprinnelsesgruppe-eyebrow, H1-navn), som er forskjellig
 * avhengig av om dette rendres på den dedikerte /sesong/[råvareslug]-siden
 * (IngredientDetail.tsx) eller inline i en utvidbar rad i
 * SeasonIngredientList.tsx – navnet står jo allerede i selve raden der.
 * Skilt ut 28.08.2026 nettopp for å dele denne logikken mellom de to
 * stedene uten duplisering.
 *
 * Forenklet 28.08.2026 (Henriks eksplisitte tilbakemelding: for mange,
 * delvis motstridende tall på én gang – sesongtagger, "neste sesong",
 * peak-vindu OG en egen "Sesong: X"-linje samtidig). Statuslinjen svarer
 * nå på ÉTT spørsmål ("når er den på sitt beste?" – se
 * ingredientStatusLabel() i lib/utils/season-format.ts), og
 * "hvilke sesongsider vises den på"/"hva er hele tilgjengelighetsvinduet"
 * er bevisst IKKE med her lenger – den informasjonen hører uansett hjemme
 * i selve kildeteksten (seasonNoteNo/En) når den er relevant.
 *
 * Samme runde: brødteksten viser ALDRI description OG seasonNote samtidig
 * lenger (Henrik oppdaget at de sto rett under hverandre og i praksis
 * gjentok hverandre – seasonNoteNo er per definisjon description + mer
 * kontekst for de ~14 råvarene som har begge, se lib/demo-data/seasons.ts).
 * seasonNote vinner når begge finnes (den ER description sitt innhold pluss
 * kildebasert utdyping), description er kun fallback for råvarer som
 * mangler en egen seasonNote. `descriptionNo/En` brukes fortsatt alene til
 * meta-description i generateMetadata() i app/sesong/[slug]/page.tsx.
 *
 * `isLive` (default true) styrer om statuslinjen får bruke "nå"-ord ("i
 * sesong nå"/"utenfor sesong"/"på sitt beste nå") – se filheaderen til
 * ingredientStatusLabel() i lib/utils/season-format.ts for hvorfor: en
 * råvare som vises på en sesongside kun via flersesong-overlappet (ikke
 * dens egen hjemme-sesong) skal ikke late som "nå" gjelder når DEN
 * sesongsiden ikke er den vi faktisk er i. Satt fra SeasonIngredientList.tsx
 * (basert på om sesongsiden som vises er den nåværende); IngredientDetail.tsx
 * (råvarens egen faste side) bruker default true – der er "nå" alltid
 * riktig kontekst. `homeSeason.months` sendes ALLTID med som femte
 * argument (fallback for råvarer uten eget eksplisitt sesongvindu) – på en
 * ikke-live side leder statuslinjen da med råvarens EGET sesongvindu
 * ("i sesong i mai–september") før et eventuelt peak-vindu, i stedet for å
 * bare vise peak løsrevet fra hvorfor råvaren står oppført på den siden.
 */
export function IngredientDetailBody({
  ingredient,
  homeSeason,
  recipes,
  lang,
  isLive = true,
}: {
  ingredient: SeasonalIngredient;
  homeSeason: Season;
  recipes: SearchableRecipe[];
  lang: Lang;
  isLive?: boolean;
}) {
  const status = computeIngredientStatus(ingredient, homeSeason.months, new Date());
  const description = localizedIngredientDescription(ingredient, lang);
  const seasonNote = localizedIngredientSeasonNote(ingredient, lang);
  const statusLabel = ingredientStatusLabel(ingredient, status, lang, isLive, homeSeason.months);

  return (
    <>
      {statusLabel && (
        <div className="mt-3">
          <span
            className={`text-xs font-semibold uppercase tracking-[0.12em] ${
              isLive && status.kind === "peak" ? "text-clay-dark" : "text-ink-faint"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      )}

      {ingredient.origin === "imported" && (
        <p className="mt-2 text-xs text-ink-faint">{ingredientOriginLabel(ingredient.origin, lang)}</p>
      )}

      {(seasonNote || description) && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="leading-relaxed text-ink-soft">{seasonNote ?? description}</p>
        </div>
      )}

      {ingredient.sourceName && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">{t(lang, "season.source")}</p>
          {ingredient.sourceUrl ? (
            <a
              href={ingredient.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1 inline-flex items-center gap-1 text-sm text-clay-dark hover:underline"
            >
              {ingredient.sourceName}
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">{ingredient.sourceName}</p>
          )}
        </div>
      )}

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
          {t(lang, "season.recipesWithIngredient", { name: localizedIngredientName(ingredient, lang) })}
        </h2>
        {recipes.length > 0 ? (
          <ul className="divide-y divide-line/60">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={`/oppskrifter/${recipe.slug}`}
                  className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-cream-dark/40"
                >
                  <span className="font-serif text-base text-ink transition-colors group-hover:text-clay">
                    {localizedTitle(recipe, lang)}
                  </span>
                  <span className="text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">{t(lang, "season.noRecipesYet")}</p>
        )}
      </div>
    </>
  );
}
