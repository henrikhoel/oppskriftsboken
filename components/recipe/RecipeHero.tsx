import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EditIcon } from "@/components/ui/icons";

/**
 * Oppskriftssidens hero – redesignet 31.08.2026 (spesifikasjonens punkt 1,
 * merket "VIKTIGSTE ENDRING"). Erstatter den gamle helbrede, liggende
 * heltskjerm-bildeblokken (som lå UTENFOR sideinnholdet i app/oppskrifter/
 * [slug]/page.tsx, beskåret til en fast vh-høyde med object-cover) med en
 * ekte, redaksjonell to-kolonners inndeling: info til venstre, ett rent,
 * ubeskåret 1:1-kvadratisk bilde til høyre. Bildet vises ALDRI som
 * bakgrunn og får ALDRI tekst lagt oppå seg – object-contain (ikke
 * object-cover) i en kvadratisk ramme sikrer at det aldri beskjæres
 * liggende/zoomes, uansett kildebildets faktiske proporsjoner.
 *
 * Stables vertikalt på mobil/nettbrett med BILDET FØRST (samme rekkefølge
 * som brukeren ville sett et ekte magasinoppslag – bildet trekker
 * oppmerksomheten før man leser), info under. Fra lg og opp: to jevne
 * kolonner side ved side, bildet til høyre.
 *
 * FRA xl (1280px) OG OPP – finjustering 31.08.2026 etter tilbakemelding
 * ("venstresiden føltes som en sidebar, bildet var for lite"): heroen
 * bryter bevisst ut av den vanlige max-w-5xl-innholdscontaineren
 * (app/oppskrifter/[slug]/page.tsx) og blir bredere enn resten av
 * oppskriftsinnholdet under – klassisk "full-bleed"-triks (relative +
 * left-1/2 + w-screen + negativ margin = -50vw), som sentrerer en bredere
 * sone på MIDTEN AV VIEWPORTET uansett hvor bred/smal den vanlige
 * foreldre-containeren er. En egen indre container (xl:max-w-[1280px])
 * setter selve den nye, bredere bredden på denne sonen, sentrert likt med
 * resten av siden. Kolonnene bytter fra fleksibel bredde til faste
 * pixel-mål (520px tekst / 640px bilde, redusert gap) for å faktisk treffe
 * de konkrete måltallene ønsket ("ca. 480–540px tekstkolonne", "ca.
 * 620–650px bilde") i stedet for at de bare vokser ukontrollert med
 * skjermbredden. UNDER xl (dvs. selve lg-laget, 1024–1279px) er ALT
 * uendret fra før – kun store skjermer berøres. Bildet er fortsatt
 * object-contain i en kvadratisk ramme (aldri beskåret/zoomet), kun selve
 * rammen er større.
 *
 * Rent presentasjonelt – all state (favoritt, EN-oversettelse osv.) eies
 * fortsatt av RecipeInteractive.tsx, som sender inn ferdige noder
 * (favorite/rating/meta) for de bitene som allerede er egne, selvstendige
 * komponenter. Ingen egen logikk her utover selve layouten.
 */
export function RecipeHero({
  imageUrl,
  imageAlt,
  imagePendingLabel,
  categoryLabel,
  tags,
  isDraft,
  draftLabel,
  title,
  description,
  translating,
  translatingLabel,
  translateError,
  onRetryTranslate,
  retryTranslateLabel,
  isAdmin,
  editHref,
  editLabel,
  favorite,
  rating,
  meta,
}: {
  imageUrl: string | null;
  imageAlt: string;
  imagePendingLabel: string;
  categoryLabel?: string | null;
  tags: { id: string; name: string }[];
  isDraft: boolean;
  draftLabel: string;
  title: string;
  description: string;
  translating?: boolean;
  translatingLabel?: string;
  translateError?: string | null;
  onRetryTranslate?: () => void;
  retryTranslateLabel?: string;
  isAdmin: boolean;
  editHref: string;
  editLabel: string;
  favorite: ReactNode;
  rating: ReactNode;
  meta: ReactNode;
}) {
  return (
    // Full-bleed-triks (kun aktivt fra xl/1280px, se filheaderen): denne
    // ytre div-en unnslipper foreldrecontainerens max-w-5xl og strekker
    // seg til hele viewportbredden, sentrert. Under xl er alle disse
    // klassene no-ops (kun prefikset xl:), så layouten er 100% uendret
    // helt til og med lg.
    <div className="xl:relative xl:left-1/2 xl:-mx-[50vw] xl:w-screen">
      {/* Den indre containeren setter selve den nye, bredere bredden på
          den utbrutte sonen (bredere enn max-w-5xl under, men fortsatt
          sentrert likt) – egen padding siden vi har forlatt sidens vanlige
          container/padding-kontekst her. */}
      <div className="xl:mx-auto xl:max-w-[1280px] xl:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start lg:gap-16 xl:grid-cols-[520px_640px] xl:justify-center xl:gap-10">
          {/* Bildet – først i DOM-rekkefølgen slik at det også kommer først
              på mobil (order-* under er kun en visuell omplassering fra lg
              og opp, se class-navnene). Kvadratisk ramme uansett
              skjermstørrelse; object-contain + en rolig bg-cream-dark bak
              sikrer at et bilde som IKKE selv er kvadratisk vises helt og
              ubeskåret (evt. luft over/under eller til sidene), aldri
              beskåret liggende. */}
          <div className="order-1 lg:order-2">
            <div className="relative mx-auto aspect-square w-full max-w-[540px] overflow-hidden rounded-card bg-cream-dark xl:max-w-[640px]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  priority
                  sizes="(min-width: 1280px) 640px, (min-width: 1024px) 540px, 100vw"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-serif text-lg text-ink-faint">{imagePendingLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel && <Badge tone="clay">{categoryLabel}</Badge>}
              {tags.map((tag) => (
                <Badge key={tag.id} tone="neutral">
                  {tag.name}
                </Badge>
              ))}
              {isDraft && <Badge tone="mustard">{draftLabel}</Badge>}
            </div>

            {/* Favoritt/Rediger bor bevisst inne HER, tett på tittelen –
                ikke som en flytende actions-rad andre steder på siden –
                slik at de aldri konkurrerer visuelt med selve bildet
                (spesifikasjonens punkt 13). */}
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-[2.75rem]">
                {title}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                {isAdmin && (
                  <Link
                    href={editHref}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-cream-dark"
                  >
                    <EditIcon className="h-4 w-4" />
                    {editLabel}
                  </Link>
                )}
                {favorite}
              </div>
            </div>

            {/* max-w-xl (576px) under xl – uendret. Fra xl: en egen,
                litt strammere max-width (~500px, spesifikasjonens
                ønskede ingress-bredde) fremfor å la teksten fylle hele
                den nye 520px-brede kolonnen helt ut til kanten – gir en
                komfortabel, redaksjonell lesebredde uten å gjøre selve
                skriften mindre. */}
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg xl:max-w-[500px]">
              {description}
            </p>
            {translating && <p className="mt-1 text-xs text-ink-faint">{translatingLabel}</p>}
            {translateError && (
              <p className="mt-1 text-xs text-clay-dark">
                {translateError}{" "}
                {onRetryTranslate && (
                  <button type="button" onClick={onRetryTranslate} className="font-medium underline underline-offset-2">
                    {retryTranslateLabel}
                  </button>
                )}
              </p>
            )}

            <div className="mt-4">{rating}</div>

            <div className="mt-6 border-t border-line pt-6">{meta}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
