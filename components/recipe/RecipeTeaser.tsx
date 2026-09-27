import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

/**
 * (27.09.2026) Gjenopplivet fra den opprinnelige RecipeTeaser.tsx (fjernet
 * 26.09.2026 sammen med det gamle fellespassordet for hele nettstedet, se
 * git-historikk commit 2846ef1) – samme visuelle mønster som før, men nå
 * koblet til det ordentlige kontosystemet (getCurrentUserFast i
 * app/oppskrifter/[slug]/page.tsx) i stedet for det gamle
 * SITE_ACCESS_COOKIE-fellespassordet. Vises i stedet for RecipeInteractive
 * når en besøkende ikke er logget inn. To grunner til at dette fortsatt er
 * en egen, enkel server-komponent i stedet for en "låst"-prop på
 * RecipeInteractive:
 *
 *   1. RecipeInteractive er en stor "use client"-komponent som eier masse
 *      egen state (skalering, Cook Mode, handleliste, smart-erstatning,
 *      osv.) – å bygge inn en låst tilstand der ville krevd å dra den
 *      samme klienttilstanden inn for besøkende som uansett ikke skal se
 *      noe av det.
 *   2. Selve poenget er at ingrediens-/fremgangsmåte-INNHOLDET aldri skal
 *      havne i HTML-en/DOM-en i det hele tatt for en ikke-innlogget
 *      besøkende – en CSS-basert "fade" over det ekte innholdet ville
 *      fortsatt sendt hele teksten til nettleseren (og enhver bot), bare
 *      visuelt skjult. Denne komponenten får ALDRI ingredientGroups/steps
 *      sendt inn til seg – kun tittel/bilde/beskrivelse, som uansett skal
 *      være synlig for lenkeforhåndsvisninger (Open Graph/JSON-LD, se
 *      generateMetadata i app/oppskrifter/[slug]/page.tsx).
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
            <Button href={`/logg-inn?next=${encodeURIComponent(nextPath)}`} variant="primary">
              {t(lang, "recipeDetail.lockedCta")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
