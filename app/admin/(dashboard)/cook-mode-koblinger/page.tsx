import type { Metadata } from "next";
import { getCookModeLinkQueue } from "@/lib/data/cookmode-link-review";
import { CookModeLinkReviewBoard } from "@/components/admin/CookModeLinkReviewBoard";

export const metadata: Metadata = { title: "Cook Mode-koblinger" };

/**
 * "Jeg vil slippe å gå manuelt gjennom 300+ oppskrifter for å opprette Cook
 * Mode-koblinger" (07.10.2026) – batch-forslag + kvalitetssikring for "I
 * dette steget" (se RecipeStep.ingredientItemIds i lib/types.ts), på tvers
 * av ALLE oppskrifter samtidig, i stedet for å åpne hver enkelt oppskrifts
 * eget redigeringsskjema (StepsEditor.tsx sin "Foreslå ingredienskoblinger"
 * dekker fortsatt ETT-og-ETT-tilfellet godt – denne siden er for de 300+).
 *
 * Selve kø-listen lastes server-side her (samme mønster som
 * oppskrifter/page.tsx) og sendes ned som initial state til klient-
 * komponenten, som deretter eier all videre interaktivitet (filter,
 * batch-kjøring, enkelt-godkjenning) selv via Server Actions i
 * lib/actions/cookmode-link-review.ts.
 */
export default async function CookModeLinksPage() {
  const queue = await getCookModeLinkQueue();

  return (
    <div>
      <h1 className="mb-2 font-serif text-2xl text-ink sm:text-3xl">Cook Mode-koblinger</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        AI-foreslåtte koblinger mellom ingredienslinjer og steg for «I dette steget» i Cook Mode. Ingenting lagres
        automatisk – se over tvilstilfellene under «Bør sjekkes», og godkjenn resten samlet med «Godkjenn alle
        klare».
      </p>
      <CookModeLinkReviewBoard initialQueue={queue} />
    </div>
  );
}
