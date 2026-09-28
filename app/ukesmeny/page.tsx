import type { Metadata } from "next";
import Image from "next/image";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { WeeklyMenuView } from "@/components/meal/WeeklyMenuView";
import { LockedPanel } from "@/components/ui/LockedPanel";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "weeklyMenu.title") };
}

/**
 * AUTOMATISK UKESMENY – EDITORIELT REDESIGN (30.09.2026, se filheaderen i
 * WeeklyMenuView.tsx for hele bakgrunnen). Henrik: "Redesign /ukesmeny
 * slik at siden føles langt mer som CONVITE: premium, editorial, rolig og
 * stilren [...] Ikke endre headeren." – kun selve sidens EGET innhold er
 * endret, hovednavigasjonen (Header.tsx) er urørt.
 *
 * Introteksten (tittel/tagline/kort avsnitt) ligger bevisst her på
 * side-nivå, IKKE inne i WeeklyMenuView – den vises for ALLE besøkende
 * (også ikke-innloggede, som ser LockedPanel under), som en liten
 * smakebit/markedsføring av funksjonen, samme prinsipp som at
 * RecipeTeaser viser bilde/tittel/beskrivelse for gjester før selve
 * innholdet låses.
 *
 * Smal tekstkolonne (max-w-xl) for selve introen, men en bredere
 * ytre ramme (max-w-5xl) for selve ukesmeny-spredningen under – bevisst
 * editorial-magasin-teknikk (smal tekst, bred visuell del), fremfor å la
 * hele siden dele samme smale bredde.
 *
 * BAKGRUNNSBILDE (30.09.2026, Henrik: "det er viktig at hele bildet alltid
 * er der, sånn at når man genererer en meny, og siden blir større, så
 * ligger fortsatt bildet naturlig i bakgrunnen") – `public/images/weekly-menu.jpg`
 * (råvarer i mørkt, redaksjonelt lys, mest sort/negativ plass med
 * komposisjonen samlet øverst til høyre).
 *
 * FØRSTE FORSØK brukte `fixed inset-0` (pinnet til viewportet, fulgte
 * med under scroll) – Henrik, med skjermbilde av et visuelt glitch øverst
 * til høyre: "det ble litt buggy [...] jeg vil ikke at det skal ligge
 * fast når man scroller, toppen må bli igjen hvis du skjønner?". Byttet
 * derfor til `absolute` med en FAST høyde, forankret til toppen av denne
 * sidens EGEN `relative`-wrapper (ikke viewportet) – bildet sitter dermed
 * fysisk øverst i selve DOKUMENTET, akkurat som et vanlig
 * bakgrunnsbilde, og ruller normalt ut av syne når man scroller forbi
 * det, i stedet for å henge igjen. Den faste høyden (ikke `inset-0`
 * strukket til hele wrapperen) er selve løsningen på det opprinnelige
 * "ligger naturlig i bakgrunnen selv når siden blir større"-kravet: når
 * fem retter genereres og siden blir lengre, vokser IKKE bildet med (det
 * har jo en fast høyde) – det blir bare liggende akkurat der det alltid
 * har vært, øverst, mens resten av siden (dagene) fortsetter nedover
 * under det. Ingen mørkt overlegg lagt oppå (til forskjell fra f.eks.
 * MoodModeSection.tsx sitt forsidebilde) – bildet er allerede nesten
 * helt sort i seg selv (samme tone som --color-cream), og introteksten
 * står i venstre kolonne et godt stykke unna råvare-komposisjonen øverst
 * til høyre, så lesbarheten er uansett god uten et ekstra lag.
 */
export default async function WeeklyMenuPage() {
  const [allRecipes, lang, user] = await Promise.all([
    getSearchableRecipes(),
    getLang(),
    getCurrentUserFast(),
  ]);
  const eligible = allRecipes.filter((r) => !r.weeklyMenuExcluded);

  return (
    <div className="relative">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden sm:h-[620px] lg:h-[760px]"
        aria-hidden="true"
      >
        <Image
          src="/images/weekly-menu.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "right top" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-xl">
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{t(lang, "weeklyMenu.title")}</h1>
          <p className="mt-3 font-serif text-lg text-clay-dark sm:text-xl">{t(lang, "weeklyMenu.tagline")}</p>
          <p className="mt-4 text-ink-soft">{t(lang, "weeklyMenu.description")}</p>
        </div>

        <div className="mt-12">
          {user ? (
            <WeeklyMenuView recipes={eligible} lang={lang} />
          ) : (
            <LockedPanel
              message={t(lang, "featureLocked.weeklyMenuMessage")}
              ctaLabel={t(lang, "featureLocked.cta")}
              nextPath="/ukesmeny"
            />
          )}
        </div>
      </div>
    </div>
  );
}
