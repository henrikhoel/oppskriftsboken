"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, RecipeFilters } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";
import { filterRecipes } from "@/lib/utils/search";
import { MOOD_DEFINITIONS, type MoodId } from "@/lib/kitchen-intelligence/moods";
import { FilterPanel } from "@/components/search/FilterPanel";
import { BrowseRecipeGrid } from "@/components/search/BrowseRecipeGrid";
import { ShuffleOrderButton } from "@/components/admin/ShuffleOrderButton";
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon } from "@/components/ui/icons";
import { useAccountFavorites } from "@/lib/hooks/useAccountFavorites";
import { recipeCountLabel, t, type Lang } from "@/lib/i18n";
import { clsx } from "clsx";

// 20 pr. side på desktop (04.10.2026, Henrik: "Vis 20 oppskrifter per side
// på desktop. Med 4 kolonner gir dette 5 komplette rader") – se
// BrowseRecipeGrid.tsx for selve kolonnebrytningspunktene (uendret fra det
// gamle RecipeGrid.tsx, kun luften mellom kortene er justert).
const RECIPES_PAGE_SIZE = 20;

export function BrowseRecipesClient({
  recipes,
  categories,
  isAdmin = false,
  isLoggedIn = false,
  lang,
}: {
  recipes: SearchableRecipe[];
  categories: Category[];
  isAdmin?: boolean;
  /** (27.09.2026) Se FavoriteButton.tsx sin filheader. Styrer i tillegg om
   * "vis kun favoritter"-filteret under skal overlagres fra kontoens
   * favorittliste – se withAccountFavorites under. */
  isLoggedIn?: boolean;
  lang: Lang;
}) {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  // "Se alle" fra "Hva passer humøret ditt?" på forsiden (03.10.2026,
  // Henrik: "kan man trykke 'se alle' og da kommer man inn på 'Alle
  // oppskrifter' siden hvor humøret allerede er valgt som filter") – leser
  // ?mood=<id> fra URL-en, se MoodModeSection.tsx sin lenke. Validerer mot
  // MOOD_DEFINITIONS (ikke bare `as MoodId`) siden URL-en i prinsippet kan
  // inneholde hva som helst – en ukjent/skrevet-feil verdi blir da ganske
  // enkelt "ingen humør valgt" i stedet for en krasjende filtrering.
  const moodParam = searchParams.get("mood");
  const initialMood = MOOD_DEFINITIONS.some((m) => m.id === moodParam) ? (moodParam as MoodId) : undefined;
  const { favoriteIds: accountFavoriteIds, hydrated: accountHydrated } = useAccountFavorites();

  const [filters, setFilters] = useState<RecipeFilters>({ query: queryParam, mood: initialMood });

  // (27.09.2026, Henrik: "når jeg er inne på 'oppskrifter' og prøver å søke
  // med feltet øverst, så skjer det ingenting. det fungerer på de andre
  // sidene, men ikke 'oppskrifter'") – filters.query ble tidligere kun satt
  // fra URL-ens ?q= ÉN gang, i useState-initialiseringen ved første mount.
  // Header sitt søkefelt (SearchBar.tsx) navigerer alltid til nettopp
  // /oppskrifter?q=... – men står man ALLEREDE på /oppskrifter er dette
  // samme rute, så BrowseRecipesClient mountes ikke på nytt, og det nye
  // søkeordet i URL-en ble derfor aldri plukket opp. Fra enhver annen side
  // fungerte det fint, siden navigasjonen dit uansett friskt monterer
  // denne komponenten. Synkroniserer nå query-feltet eksplisitt hver gang
  // selve URL-parameteren endrer seg, uten å nullstille de andre filtrene
  // (kategori/tid/vanskelighetsgrad) brukeren eventuelt allerede har satt.
  useEffect(() => {
    setFilters((prev) => (prev.query === queryParam ? prev : { ...prev, query: queryParam }));
  }, [queryParam]);

  // Samme mount-vs-samme-rute-problem som queryParam over gjelder i
  // prinsippet også ?mood= – usannsynlig i praksis (man kommer typisk til
  // /oppskrifter?mood=X fra en ANNEN side, forsiden), men koster ingenting
  // å synkronisere på samme måte for konsistens/fremtidssikring.
  useEffect(() => {
    const next = MOOD_DEFINITIONS.some((m) => m.id === moodParam) ? (moodParam as MoodId) : undefined;
    setFilters((prev) => (prev.mood === next ? prev : { ...prev, mood: next }));
  }, [moodParam]);

  // Overlag kontoens EGEN favorittliste inn i favoritedByAdmin-feltet, kun
  // for "vis kun favoritter"-filteret (filters.favoritesOnly) sin del –
  // FavoriteButton/RecipeCard bruker fortsatt isAdmin/isLoggedIn til å vise
  // riktig hjerte-status og til å skrive til riktig sted, se der. Admin
  // trenger ingen overlagring – favoritedByAdmin kommer allerede riktig
  // fra selve dataen for den rollen. En ikke-innlogget besøkende har ingen
  // favoritter i det hele tatt lenger (se FavoriteButton.tsx sin filheader
  // – hjerte-knappen vises ikke, og FilterPanel skjuler dette filteret for
  // dem, se canFavorite under), så ingen overlagring trengs der heller.
  const withAccountFavorites = useMemo(() => {
    if (!isLoggedIn || !accountHydrated) return recipes;
    return recipes.map((r) => (accountFavoriteIds.includes(r.id) ? { ...r, favoritedByAdmin: true } : r));
  }, [recipes, isLoggedIn, accountFavoriteIds, accountHydrated]);

  const filtered = useMemo(
    () => filterRecipes(withAccountFavorites, filters),
    [withAccountFavorites, filters],
  );

  // SKJULT FILTERPANEL SOM STANDARD (04.10.2026, Henrik: "Den permanente
  // filterboksen til venstre skal være skjult som standard [...] Når
  // brukeren trykker 'Filtrer', åpnes det eksisterende filterpanelet fra
  // venstre [...] Ikke bruk modal. Panelet skal åpnes som en del av
  // layouten"). `filterOpen` styrer BÅDE om <aside> rendres i det hele
  // tatt OG om selve grid-template-kolonnene på lg+ settes opp med en
  // 280px-bredde til panelet (se JSX-en under) – ingen <aside> i det hele
  // tatt når lukket betyr at den resterende <div>-en (selve
  // oppskriftsgridet) automatisk får hele bredden tilbake, helt uten en
  // egen "lukket bredde"-gren å holde synkronisert. INGEN endring av selve
  // FilterPanel.tsx – kun om/hvor den vises, akkurat som bedt om ("Ikke
  // redesign filterpanelet").
  //
  // `activeFilterCount` telles KUN fra feltene FilterPanel.tsx selv
  // styrer (kategori/tid/vanskelighetsgrad/humør/favoritter/ingrediens) –
  // IKKE filters.query, som uansett alltid er synlig som skrevet tekst i
  // søkefeltet i toppmenyen/mobil-søkefeltet, aldri gjemt inni det
  // kollapsede panelet. Vises som "Filtrer · N" ved siden av selve
  // knappen når N > 0, se JSX under.
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categorySlug) count++;
    if (filters.difficulty) count++;
    if (filters.maxTotalTime) count++;
    if (filters.mood) count++;
    if (filters.favoritesOnly) count++;
    if (filters.ingredient) count++;
    return count;
  }, [filters]);

  // PAGINERING (04.10.2026, se app/oppskrifter/page.tsx og
  // BrowseRecipeGrid.tsx sine filheadere for resten av redesignet). `page`
  // er 0-indeksert internt, kun +1 i selve visningen av "Side X av Y".
  // Nullstilles til side 0 hver gang `filters` endrer IDENTITET (Henrik:
  // "Ved endring av søk eller filter skal brukeren automatisk gå tilbake
  // til side 1") – FilterPanel sin onChange, OG de to useEffect-ene over
  // (synkronisering fra ?q=/?mood=), setter ALLTID et NYTT filters-objekt
  // når noe faktisk endres (de har allerede sin egen
  // "er verdien uendret? behold samme referanse"-vakt, se useEffect-ene
  // over), så denne ene effekten fanger alle tre kildene uten å måtte vite
  // noe om dem. "Miks rekkefølgen" (ShuffleOrderButton, kun admin) endrer
  // derimot `recipes`-prop-en, IKKE `filters` – siden selve filteret ikke
  // endres der, nullstilles siden med VILJE ikke, se ShuffleOrderButton.tsx
  // sin filheader.
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const gridTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / RECIPES_PAGE_SIZE));
  // Sikkerhetsnett: hvis `filtered` plutselig blir kortere enn der `page`
  // allerede står (f.eks. et sjeldent race mellom filterbytte og en
  // "Miks rekkefølgen"-oppdatering), vises heller SISTE gyldige side enn en
  // tom en – selve nullstillingen til side 0 ved et ekte filterbytte skjer
  // uansett i useEffect-en over.
  const safePage = Math.min(page, pageCount - 1);
  const visibleRecipes = filtered.slice(safePage * RECIPES_PAGE_SIZE, (safePage + 1) * RECIPES_PAGE_SIZE);
  const hasPrevious = safePage > 0;
  const hasNext = safePage < pageCount - 1;

  // Lett fade ved sidebytte, samme visuelle prinsipp som Helg & gjester sin
  // "Tilbake"/"Neste"-paginering (WeekendGuestsClient.tsx) – KUN ved selve
  // sidebyttet (goToPage), ikke ved søk/filterendring (filtered regnes om
  // synkront via useMemo, akkurat som før dette redesignet, og skal
  // fortsatt oppleves instant). Scroller også rutenettet mildt inn i synsfelt
  // – med 20 kort over 5 rader er "Neste" nederst på siden ellers lett å
  // trykke uten at man merker at NOE har endret seg før man ruller opp selv.
  function goToPage(next: number) {
    setVisible(false);
    setPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => setVisible(true), 40);
  }

  return (
    <div className={clsx("grid gap-8", filterOpen && "lg:grid-cols-[280px_minmax(0,1fr)]")}>
      {filterOpen && (
        // Lukk-kontroll INNE i panelet ER FJERNET (04.10.2026, runde 2,
        // Henrik: "Fjern 'Lukk filter' som nå vises separat over panelet.
        // Bruk kun eksisterende 'Filtrer ‹'-kontroll til å lukke
        // panelet") – selve "Filtrer"-knappen under gridet er nå den ENE
        // veien inn/ut (pilen roterer 180° når panelet er åpent, se der).
        <aside>
          <FilterPanel
            categories={categories}
            filters={filters}
            onChange={setFilters}
            canFavorite={isAdmin || isLoggedIn}
            lang={lang}
          />
        </aside>
      )}
      <div>
        <div ref={gridTopRef} className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-faint">{recipeCountLabel(lang, filtered.length)}</p>
          <div className="flex items-center gap-3">
            {/* Kun admin – se ShuffleOrderButton.tsx sin filheader. Plassert
                her (ikke i FilterPanel) siden den styrer selve
                RESULTATREKKEFØLGEN, ikke et filter. */}
            {isAdmin && <ShuffleOrderButton />}
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              className="flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink"
            >
              <FilterIcon className="h-4 w-4" />
              {activeFilterCount > 0
                ? t(lang, "recipesPage.filterToggleWithCount", { count: activeFilterCount })
                : t(lang, "recipesPage.filterToggle")}
              <ChevronRightIcon className={clsx("h-4 w-4 transition-transform", filterOpen && "rotate-180")} />
            </button>
          </div>
        </div>
        <div className={clsx("transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}>
          {/* `filterOpen` sendes videre til gridet KUN for å avgjøre
              kolonnetallet (04.10.2026, runde 2, Henrik: "Når
              filterpanelet er åpent på desktop, vis 3 kolonner med
              oppskrifter i stedet for å presse inn 4 [...] Når
              filterpanelet lukkes, gå tilbake til 4 kolonner") – se
              BrowseRecipeGrid.tsx sin filheader for selve brytningspunkt-
              logikken. */}
          <BrowseRecipeGrid
            recipes={visibleRecipes}
            isAdmin={isAdmin}
            isLoggedIn={isLoggedIn}
            lang={lang}
            filterOpen={filterOpen}
          />
        </div>

        {pageCount > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={!hasPrevious}
              className="flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink-soft"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {t(lang, "recipesPage.paginationPrevious")}
            </button>
            <p className="text-xs text-ink-faint">
              {t(lang, "recipesPage.paginationPageOf", { page: safePage + 1, total: pageCount })}
            </p>
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink-soft"
            >
              {t(lang, "recipesPage.paginationNext")}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
