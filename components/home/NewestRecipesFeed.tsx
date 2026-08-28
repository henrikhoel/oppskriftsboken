import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { RecipeSummary } from "@/lib/types";
import { ChevronRightIcon, HeartIcon } from "@/components/ui/icons";
import {
  formatMinutes,
  localizedTitle,
  localizedDescription,
  localizedCategoryName,
} from "@/lib/utils/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Nyeste oppskrifter" – ART DIRECTED editorial spread, IKKE et grid av
 * gjentatte kort (heller ikke masonry). Andre redesignrunde 25.08.2026: den
 * forrige varianten (feature + to sekundære i faste kolonner, pluss en
 * jevn tre-kolonners rad under) fulgte fortsatt samme
 * bilde→metadata→tittel→beskrivelse-mønster på hvert element og føltes
 * derfor repetitiv. Denne varianten bygger i stedet komposisjonen som en
 * SEKVENS AV ULIKE "oppslag" (se BEAT_PLAN under) – ulik billedbeskjæring,
 * ulik plassering (forskjøvet venstre/høyre, bevisst tomrom ved siden av),
 * ulik mengde tekst – som en oppskriftsserie i et matmagasin, ikke fem
 * instanser av samme komponent.
 *
 * Bevisst en egen, selvstendig komponent (ikke en endring av
 * RecipeGrid/RecipeCard) fordi de deles med "Husets favoritter" og andre
 * sider – de skal IKKE påvirkes av dette.
 *
 * Bilder er fortsatt placeholders (gradient/ikon, se RecipeCard.tsx) –
 * layouten er bevisst dimensjonert og beskåret som om de allerede var ekte,
 * store matfotografier (ulike aspect ratio per "beat": cinematisk
 * landskap, portrait, medium landskap), IKKE tilpasset placeholder-uttrykket.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Delt bildeflate – ingen border/shadow/radius, kun selve bildet (eller
 * placeholder-teksten) og en diskret favoritt-markør. `aspect` varierer per
 * "beat" for å unngå at alle bilder får samme form. */
function EditorialImage({
  recipe,
  lang,
  aspect,
  sizes,
  priority = false,
}: {
  recipe: RecipeSummary;
  lang: Lang;
  aspect: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-cream-dark ${aspect}`}>
      {recipe.heroImageUrl ? (
        <Image
          src={recipe.heroImageUrl}
          alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-faint">
          <span className="font-serif text-sm">{t(lang, "recipeCard.imageComing")}</span>
        </div>
      )}
      {recipe.favoritedByAdmin && (
        <HeartIcon
          filled
          className="absolute right-3 top-3 h-4 w-4 text-ink opacity-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100"
        />
      )}
    </div>
  );
}

/** Liten, raffinert nummerering (01, 02 …) i eksisterende gull – samme
 * visuelle idé som nummereringen i "Bla etter kategori", bevisst for å
 * knytte de to seksjonene sammen. Aldri en badge/boks, kun tekst. */
function BeatNumber({ n }: { n: string }) {
  return (
    <span className="block font-serif text-[11px] tabular-nums tracking-[0.2em] text-clay-dark">{n}</span>
  );
}

/** KATEGORI · TID – diskret, kun to opplysninger. Vanskelighetsgrad og
 * beskrivelse vises bevisst ikke her (se toppkommentar/brukerens spec). */
function MetaLine({ recipe, lang, className = "" }: { recipe: RecipeSummary; lang: Lang; className?: string }) {
  const time = formatMinutes(recipe.totalTimeMinutes, lang);
  if (!recipe.category && time === "–") return null;
  return (
    <p className={`text-[10px] uppercase tracking-[0.15em] text-ink-faint ${className}`}>
      {recipe.category && <span className="text-clay">{localizedCategoryName(recipe.category, lang)}</span>}
      {recipe.category && time !== "–" && " · "}
      {time}
    </p>
  );
}

function ViewLink({ lang, className = "" }: { lang: Lang; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-clay transition-colors duration-300 group-hover:text-clay-dark ${className}`}
    >
      {t(lang, "home.editorial.viewRecipe")}
      <ChevronRightIcon className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
    </span>
  );
}

/** Hovedhistorien – stort, dramatisk bilde, størst typografisk vekt.
 * Beskrivelse vises kun når den finnes (aldri påtvunget). */
