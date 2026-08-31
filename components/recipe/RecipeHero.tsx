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
 * VENSTREKOLONNE-RAFFINEMENT 31.08.2026 (etter tilbakemelding: "riktige
 * dimensjoner nå, men venstresiden utnytter ikke flaten – hierarki/spacing,
 * ikke mer innhold"): bevisst IKKE gjort ved å gjøre ingressen større eller
 * legge til mer tekst. I stedet: (1) tittelen er nå tydelig større på
 * desktop (~60px) for å balansere det store bildet, (2) ingressen er
 * uendret/svært lett redusert – aldri strukket for å fylle høyde, (3)
 * markant mer luft mellom hvert nivå (kategori→tittel, tittel→ingress,
 * ingress→rating, rating→metadata) brukes AKTIVT som design i stedet for
 * mer innhold, (4) Rediger/Favoritt flyttet vekk fra tittel-linjen (som nå
 * står helt alene) ned til en diskret, mindre rad sammen med ratingen, (5)
 * metadata-raden (se RecipeMeta.tsx) er gjort tydelig mer tilstedeværende
 * – større verdier, fortsatt små labels, fyller nå hele kolonnens bredde
 * (lg:justify-between) med en linje over og mer vertikal luft, uten å bli
 * et eget "card". Selve bildet/heroens ytre dimensjoner er UENDRET fra
 * forrige runde.
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
        {/* lg:items-center (ikke -start) – finjustering etter tilbakemelding
            31.08.2026 ("plassen under metadata utnyttes ikke, ser du?"):
            tekstkolonnen er kortere enn det kvadratiske bildet, og med
            topp-justering samlet all overskytende høyde seg som ett stort,
            ubrukt tomrom nederst i venstrekolonnen – ikke som del av
            komposisjonen. Sentrert vertikalt mot bildet fordeler luften seg
            i stedet jevnt over/under, som i et ekte magasinoppslag – uten å
            strekke ingressen eller legge til nytt innhold. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-center lg:gap-16 xl:grid-cols-[520px_640px] xl:justify-center xl:gap-10">
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
            {/* ØVERSTE NIVÅ: kategori + stor tittel, alene. */}
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel && <Badge tone="clay">{categoryLabel}</Badge>}
              {tags.map((tag) => (
                <Badge key={tag.id} tone="neutral">
                  {tag.name}
                </Badge>
              ))}
              {isDraft && <Badge tone="mustard">{draftLabel}</Badge>}
            </div>

            {/* Tittelen står nå helt alene på egen linje – Rediger/
                Favoritt flyttet ned til raden med ratingen (se lenger
                ned), diskret i stedet for å konkurrere med tittelen.
                Tydelig større fra lg (~60px) for å gi tittelen mer
                visuell tyngde og balansere det store matbildet, samme
                rolige serif som før. */}
            <h1 className="mt-6 text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl lg:mt-8 lg:text-[3.75rem] lg:leading-[1.05]">
              {title}
            </h1>

            {/* MIDTRE NIVÅ: ingress, deretter rating + diskrete actions.
                Ingressen er bevisst IKKE gjort større – uendret bredde
                under xl, kun en svært lett reduksjon i skriftstørrelse
                fra lg (~17px) og bedre linjehøyde, fortsatt en komfortabel,
                bred lesebredde (aldri smal/høy). max-w-[500px] fra xl
                (se lenger ned) hindrer den i å strekke seg helt ut til
                kanten av den nye, bredere 520px-kolonnen. */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg lg:mt-8 lg:text-[1.0625rem] lg:leading-[1.7] xl:max-w-[500px]">
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

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 lg:mt-8">
              <div>{rating}</div>
              {/* Diskret – mindre/enklere stil enn tidligere (var på linje
                  med tittelen), sitter nå tett på ratingen i stedet. */}
              <div className="flex shrink-0 items-center gap-2">
                {isAdmin && (
                  <Link
                    href={editHref}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line-strong bg-paper px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-cream-dark"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    {editLabel}
                  </Link>
                )}
                {favorite}
              </div>
            </div>

            {/* NEDERSTE NIVÅ: bred metadata-rad, tydelig atskilt med mer
                luft over enn før (var mt-6/pt-6, nå mt-10/pt-6 – enda mer
                fra lg). Selve raden (RecipeMeta.tsx) fyller nå hele
                kolonnens bredde og har fått større, tydeligere verdier. */}
            <div className="mt-10 border-t border-line pt-6 lg:mt-14 lg:pt-8">{meta}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
