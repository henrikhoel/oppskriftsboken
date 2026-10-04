import type { Metadata } from "next";
import Image from "next/image";
import { PantryMatchView } from "@/components/pantry/PantryMatchView";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "pantryPage.title"),
    description: t(lang, "pantryPage.metaDescription"),
  };
}

/**
 * "Hva kan jeg lage?" – Smart Pantry Search OG "Bruk restene" fra
 * spesifikasjonen, BEVISST slått sammen til én side/motor i stedet for to
 * separate funksjoner. Begge er i bunn og grunn samme spørsmål ("her er
 * noen ingredienser jeg har – hva kan jeg lage?"), bare med ulik "mengde"
 * ingrediens som utgangspunkt (et helt kjøleskap via bilde, kontra noen få
 * rester man skriver inn) – å bygge dem som to parallelle, nesten
 * identiske sider ville vært akkurat den typen ti-frittstående-AI-
 * funksjoner-som-ikke-vet-om-hverandre kravspesifikasjonen ba om å unngå.
 * Se components/pantry/PantryMatchView.tsx og
 * lib/kitchen-intelligence/pantry-match.ts for selve gjennomføringen.
 */
export default async function PantryPage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUserFast()]);

  return (
    <div className="relative isolate bg-black">
      {/* (04.10.2026) Stemningsbilde av et åpent kjøleskap – Henrik sendte
          eget foto og ba om at det skulle brukes her, og presiserte
          etterpå at han mente SAMME teknikk som /ukesmeny (se
          WeeklyMenuPage sin filheader for hele bakgrunnen/historikken der):
          et fast-høyt bakgrunnsbilde øverst i selve DOKUMENTET (ikke
          `fixed`/viewport-pinnet – ruller normalt ut av syne), med
          introteksten liggende direkte oppå i en smal kolonne, i stedet
          for et avgrenset "kort" under tittelen slik første forsøk gjorde
          det. Bildets komposisjon (mørkt/tomt ca. 2/3 til venstre, det
          opplyste kjøleskapet til høyre) gjør at object-cover uten egen
          object-position allerede viser begge deler fint i et bredt,
          kort utsnitt – ingen av de problemene weekly-menu.jpg trengte
          en justert object-position for.

          `bg-black` på selve ytre wrapperen (04.10.2026, Henrik:
          "bakgrunnen bak rettene må være helt svart") – resten av siden
          arver ellers --color-cream fra <body> (#0b0b0a, "nesten sort",
          se WeeklyMenuPage sin filheader), som er en anelse lysere/varmere
          enn ekte sort. Oppskriftsresultatene («DETTE KAN DU LAGE») skal
          lese som et rent, sort bakteppe bak oppskriftskortene, derfor
          ekte #000 (bg-black) spesifikt på denne siden i stedet for den
          vanlige site-wide cream-tonen.

          `isolate` er IKKE valgfritt her (04.10.2026, feil oppdaget av
          Henrik: "du fjerna jo bildet") – uten den danner ikke denne
          `relative`-diven sin egen stacking-context, og da males
          `bg-black` sin egen boks-bakgrunn OPPÅ bildet (som ligger på
          `-z-10` LENGER NEDE i treet) i stedet for bak det: et negativt
          z-index uten en stackingcontext-dannende forelder "ryker" helt
          opp til nærmeste ekte stacking-context (her: dokumentrota), og
          havner dermed bak ALT vanlig, ikke-posisjonert innhold på hele
          siden – inkludert denne divens egen bakgrunnsfarge. `isolate`
          tvinger frem en ny stacking-context nøyaktig her, slik at
          rekkefølgen blir riktig: bakgrunn (svart) → bildet (-z-10,
          males OPPÅ bakgrunnen) → vanlig innhold (z-10, males øverst). */}
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden sm:h-[620px] lg:h-[760px]"
        aria-hidden="true"
      >
        <Image
          src="/images/pantry-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* (04.10.2026, justert – Henrik: "det må være en gradient nederst
            på bildet også nå man får opp retter") Nedtoning mot bunnen,
            samme prinsipp som /ukesmeny, men strukket til å bli HELT sort
            godt før boksens egen bunnkant (65 % i stedet for 100 %): med
            input/chips/CTA/admin-raden over gir ikke alle skjermbredder
            nok innhold til at man rekker å scrolle forbi hele den faste
            bildehøyden før resultatgridet dukker opp – uten denne
            marginen var bildet fortsatt synlig/lyst helt ned mot rettene.
            Mot #000 (ikke lenger var(--color-cream)) for å matche den nye
            bg-black-bakgrunnen over, så det ikke oppstår en synlig skjøt
            mellom gradienten og bakgrunnen under. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 10%, rgba(0,0,0,0.55) 40%, #000 65%, #000 100%)",
          }}
        />
        {/* (04.10.2026) Lang, mørk nedtoning fra venstre – Henrik: "du kan
            gjerne legge på en ganske lang svart gradient fra venstre".
            Samme prinsipp som den horisontale nedtoningen i forsidens
            desktop-hero (se app/page.tsx), men strukket mye lenger ut mot
            høyre: teksten ligger i den mørke venstre kolonnen og trenger
            god kontrast, og en lang/gradvis overgang (i stedet for en brå
            kant) lar den mørke sonen gli naturlig over i kjøleskapets eget
            mørke før den lysere, opplyste delen av bildet lengst til
            høyre. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 35%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0) 85%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {/* (04.10.2026, redesign – Henrik: "gjør siden betydelig renere og
            mer i tråd med det nye CONVITE-uttrykket") Ytre container
            uendret bredde (max-w-5xl) – resultatgridet i
            PantryMatchView.tsx trenger den fulle bredden for å få plass
            til opptil 4 kolonner. Intro/undertittel/inputområdet
            begrenses i stedet til en smalere, editorial lesebredde
            INNENFRA (max-w-xl her, max-w-2xl i PantryMatchView.tsx – se
            filheaderen der), slik at siden fortsatt føles som ett rolig,
            smalt løp (intro → input → chips → CTA) selv om selve siden
            har plass til et bredt resultatgrid under. */}
        <div className="max-w-xl">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "pantryPage.title")}</h1>
          {/* Tydelig editorial undertittel, egen linje – ikke en del av
              H1, ikke en del av ingressen under. */}
          <p className="mt-3 text-balance font-serif text-xl text-ink sm:text-2xl">
            {t(lang, "pantryPage.subtitle")}
          </p>
          <p className="mt-3 text-ink-soft">{t(lang, "pantryPage.intro")}</p>
        </div>
        {/* (27.09.2026) "I kjøleskapet" er kontoeksklusiv – se
            favoritter/page.tsx for samme resonnement. */}
        <div className="mt-10">
          {user ? (
            <PantryMatchView lang={lang} isAdmin={Boolean(user?.isAdmin)} />
          ) : (
            <LockedPanel
              message={t(lang, "featureLocked.pantryMessage")}
              ctaLabel={t(lang, "featureLocked.cta")}
              nextPath="/hva-kan-jeg-lage"
            />
          )}
        </div>
      </div>
    </div>
  );
}
