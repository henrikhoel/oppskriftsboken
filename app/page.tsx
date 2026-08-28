import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t, type Lang } from "@/lib/i18n";
import {
  getFeaturedRecipes,
  getNewestRecipes,
  getAdminFavoriteRecipes,
} from "@/lib/data/recipes";
import { getAllCategories, getCategoryRecipeCounts } from "@/lib/data/categories";
import type { RecipeSummary } from "@/lib/types";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "@/components/ui/icons";
import { FeaturedEditorial } from "@/components/home/FeaturedEditorial";
import { WinePairing } from "@/components/home/WinePairing";
import { CookModeShowcase } from "@/components/home/CookModeShowcase";
import { AtmosphereSection } from "@/components/home/AtmosphereSection";
import { MoodModeSection } from "@/components/home/MoodModeSection";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { NewestRecipesFeed } from "@/components/home/NewestRecipesFeed";
import { WhatToEatTeaser } from "@/components/home/WhatToEatTeaser";
import { SeasonTeaser } from "@/components/home/SeasonTeaser";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { description: lang === "en" ? siteConfig.descriptionEn : siteConfig.description };
}

/** Plukker ut inntil 3 oppskrifter til den redaksjonelle "utvalgte"-
 * seksjonen (FeaturedEditorial) – vises under overskriften "Husets
 * favoritter" (tidligere "Ukens utvalg", omdøpt 26.08.2026 når det
 * separate hjerte-baserte "Husets favoritter"-gridet lenger ned på siden
 * ble fjernet). Prioriterer featured (admin-satt rekkefølge fra
 * /admin/utvalg, se getFeaturedRecipes) > hjerte-favoritter
 * (favoritedByAdmin) > nyeste – featured er den EKSPLISITTE, tiltenkte
 * kilden; hjerte-favoritter/nyeste er kun FYLL når for få oppskrifter er
 * lagt i utvalget. Ingen hardkoding av en bestemt oppskrift. Returnerer
 * også hvilke id-er som ble brukt, slik at de samme oppskriftene ikke også
 * dukker opp dobbelt i "nyeste"-gridet lenger ned. */
function pickEditorial(
  favorites: RecipeSummary[],
  featured: RecipeSummary[],
  newest: RecipeSummary[],
): { picks: RecipeSummary[]; usedIds: Set<string> } {
  const usedIds = new Set<string>();
  const picks: RecipeSummary[] = [];
  for (const recipe of [...featured, ...favorites, ...newest]) {
    if (usedIds.has(recipe.id)) continue;
    usedIds.add(recipe.id);
    picks.push(recipe);
    if (picks.length === 3) break;
  }
  return { picks, usedIds };
}

