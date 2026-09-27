import { Button } from "@/components/ui/Button";

/**
 * (27.09.2026) Generisk "låst"-boks – Henrik: "man skal kunne trykke inn på
 * alt på siden, men at funksjonene er låst", presisert med guider og
 * oppskrifter som eksempler. Brukt av de kontoeksklusive sidene
 * (favoritter/handleliste/"I kjøleskapet"/"Bygg din egen meny") og av
 * guide-detaljsider når ingen er innlogget. Se RecipeTeaser.tsx for
 * oppskrifter, som har sin egen, mer forseggjorte variant (bilde/tittel/
 * beskrivelse synlig over) – disse sidene har ikke noe tilsvarende
 * meningsfullt å vise frem over boksen, så her ER hele det låste
 * innholdet bare denne boksen.
 */
export function LockedPanel({
  message,
  ctaLabel,
  nextPath,
}: {
  message: string;
  ctaLabel: string;
  nextPath: string;
}) {
  return (
    <div className="rounded-card bg-ink px-6 py-16 text-center sm:px-10">
      <p className="mx-auto max-w-sm text-sm text-cream/80">{message}</p>
      <div className="mt-5">
        <Button href={`/logg-inn?next=${encodeURIComponent(nextPath)}`} variant="primary">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
