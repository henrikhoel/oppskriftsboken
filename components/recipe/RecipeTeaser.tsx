import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

/**
 * (26.09.2026) Vises i stedet for RecipeInteractive når besøkende IKKE har
 * fellespassordet (se proxy.ts og app/oppskrifter/[slug]/page.tsx) – Henrik:
 * "man får opp toppen av oppskriften, med navn og bilde osv, men så er det
 * fadet til svart nedover, og for å se resten (fremgangsmåte, ingredienser)
 * så må man logge inn". To grunner til at dette er EN EGEN, enkel
 * server-komponent i stedet for f.eks. å style om RecipeInteractive med en
 * "låst"-prop:
 *
 *   1. RecipeInteractive er en stor "use client"-komponent som eier masse
 *      egen state (skalering, Cook Mode, handleliste, smart-erstatning,
 *      osv.) – å bygge inn en låst tilstand der ville krevd å dra den samme
 *      klienttilstanden inn for besøkende som uansett ikke skal se noe av
 *      det.
 *   2. Selve POENGET (samme copyright-hensyn som startet fellespassordet i
 *      utgangspunktet, se proxy.ts sin filhead) er at ingrediens-/
 *      fremgangsmåte-INNHOLDET aldri skal havne i HTML-en/DOM-en i det hele
 *      tatt for en ikke-innlogget besøkende – en CSS-basert "fade" over det
 *      ekte innholdet ville fortsatt sendt hele teksten til nettleseren
 *      (og enhver bot), bare visuelt skjult. Denne komponenten får ALDRI
 *      ingredientGroups/steps sendt inn til seg – kun tittel/bilde/
 *      beskrivelse, som uansett skal være synlig for lenkeforhåndsvisninger
 *      (Open Graph/JSON-LD, se generateMetadata i app/oppskrifter/[slug]/
 *      page.tsx).
 */
export function RecipeTeaser({
  title,
  description,
  imageUrl,
  imageAlt,
  categoryLabel,
  nextPath,
  lang,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  categoryLabel?: string | null;
  nextPath: string;
  lang: Lang;
}) {
  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-card bg-cream-dark">
          {imageUrl ? (
            <Image src={imageUrl} alt={imageAlt} fill priority sizes="420px" className="object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-serif text-lg text-ink-faint">{t(lang, "recipeDetail.imagePending")}</span>
            </div>
          )}
        </div>

        {categoryLabel && (
          <div className="mt-6 flex justify-center">
            <Badge tone="clay">{categoryLabel}</Badge>
          </div>
        )}

        <h1 className="mt-4 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">{description}</p>
      </div>

      {/* Fade-til-svart – bryter bevisst ut av sidens vanlige innholds-
          padding (px-4/sm:px-6/lg:px-8, se app/oppskrifter/[slug]/page.tsx)
          til full bredde, som et sluttet forheng nederst på siden. */}
      <div className="relative mt-12 -mx-4 sm:-mx-6 lg:-mx-8">
        <div aria-hidden="true" className="h-32 bg-gradient-to-b from-transparent to-ink sm:h-40" />
        <div className="bg-ink px-4 pb-20 pt-2 text-center sm:px-6 lg:px-8">
          <p className="mx-auto max-w-sm text-sm text-cream/80">{t(lang, "recipeDetail.lockedMessage")}</p>
          <div className="mt-5">
            <Button href={`/adgang?next=${encodeURIComponent(nextPath)}`} variant="primary">
              {t(lang, "recipeDetail.lockedCta")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