function FeatureBeat({ recipe, number, lang }: { recipe: RecipeSummary; number: string; lang: Lang }) {
  const description = localizedDescription(recipe, lang);
  return (
    <Link href={`/oppskrifter/${recipe.slug}`} className="group block">
      <EditorialImage
        recipe={recipe}
        lang={lang}
        aspect="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]"
        sizes="(min-width: 1024px) 90vw, 100vw"
        priority
      />
      <div className="mt-6 sm:mt-8 lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            <span className="text-clay-dark">{number}</span>
            <span className="mx-2 text-ink-faint">·</span>
            {recipe.category && (
              <span className="text-clay">{localizedCategoryName(recipe.category, lang)}</span>
            )}
            {recipe.category && " · "}
            {formatMinutes(recipe.totalTimeMinutes, lang)}
          </p>
          <h3 className="mt-3 text-balance font-serif text-3xl leading-[1.05] text-ink sm:text-4xl lg:text-5xl">
            {localizedTitle(recipe, lang)}
          </h3>
          {description && (
            <p className="mt-4 max-w-lg text-sm text-ink-soft sm:text-base">{description}</p>
          )}
        </div>
        <ViewLink lang={lang} className="mt-5 lg:mt-0" />
      </div>
    </Link>
  );
}

/** Forskjøvet komposisjon – bilde + tekst begrenset til en andel av
 * radbredden og dyttet mot venstre eller høyre kant, slik at resten av
 * raden bevisst står tom (mørk negativ plass). Tekst er høyrestilt når
 * bildet er dyttet til høyre, for å holde alt visuelt samlet mot samme
 * kant. */
