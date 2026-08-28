"use client";

import Link from "next/link";
import type { ExternalRecipeMatch } from "@/lib/types";

/**
 * Delt visning av ETT eksternt oppskrift-treff (fra Anthropics ekte
 * web-søk, se ExternalRecipeMatch i lib/types.ts) – brukt BÅDE av
 * "Finn oppskrifter andre steder" på "Hva kan jeg lage?"
 * (PantryMatchView.tsx) OG "Finn oppskrift" på "Ny oppskrift"-siden
 * (RecipeForm.tsx). Flyttet hit til én delt komponent 27.08.2026 (ønsket
 * av Henrik: "identisk med sånn det er på 'hva kan jeg lage?' nå") – ett
 * sted å vedlikeholde selve kortet garanterer at de to stedene aldri kan
 * gli fra hverandre visuelt.
 *
 * `onCreateAsRecipe` er det eneste som faktisk SKILLER de to
 * bruksstedene: på "Hva kan jeg lage?" navigerer den til "Ny
 * oppskrift"-siden med URL-en i en query-param; på selve "Ny
 * oppskrift"-siden er admin allerede der, så den fyller i stedet
 * "Importer fra lenke"-feltet og starter importen med det samme, uten en
 * full sidenavigering (se handleFindDishRecipes i RecipeForm.tsx).
 *
 * missingIngredients-/handleliste-seksjonen vises kun når `onAddMissing`
 * er gitt OG treffet faktisk har noen – "Finn oppskrift" har ingen
 * pantry-kontekst å sammenligne mot (missingIngredients er alltid tom
 * derfra), og utelater derfor onAddMissing/missingAdded helt.
 *
 * Alle tekster har norske standardverdier (RecipeForm.tsx sitt admin-panel
 * er ikke en del av det tospråklige besøkende-i18n-systemet, samme
 * konvensjon som resten av admin-skjemaet) – PantryMatchView.tsx sender
 * inn oversatte strenger via t(lang, …) siden DEN siden er tospråklig.
 */
export function ExternalRecipeMatchCard({
  match,
  onCreateAsRecipe,
  createLabel = "Opprett som egen oppskrift →",
  missingLabel = "Mangler",
  addMissingLabel = "Legg i handleliste",
  missingAddedLabel = "Lagt til i handleliste",
  missingAdded = false,
  onAddMissing,
}: {
  match: ExternalRecipeMatch;
  onCreateAsRecipe: () => void;
  createLabel?: string;
  missingLabel?: string;
  addMissingLabel?: string;
  missingAddedLabel?: string;
  missingAdded?: boolean;
  onAddMissing?: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-clay-light px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-clay-dark">
          {match.siteName}
        </span>
      </div>
      <a
        href={match.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 block font-serif text-lg text-ink hover:text-clay-dark"
      >
        {match.title}
      </a>
      {match.note && <p className="mt-1 text-sm text-ink-soft">{match.note}</p>}
      {onAddMissing && match.missingIngredients.length > 0 && (
        <>
          <p className="mt-1.5 line-clamp-2 text-xs text-ink-faint">
            {missingLabel}: {match.missingIngredients.join(", ")}
          </p>
          {missingAdded ? (
            <Link
              href="/handleliste"
              className="mt-1 block text-xs font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
            >
              {missingAddedLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAddMissing}
              className="mt-1 block cursor-pointer text-xs font-medium text-clay hover:text-clay-dark"
            >
              {addMissingLabel}
            </button>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onCreateAsRecipe}
        className="mt-3 block cursor-pointer text-sm font-medium text-clay underline underline-offset-2 hover:text-clay-dark"
      >
        {createLabel}
      </button>
    </div>
  );
}