export default async function HomePage() {
  const [featured, newest, favorites, categories, categoryCounts, lang] = await Promise.all([
    getFeaturedRecipes(6),
    getNewestRecipes(10),
    getAdminFavoriteRecipes(),
    getAllCategories(),
    getCategoryRecipeCounts(),
    getLang(),
  ]);

  const { picks: editorialPicks, usedIds } = pickEditorial(favorites, featured, newest);
  const [editorialMain, ...editorialOthers] = editorialPicks;
  // Nøyaktig 5 her, ALDRI flere – "Nyeste oppskrifter" under (se
  // NewestRecipesFeed.tsx sin buildBeats-funksjon) er en bevisst, fast
  // "beat"-rytme (hovedoppslag + 4 andre) tunet for akkurat 5 oppskrifter:
  // den ender da alltid på et par-oppslag, som er der det avsluttende
  // sitatet får plass i det naturlige tomrommet. Ett ekstra element her
  // (fikk 6, se tilbakemelding 25.08.2026) forskyver rytmen slik at den ikke
  // lenger ender på et par – sitatet detter da ut av gutteren og vises som
  // en løsrevet blokk under hele seksjonen i stedet, og hele oppsettet ser
  // brutt ut.
  const newestForGrid = newest.filter((r) => !usedIds.has(r.id)).slice(0, 5);

  return (
    <div>
      {/* ================= HERO ================= */}
      {/* Heroens høyde = 100svh MINUS den faktisk MÅLTE høyden på headeren
          og (på mobil) den faste bunnmenyen – se ChromeHeightVars.tsx, som
          setter --header-h/--bottom-nav-h på <html> ut fra ekte DOM-
          målinger (oppdateres ved resize/rotasjon). Dette gir en presis
          "header + hero + evt. bunnmeny = akkurat én skjerm"-oppførsel,
          uansett iPhone-modell/safe-area:
            - For lav ville gitt et gjenværende "hull" der neste seksjon
              ("Husets favoritter") titter opp bak/over bunnmenyen.
            - For høy ville dyttet "bla nedover"-pilen (som sitter nær
              heroens bunn) ned under bunnmenyen eller helt utenfor synlig
              skjerm – begge deler faktisk observert med faste
              prosent-/vh-baserte forsøk før dette (94/100 dvh/svh), som
              varierer for mye enhet til enhet til å treffe presist.
          Fallback-verdiene i var(...) (før JS har rukket å måle, eller hvis
          JS skulle feile) tilsvarer en vanlig header uten bunnmeny, altså
          samme oppførsel som tidligere.
          svh (small viewport height), IKKE dvh: dvh endrer seg LIVE mens
          man scroller på iPhone (Safaris adressefelt kollapser/ekspanderer
          under selve scrollingen), noe som tvang nettleseren til å
          re-layoute heroen på hver scroll-frame – det ga den "hakkete,
          bildet zoomer litt inn"-følelsen som ble rapportert. svh er den
          minste, STABILE høyden – heroen endrer aldri størrelse mens man
          scroller. */}
      <section
        className="relative isolate flex items-center overflow-hidden border-b border-line bg-cream"
        style={{
          minHeight:
            "calc(100svh - var(--app-banner-h, 2.375rem) - var(--header-h, 4.0625rem) - var(--bottom-nav-h, 0px))",
        }}
      >
        {/* Stemningsbilde bak À TABLE-ordmerket. Rent dekorativt (alt=""). Ekte
            foto (ikke AI-generert) – se public/images/hero.jpg. */}
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Ren svart nedtoning (ikke det varme cream-tonen) – bedt om
            eksplisitt for å unngå et brunt skjær over bildet. Siste
            fargestopp går likevel helt til bunnen i praksis samme mørke
            som bg-cream, så overgangen til resten av siden blir sømløs. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/78 to-black" />
        <div className="relative w-full mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          {/* Sentrert på mobil/nettbrett (der det mørke partiet i bildet
              ikke nødvendigvis havner til venstre etter beskjæring), men
              venstrestilt fra lg og opp – der har bildet en tydelig mørk
              venstreside som teksten kan stå fritt over, i stedet for å
              ligge midt oppå pastaen. */}
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            {/* "À TABLE" er selve blikkfanget – gjort mye større. Under
                står kun én kort linje ("home.subtitleRest", nå "Det beste
                skjer rundt bordet."), rett over søkefeltet – i samme
                kursive serif/gull-stil som "Din digitale kokebok" hadde
                her før, bare i mindre størrelse. "Din digitale kokebok"
                (home.eyebrow) er tatt bort herfra, men lever videre i
                footeren og sidetittelen. */}
            <h1 className="text-balance font-serif text-6xl leading-[1.03] tracking-tight text-ink sm:text-7xl md:text-8xl">
              {siteConfig.name}
            </h1>
            <p className="mx-auto mt-1.5 max-w-lg font-serif text-sm italic text-clay-dark sm:text-base lg:mx-0">
              {t(lang, "home.subtitleRest")}
            </p>
            <div className="mx-auto mt-5 max-w-md lg:mx-0">
              <Suspense fallback={<div className="h-11 rounded-full bg-cream-dark" />}>
                <SearchBar size="md" autoFocus={false} lang={lang} />
              </Suspense>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <Button href="/oppskrifter" variant="primary" size="sm">
                {t(lang, "home.browseAll")}
              </Button>
              <Button href="/favoritter" variant="outline" size="sm">
                {t(lang, "home.seeFavorites")}
              </Button>
            </div>
          </div>
        </div>

        {/* Liten "bla nedover"-pil nederst i heroen – ren CSS-hint om at det
            er mer innhold under (siden heroen nå fyller hele skjermhøyden).
            Lenker til #etter-hero med vanlig anker + scroll-behavior: smooth
            (satt globalt i globals.css), ingen JS nødvendig. Bounce-
            animasjonen er Tailwinds innebygde animate-bounce, skrudd av for
            de som har prefers-reduced-motion (motion-reduce:animate-none). */}
        <a
          href="#etter-hero"
          aria-label={t(lang, "home.scrollDown")}
          className="absolute inset-x-0 bottom-6 z-10 mx-auto flex w-fit animate-bounce items-center justify-center rounded-full p-2 text-ink/60 transition-colors hover:text-ink motion-reduce:animate-none sm:bottom-9"
        >
          <ChevronDownIcon className="h-6 w-6" />
        </a>
      </section>

      {/* ============ Resten av forsiden – redesignet ============ */}
      {/* scroll-mt-20: gir litt luft opp mot den sticky headeren når man
          lander her via "bla nedover"-pilen i heroen. */}
      <div id="etter-hero" className="scroll-mt-20">
        <MoodModeSection lang={lang} />

        {editorialMain && (
          // pb (ikke py) med vilje – MoodModeSection over har allerede sin
          // egen sjenerøse bunnpadding, se filheaderen i MoodModeSection.tsx.
          // En pt her i tillegg ville doblet luften ned til denne seksjonen
          // sammenlignet med luften mellom heroen og MoodModeSection over
          // (nøyaktig tilbakemeldingen fra Henrik 26.08.2026).
          <div className="pb-16 sm:pb-20">
            <FeaturedEditorial main={editorialMain} others={editorialOthers} lang={lang} />
          </div>
        )}

        <WinePairing lang={lang} />

        <CookModeShowcase lang={lang} recipeSlug={editorialMain?.slug ?? newest[0]?.slug ?? null} />

        <AtmosphereSection lang={lang} />

        {/* To små, rolige inngangs-teasere (spesifikasjon punkt 6) – "Hva
            skal vi spise?" og "I sesong". Bevisst KUN lenke-kort her, ikke
            selve funksjonene (de bor på egne sider, se
            components/whattoeat/WhatToEatView.tsx og app/sesong/). */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <WhatToEatTeaser lang={lang} />
            <SeasonTeaser lang={lang} />
          </div>
        </div>

        <div className="py-16 sm:py-20">
          <CategoryShowcase categories={categories} counts={categoryCounts} lang={lang} />
        </div>

        {/* Enkel, funksjonell tilgang til alt innholdet – siden skal
            inspirere FØRST (seksjonene over), men fortsatt gi rask, ryddig
            tilgang til hele katalogen (søk/filter finnes på /oppskrifter). */}
        <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
          {newestForGrid.length > 0 && (
            <section aria-labelledby="nyeste">
              <NewestRecipesFeed recipes={newestForGrid} lang={lang} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