function OffsetBeat({
  recipe,
  number,
  lang,
  align,
  aspect,
  widthClass,
  gutterClass,
}: {
  recipe: RecipeSummary;
  number: string;
  lang: Lang;
  align: "left" | "right";
  aspect: string;
  widthClass: string;
  gutterClass: string;
}) {
  const isRight = align === "right";
  const description = localizedDescription(recipe, lang);
  return (
    // "relative" wrapper i FULL bredde – bildet/lenken inni er begrenset til
    // widthClass, slik at det alltid blir et tomrom på motsatt side.
    // gutterClass = komplementet til widthClass, så "ghost"-tallet får en
    // boks som faktisk tilsvarer tomrommet og kan fylle det, i stedet for å
    // flyte fritt. En tynn gyllen linje markerer kanten mot bildet – ren
    // typografisk tekstur/oppmerking, ikke informasjon (aria-hidden), kun fra lg.
    <div className="relative">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 items-center justify-center lg:flex ${gutterClass} ${
          isRight ? "left-0 border-r border-clay/20" : "right-0 border-l border-clay/20"
        }`}
      >
        <span className="select-none whitespace-nowrap font-serif text-[clamp(8rem,18vw,26rem)] leading-none text-clay opacity-[0.16]">
          {number}
        </span>
      </div>
      <Link
        href={`/oppskrifter/${recipe.slug}`}
        className={`group relative block w-full ${widthClass} ${isRight ? "ml-auto" : "mr-auto"}`}
      >
        <EditorialImage
          recipe={recipe}
          lang={lang}
          aspect={aspect}
          sizes="(min-width: 1024px) 55vw, 100vw"
        />
        <div className={`mt-4 text-left sm:mt-5 ${isRight ? "lg:text-right" : ""}`}>
          <BeatNumber n={number} />
          <h3 className="mt-1.5 font-serif text-xl leading-snug text-ink transition-colors duration-300 group-hover:text-clay-dark sm:text-2xl">
            {localizedTitle(recipe, lang)}
          </h3>
          <MetaLine recipe={recipe} lang={lang} className="mt-1" />
          {/* Kun mobil: der er alt uansett stablet rett under hverandre (ingen
              forskjøvet/parvis komposisjon å skille dem på), så da får alle en
              beskrivelse i stedet for bare hovedoppslaget. */}
          {description && <p className="mt-2 text-sm text-ink-soft sm:hidden">{description}</p>}
        </div>
      </Link>
    </div>
  );
}

/** To oppskrifter i samme rad, ulik bredde og ulik billedform (portrait mot
 * landskap) – IKKE et jevnt to-kolonners grid. `reverse` speiler hvilken
 * side som får mest plass, slik at ikke alle par-oppslag ser like ut.
 *
 * Den brede col-span-7-kolonnen har landskapsbilde (4/3 el. 16/10) og blir
 * derfor alltid lavere enn den smale col-span-5-kolonnen med portrettbilde
 * (3/4) – det gir et bevisst tomrom under bildeteksten i den brede
 * kolonnen. `filler` (kun brukt av siste "beat", se NewestRecipesFeed) fyller
 * akkurat det tomrommet i stedet for å stå som et eget element under raden. */
function PairedBeat({
  a,
  b,
  numberA,
  numberB,
  lang,
  reverse,
  filler,
}: {
  a: RecipeSummary;
  b: RecipeSummary;
  numberA: string;
  numberB: string;
  lang: Lang;
  reverse: boolean;
  filler?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-12 sm:gap-8 lg:gap-12">
      <div className={`flex flex-col ${reverse ? "sm:col-span-5" : "sm:col-span-7"}`}>
        <PairedItem
          recipe={a}
          number={numberA}
          lang={lang}
          aspect={reverse ? "aspect-[3/4]" : "aspect-[4/3] sm:aspect-[16/10]"}
        />
        {!reverse && filler && <div className="hidden flex-1 sm:flex sm:items-end sm:pt-8">{filler}</div>}
      </div>
      <div className={`flex flex-col ${reverse ? "sm:col-span-7" : "sm:col-span-5"}`}>
        <PairedItem
          recipe={b}
          number={numberB}
          lang={lang}
          aspect={reverse ? "aspect-[4/3] sm:aspect-[16/10]" : "aspect-[3/4]"}
        />
        {reverse && filler && <div className="hidden flex-1 sm:flex sm:items-end sm:pt-8">{filler}</div>}
      </div>
    </div>
  );
}

function PairedItem({
  recipe,
  number,
  lang,
  aspect,
}: {
  recipe: RecipeSummary;
  number: string;
  lang: Lang;
  aspect: string;
}) {
  const description = localizedDescription(recipe, lang);
  return (
    <Link href={`/oppskrifter/${recipe.slug}`} className="group block">
      <EditorialImage
        recipe={recipe}
        lang={lang}
        aspect={aspect}
        sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="mt-4">
        <BeatNumber n={number} />
        <h3 className="mt-1.5 font-serif text-lg leading-snug text-ink transition-colors duration-300 group-hover:text-clay-dark sm:text-xl">
          {localizedTitle(recipe, lang)}
        </h3>
        <MetaLine recipe={recipe} lang={lang} className="mt-1" />
        {/* Kun mobil, samme resonnement som OffsetBeat over. */}
        {description && <p className="mt-2 text-sm text-ink-soft sm:hidden">{description}</p>}
      </div>
    </Link>
  );
}

type Beat =
  | { kind: "feature"; recipe: RecipeSummary; number: string }
  | {
      kind: "offset";
      recipe: RecipeSummary;
      number: string;
      align: "left" | "right";
      aspect: string;
      widthClass: string;
      gutterClass: string;
    }
  | { kind: "paired"; a: RecipeSummary; b: RecipeSummary; numberA: string; numberB: string; reverse: boolean };

// gutterClass = komplementet til widthClass (100% - bildebredden), slik at
// "ghost"-tallets boks faktisk tilsvarer det tomme området ved siden av
// bildet, per forskyvningsvariant.
const OFFSET_VARIANTS: { align: "left" | "right"; aspect: string; widthClass: string; gutterClass: string }[] = [
  { align: "left", aspect: "aspect-[4/3] sm:aspect-[16/10]", widthClass: "lg:w-[64%] xl:w-[58%]", gutterClass: "lg:w-[36%] xl:w-[42%]" },
  { align: "right", aspect: "aspect-[3/4]", widthClass: "lg:w-[46%] xl:w-[40%]", gutterClass: "lg:w-[54%] xl:w-[60%]" },
  { align: "left", aspect: "aspect-[3/4]", widthClass: "lg:w-[42%] xl:w-[38%]", gutterClass: "lg:w-[58%] xl:w-[62%]" },
  { align: "right", aspect: "aspect-[4/3] sm:aspect-[16/10]", widthClass: "lg:w-[64%] xl:w-[58%]", gutterClass: "lg:w-[36%] xl:w-[42%]" },
];

/** Bygger en bevisst, deterministisk rytme av "beats" fra den flate
 * oppskriftslisten – IKKE tilfeldig (se brukerens krav om "art directed,
 * ikke tilfeldig"). Faste beat-typer (feature → forskjøvet → par →
 * forskjøvet → par …) gir variasjon uten at koden må hardkode nøyaktig 8
 * oppskrifter; færre oppskrifter gir bare en kortere, fortsatt sammenhengende
 * sekvens, og flere enn planen dekker faller tilbake til vekslende
 * forskjøvede oppslag. */
function buildBeats(recipes: RecipeSummary[]): Beat[] {
  if (recipes.length === 0) return [];

  const beats: Beat[] = [];
  let i = 1; // 1-basert nummerering, matcher "Bla etter kategori".
  let offsetIndex = 0;
  let pairToggle = false;

  const [first, ...rest] = recipes;
  beats.push({ kind: "feature", recipe: first, number: pad(i++) });

  let index = 0;
  // Fast rytme: forskjøvet, forskjøvet, par, forskjøvet, par … – gjentas om
  // flere enn ~7 oppskrifter skulle bli sendt inn her en gang i fremtiden.
  const takeOffset = () => {
    const recipe = rest[index++];
    const variant = OFFSET_VARIANTS[offsetIndex % OFFSET_VARIANTS.length];
    offsetIndex++;
    beats.push({ kind: "offset", recipe, number: pad(i++), ...variant });
  };
  const takePaired = () => {
    if (index + 1 >= rest.length) {
      takeOffset();
      return;
    }
    const a = rest[index++];
    const b = rest[index++];
    beats.push({ kind: "paired", a, b, numberA: pad(i++), numberB: pad(i++), reverse: pairToggle });
    pairToggle = !pairToggle;
  };

  let step = 0;
  while (index < rest.length) {
    const beatKind = step % 4;
    if (beatKind === 2) takePaired();
    else takeOffset();
    step++;
  }

  return beats;
}

function BeatBlock({ beat, lang, filler }: { beat: Beat; lang: Lang; filler?: ReactNode }) {
  if (beat.kind === "feature") {
    return <FeatureBeat recipe={beat.recipe} number={beat.number} lang={lang} />;
  }
  if (beat.kind === "offset") {
    return (
      <OffsetBeat
        recipe={beat.recipe}
        number={beat.number}
        lang={lang}
        align={beat.align}
        aspect={beat.aspect}
        widthClass={beat.widthClass}
        gutterClass={beat.gutterClass}
      />
    );
  }
  return (
    <PairedBeat
      a={beat.a}
      b={beat.b}
      numberA={beat.numberA}
      numberB={beat.numberB}
      lang={lang}
      reverse={beat.reverse}
      filler={filler}
    />
  );
}

/** Avsluttende sitat – fyller det tomrommet som oppstår under den korteste
 * kolonnen i siste par-oppslag (se `filler` på PairedBeat), i stedet for et
 * rent bakgrunnsbilde (vurdert og forkastet, se samtale). Et ekte, kreditert
 * sitat. Sitatet/attribusjonen er bevisst alltid på fransk (matcher
 * "À TABLE"-navnet); kun den lille oversettelseslinjen bytter språk med
 * resten av siden. */
function ClosingQuote({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-sm">
      <p className="text-balance font-serif text-lg italic leading-snug text-ink sm:text-2xl">
        «Dis-moi ce que tu manges, je te dirai ce que tu es.»
      </p>
      <p className="mt-3 text-sm tracking-wide text-clay-dark">Jean Anthelme Brillat-Savarin, 1825</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        {t(lang, "home.editorial.closingQuoteTranslation")}
      </p>
    </div>
  );
}

export function NewestRecipesFeed({ recipes, lang }: { recipes: RecipeSummary[]; lang: Lang }) {
  if (recipes.length === 0) return null;
  const beats = buildBeats(recipes);

  // Sitatet skal bo i tomrommet som naturlig oppstår under den korteste
  // kolonnen i siste par-oppslag (se PairedBeat/ClosingQuote) – IKKE som et
  // eget element etter hele seksjonen. Det forutsetter at siste "beat"
  // faktisk er et par; er den ikke det (avhenger av antall oppskrifter),
  // faller vi tilbake til å vise sitatet under hele seksjonen som før.
  const lastBeat = beats[beats.length - 1];
  const lastBeatIsPaired = lastBeat?.kind === "paired";
  const quote = <ClosingQuote lang={lang} />;

  return (
    <>
      {/* Behold "Nyeste oppskrifter" + "Se alle →" (uendret innhold/lenke),
          men med mer luft under – seksjonen under er nå bevisst luftig, og
          overskriften skal ikke føles trang mot det som følger. */}
      <div className="mb-10 flex items-end justify-between gap-4 sm:mb-14 lg:mb-16">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl lg:text-4xl">
          {t(lang, "home.newestRecipes")}
        </h2>
        <Link
          href="/oppskrifter"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-clay transition-colors hover:text-clay-dark"
        >
          {t(lang, "home.seeAll")}
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* Generøs vertikal rytme mellom hvert "oppslag" – tomrommet ER
          designet, ikke fravær av det. */}
      <div className="space-y-20 sm:space-y-28 lg:space-y-36">
        {beats.map((beat, i) => (
          <BeatBlock
            key={beat.kind === "paired" ? `${beat.a.id}-${beat.b.id}` : beat.recipe.id}
            beat={beat}
            lang={lang}
            filler={lastBeatIsPaired && i === beats.length - 1 ? quote : undefined}
          />
        ))}
      </div>

      {/* Fallback: hvis siste "beat" ikke er et par-oppslag, er det ikke noe
          tomrom å plassere sitatet inni – da vises det under hele seksjonen,
          på alle skjermbredder. */}
      {!lastBeatIsPaired && <div className="mt-20 sm:mt-28 lg:mt-36">{quote}</div>}

      {/* På mobil er par-raden alltid full bredde/stablet (ingen sm:grid-cols-12
          ennå), så det finnes ikke noe tomrom å legge sitatet inni der – filleren
          over er bevisst skjult under sm. Vis det da i stedet helt nederst. */}
      {lastBeatIsPaired && <div className="mt-56 sm:hidden">{quote}</div>}
    </>
  );
}
