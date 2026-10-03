import type { Metadata } from "next";
import Image from "next/image";
import { getWeekendGuestsRecipes } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { WeekendGuestsClient } from "@/components/weekend/WeekendGuestsClient";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "weekendGuests.title"), description: t(lang, "weekendGuests.description") };
}

/**
 * "HELG & GJESTER" (03.10.2026) – ny, kuratert inspirasjonsside, lagt inn i
 * hovednavigasjonen mellom Ukesmeny og I kjøleskapet (se Header.tsx).
 * Henrik sin spesifikasjon var eksplisitt på at dette IKKE er en ny
 * Ukesmeny-variant: "Dette skal IKKE fungere som Ukesmeny. Det skal ikke
 * genereres noe. Brukeren skal lande direkte i et kuratert utvalg av
 * retter og kunne filtrere dem etter anledning." Siden er derfor en helt
 * vanlig, offentlig server-rendret side (ingen LockedPanel/innloggings-
 * gate som /ukesmeny) – hele poenget er at ALLE besøkende skal kunne bla
 * rett inn i det kuraterte utvalget uten noen ekstra handling først.
 *
 * HERO (grunnere enn Ukesmeny, se Henriks spesifikasjon: "Heroen skal
 * være grunnere enn heroen på Ukesmeny, fordi oppskriftene under skal
 * komme relativt raskt til syne") – gjenbruker nøyaktig samme teknikk som
 * app/ukesmeny/page.tsx (fast høyde, `absolute`-forankret til toppen av
 * SIDENS egen wrapper, ikke viewportet, med en nedtoning mot
 * --color-cream nederst), kun med lavere høydetall og public/images/
 * weekend-table.jpg (Henrik sendte dette bildet 03.10.2026 som erstatning
 * for det opprinnelige valget evening-table.jpg – samme stemning med
 * stearinlys og vinglass i mørket, men mer diagonal komposisjon). To
 * overlegg oppå bildet: (1) en mørk gradient FRA VENSTRE
 * (`to right, svart → transparent`), eksplisitt bedt om av Henrik for å gi
 * god lesbarhet på tittel/tagline/beskrivelse som ligger i venstre del av
 * heroen, og (2) nedtonings-gradienten nederst mot --color-cream (samme
 * teknikk som app/ukesmeny/page.tsx) for en myk overgang til sidens
 * vanlige bakgrunn.
 *
 * Filterraden (Alle/Fredagskveld/Date night/Venner på middag/Familie/
 * Feiring), "Utvalgt"-seksjonen og rutenettet under er ALLE samlet i én
 * klientkomponent (WeekendGuestsClient.tsx) – selve filtreringen er et
 * rent, synkront in-memory-filter (ingen ny server-tur per klikk, se
 * komponentens egen filheader), så hele det kuraterte settet hentes ÉN
 * gang her på serveren.
 */
export default async function WeekendGuestsPage() {
  const [recipes, lang] = await Promise.all([getWeekendGuestsRecipes(), getLang()]);

  return (
    <div className="relative">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[360px] overflow-hidden sm:h-[440px] lg:h-[520px]"
        aria-hidden="true"
      >
        <Image src="/images/weekend-table.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 45%, transparent 75%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 35%, var(--color-cream) 100%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-xl">
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{t(lang, "weekendGuests.title")}</h1>
          <p className="mt-3 font-serif text-lg text-clay-dark sm:text-xl">{t(lang, "weekendGuests.tagline")}</p>
          <p className="mt-4 text-ink-soft">{t(lang, "weekendGuests.description")}</p>
        </div>

        <div className="mt-10">
          <WeekendGuestsClient recipes={recipes} lang={lang} />
        </div>
      </div>
    </div>
  );
}
