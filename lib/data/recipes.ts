import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { demoRecipes, findDemoRecipe } from "@/lib/demo-data/recipes";
import { mapRecipeListRow, mapRecipeRow, RECIPE_LIST_SELECT, RECIPE_SELECT, toSearchable, toSummary } from "@/lib/data/mappers";
import type { RawRecipeListRow, RawRecipeRow } from "@/lib/data/mappers";
import type { Recipe, RecipeSummary } from "@/lib/types";
import type { SearchableRecipe } from "@/lib/utils/search";

/**
 * Datatilgangslag for oppskrifter. Alle funksjoner her faller automatisk
 * tilbake til lib/demo-data når Supabase ikke er konfigurert (se
 * lib/supabase/is-configured.ts), slik at appen alltid har noe å vise –
 * også helt uten miljøvariabler satt opp.
 *
 * Skriveoperasjoner (opprette/redigere/slette) ligger i lib/actions/, ikke
 * her – dette laget er kun for lesing.
 */

async function getPublishedDemoRecipes(): Promise<Recipe[]> {
  return demoRecipes.filter((r) => r.isPublished);
}

// Delt cache-tag (02.10.2026, Supabase-varsel: "exceeded its usage quota" –
// cached egress OG egress begge sprengt samtidig) – brukt av ALLE
// Server Actions som endrer noe synlig i RecipeSummary/SearchableRecipe
// (publiser, utvalg, humør, roller, ukesmeny-felter osv., se
// revalidateRecipePaths() i lib/actions/recipes.ts) til å kalle
// revalidateTag(RECIPES_TAG) og dermed invalidere akkurat denne cachen med
// det samme, i stedet for å vente på REVALIDATE_SECONDS under.
export const RECIPES_TAG = "recipes";
// Sikkerhetsnett i tillegg til revalidateTag over – dekker ev. fremtidige
// mutasjonsveier noen glemmer å tagge, uten at ferskheten blir for dårlig
// om det skulle skje. 2 minutter er kort nok til at "nesten sanntid" fortsatt
// stemmer for besøkende, men lenge nok til å fjerne det store flertallet av
// gjentatte spørringer ved vanlig trafikk/sideoppdateringer.
const RECIPES_REVALIDATE_SECONDS = 120;

/**
 * FELLES, CACHET råhenting av alle publiserte oppskrifter (02.10.2026, se
 * RECIPES_TAG sin kommentar over for hele bakgrunnen – Supabase sin
 * gratiskvote for egress/cached egress ble sprengt på kun 11 dager, drevet
 * av at BÅDE getPublishedRecipeSummaries OG getSearchableRecipes under
 * kjørte sin EGEN, identiske, UCACHEDE spørring mot ALLE publiserte
 * oppskrifter (med full fremgangsmåte/ingredienser/tags) på HVER ENESTE
 * sidevisning av forsiden/oppskrift-oversikten/ukesmenyen – uten
 * gjenbruk på tvers av besøk i det hele tatt).
 *
 * To endringer fra den gamle, separate, ucachede versjonen av disse to
 * funksjonene:
 * 1. Én delt spørring i stedet for to identiske – getPublishedRecipeSummaries
 *    og getSearchableRecipes trengte uansett nøyaktig samme rader, bare
 *    mappet til to ulike formater (toSummary/toSearchable) helt til slutt.
 * 2. unstable_cache() (ekte cache PÅ TVERS AV forespørsler/besøkende, til
 *    forskjell fra react sin cache() lenger ned, som kun memoiserer
 *    INNENFOR ett enkelt render-pass – løste "tre identiske kall på samme
 *    sidevisning"-problemet den gang, 10.09.2026, men aldri "samme spørring
 *    på hver ny sidevisning"-problemet).
 *
 * Bruker BEVISST den cookie-frie createStaticClient() (ikke createClient())
 * – unstable_cache() tillater ikke at den cachede funksjonen leser
 * cookies()/headers() i det hele tatt (Next.js kaster da en feil), og RLS-
 * policyen "recipes_select_published_or_admin" gir uansett enhver klient,
 * innlogget eller ikke, leserett på PUBLISERTE oppskrifter – helt samme
 * resonnement som getRecipeBySlug (det offentlige, includeUnpublished:
 * false-tilfellet) og getAllCategories i lib/data/categories.ts allerede
 * bruker denne klienten for.
 *
 * Henter/cacher BEVISST kun RECIPE_LIST_SELECT (ikke den fulle RECIPE_SELECT)
 * og returnerer SearchableRecipe (RecipeSummary + ingrediensnavn), ikke hele
 * Recipe – se mapRecipeListRow sin filheader i lib/data/mappers.ts for hele
 * bakgrunnen (03.10.2026): den fulle varianten traff Next.js sin harde
 * 2MB-grense per cache-oppføring med ~270 publiserte oppskrifter.
 */
const getPublishedRecipeRows = unstable_cache(
  async (): Promise<SearchableRecipe[]> => {
    if (!isSupabaseConfigured) {
      return (await getPublishedDemoRecipes()).map(toSearchable);
    }

    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("recipes")
      .select(RECIPE_LIST_SELECT)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Kunne ikke hente oppskrifter:", error.message);
      return [];
    }

    return ((data ?? []) as unknown as RawRecipeListRow[]).map(mapRecipeListRow);
  },
  ["published-recipe-rows-v2"],
  { tags: [RECIPES_TAG], revalidate: RECIPES_REVALIDATE_SECONDS },
);

// react sin cache() (10.09.2026, samme "treig navigasjon"-tilbakemelding som
// proxy.ts sin filheader) – memoiserer PER FORESPØRSEL OVENPÅ
// unstable_cache() over, slik at flere kall til nøyaktig denne funksjonen
// INNENFOR samme render-pass (forsiden kaller getFeaturedRecipes/
// getNewestRecipes/getAdminFavoriteRecipes parallelt via Promise.all, som
// alle går via denne) ikke trenger tre separate runder gjennom
// unstable_cache() sin egen oppslagslogikk heller.
export const getPublishedRecipeSummaries = cache(async (): Promise<RecipeSummary[]> => {
  return getPublishedRecipeRows();
});

/** Full søkbar liste (inkl. ingrediensnavn) over publiserte oppskrifter. Deler
 * samme cachede råhenting som getPublishedRecipeSummaries over, se
 * getPublishedRecipeRows sin filheader. */
export async function getSearchableRecipes(): Promise<SearchableRecipe[]> {
  return getPublishedRecipeRows();
}

export async function getFeaturedRecipes(limit = 3): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all
    .filter((r) => r.isFeatured)
    .sort((a, b) => (a.featuredSortOrder ?? Infinity) - (b.featuredSortOrder ?? Infinity))
    .slice(0, limit);
}

/** Sammenligningsfunksjon for displayOrder (høyest vises først) – se
 * displayOrder sin filheader i lib/types.ts og migrasjon 0029. Delt av
 * getBrowseRecipeSummaries og getNewestRecipes under, de TO ENESTE
 * stedene i hele appen som sorterer på dette feltet (alt annet som bruker
 * getPublishedRecipeSummaries/getSearchableRecipes – søk, kjøkken-AI,
 * vinmatching, sesongsidene, /ukesmeny, ALLE admin-sidene – fortsetter
 * uendret på den opprinnelige created_at-rekkefølgen, bevisst IKKE rørt
 * her). `?? 0` dekker demo-data, der feltet aldri settes. */
function byDisplayOrderDesc(a: { displayOrder?: number }, b: { displayOrder?: number }): number {
  return (b.displayOrder ?? 0) - (a.displayOrder ?? 0);
}

/**
 * Samme underliggende, delte oppskriftsliste som getSearchableRecipes
 * (ingen ekstra spørring/cache-oppføring – kun en ren in-memory
 * omsortering av den allerede hentede/cachede arrayen), men sortert på
 * displayOrder i stedet for created_at. Brukt KUN av /oppskrifter
 * (app/oppskrifter/page.tsx → BrowseRecipesClient) – se filheaderen ved
 * byDisplayOrderDesc over for hvorfor ingen andre forbrukere er endret.
 */
export async function getBrowseRecipeSummaries(): Promise<SearchableRecipe[]> {
  const all = await getSearchableRecipes();
  return [...all].sort(byDisplayOrderDesc);
}

/** "Nyeste oppskrifter" på forsiden – sorterer SAMME delte liste på
 * displayOrder (se byDisplayOrderDesc over), ikke lenger direkte på
 * created_at-rekkefølgen arrayen allerede har fra getPublishedRecipeRows.
 * Henrik, da "Miks rekkefølgen"-knappen ble bedt om (03.10.2026):
 * "rekkefølgen vil også påvirke det som står under 'nyeste oppskrifter'
 * på forsiden" – eksplisitt ønsket koblet sammen med /oppskrifter sin
 * rekkefølge, i motsetning til alle admin-listene (se samme filhode). */
export async function getNewestRecipes(limit = 6): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return [...all].sort(byDisplayOrderDesc).slice(0, limit);
}

export async function getAdminFavoriteRecipes(): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.favoritedByAdmin);
}

/**
 * "Helg & gjester" (/helg-og-gjester, 03.10.2026) – det kuraterte utvalget
 * admin har merket med weekend_guests (se migrasjon
 * 0030_recipe_weekend_guests.sql og WeekendGuestsAdminPicker.tsx). Samme
 * "ingen ekstra spørring"-mønster som getAdminFavoriteRecipes/
 * getRecipesByCategory over – et rent in-memory filter på den allerede
 * hentede/cachede getPublishedRecipeSummaries()-listen. Siden sortering/
 * anledningsfiltrering (Alle/Fredagskveld/Date night/...) skjer helt
 * klientsidig i WeekendGuestsClient.tsx (ingen reload ved filterbytte, se
 * Henriks spesifikasjon), returneres hele det kuraterte settet ferdig
 * sortert på displayOrder (samme rekkefølge som /oppskrifter) – IKKE
 * created_at-rekkefølgen arrayen ellers har – slik at "featured"-valget
 * (høyeste displayOrder i det aktive filteret) er deterministisk og
 * fortsatt følger "Miks rekkefølgen"-knappen på /oppskrifter.
 */
export async function getWeekendGuestsRecipes(): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.weekendGuests).sort(byDisplayOrderDesc);
}

/**
 * Kontobaserte favoritter (27.09.2026, steg 1 av "kontolagring på tvers av
 * enheter" – se prosjektnotatet). Erstatter den tidligere localStorage-
 * varianten (lib/hooks/useFavorites.ts) for INNLOGGEDE, ikke-admin
 * brukere – helt separat fra `favoritedByAdmin` over, som er en delt,
 * admin-kuratert liste, ikke en per-bruker en.
 *
 * Parameterisert på `userId` (IKKE getCurrentUser() her) – se filheaderen
 * øverst i denne filen: auth-sjekk hører hjemme hos kalleren (Server
 * Action/side), ikke i selve datatilgangslaget. RLS-policyene på
 * `favorites` (0021_user_accounts.sql: `user_id = auth.uid()`) håndhever
 * uansett at en spørring aldri kan returnere en ANNEN brukers rader, selv
 * om en feilaktig `userId` skulle bli sendt inn.
 */
export async function getFavoriteRecipeIdsForUser(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from("favorites").select("recipe_id").eq("user_id", userId);

  if (error) {
    console.error("Kunne ikke hente favoritt-ID-er:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.recipe_id as string);
}

/**
 * Samme kilde som getFavoriteRecipeIdsForUser over, men slått opp mot de
 * faktiske oppskriftene (RecipeSummary) – brukt av /favoritter-siden for
 * en innlogget, ikke-admin bruker. Gjenbruker getRecipesByIds (samme
 * to-stegs "ID-er → fulle rader"-mønster som handlelisten allerede bruker
 * den funksjonen til) fremfor en egen embedded-spørring.
 */
export async function getFavoriteRecipesForUser(userId: string): Promise<RecipeSummary[]> {
  const ids = await getFavoriteRecipeIdsForUser(userId);
  if (ids.length === 0) return [];

  const recipes = await getRecipesByIds(ids);
  return recipes.filter((r) => r.isPublished).map(toSummary);
}

export async function getRecipesByCategory(categorySlug: string): Promise<RecipeSummary[]> {
  const all = await getPublishedRecipeSummaries();
  return all.filter((r) => r.category?.slug === categorySlug);
}

/**
 * Henter én oppskrift på slug. `includeUnpublished` brukes kun fra admin
 * (forhåndsvisning av utkast) – offentlige sider skal alltid la denne stå
 * som false.
 *
 * Bruker den cookie-frie klienten (createStaticClient) for det vanlige,
 * offentlige tilfellet (10.09.2026, "treig navigasjon"-tilbakemelding) –
 * RLS-policyen "recipes_select_published_or_admin" (se
 * supabase/migrations/0001_init.sql) gir enhver klient, innlogget eller
 * ikke, leserett på publiserte oppskrifter, så ingen brukersesjon trengs
 * her. Samme resonnement som getAllCategories i lib/data/categories.ts.
 * `includeUnpublished: true` (kun admin-forhåndsvisning av utkast) trenger
 * derimot fortsatt den cookie-baserte klienten, siden RLS der stoler på
 * `public.is_admin()`, som krever en ekte brukersesjon.
 */
export async function getRecipeBySlug(
  slug: string,
  { includeUnpublished = false }: { includeUnpublished?: boolean } = {},
): Promise<Recipe | null> {
  if (!isSupabaseConfigured) {
    const recipe = findDemoRecipe(slug);
    if (!recipe) return null;
    if (!recipe.isPublished && !includeUnpublished) return null;
    return recipe;
  }

  const supabase = includeUnpublished ? await createClient() : createStaticClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke hente oppskrift:", error.message);
    return null;
  }
  if (!data) return null;

  const recipe = mapRecipeRow(data as unknown as RawRecipeRow);
  if (!recipe.isPublished && !includeUnpublished) return null;
  return recipe;
}

/**
 * Kun slugs for publiserte oppskrifter – brukt av generateStaticParams og
 * app/sitemap.ts, som begge kjører UTEN en ekte HTTP-forespørsel. Bruker
 * derfor den cookie-frie klienten (se lib/supabase/static.ts) i stedet for
 * å gå via getPublishedRecipeSummaries/createClient, som ville kastet en
 * feil om cookies() i disse kontekstene.
 */
export async function getAllSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return (await getPublishedDemoRecipes()).map((r) => r.slug);
  }

  const supabase = createStaticClient();
  const { data, error } = await supabase.from("recipes").select("slug").eq("is_published", true);

  if (error) {
    console.error("Kunne ikke hente slugs:", error.message);
    return [];
  }

  return (data ?? []).map((r) => r.slug);
}

/** Alle oppskrifter (også upubliserte), kun for admin-dashbordet. */
export async function getAllRecipesForAdmin(): Promise<RecipeSummary[]> {
  if (!isSupabaseConfigured) {
    return demoRecipes.map(toSummary);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente oppskrifter for admin:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawRecipeRow[]).map((row) => toSummary(mapRecipeRow(row)));
}

/**
 * Flere fulle oppskrifter (ingredienser + porsjonstall) samlet i ett
 * oppslag, gitt en liste med id-er – brukt av "Legg hele menyen i
 * handlelisten" (Fase 5 – Experience, 5.7, se
 * lib/actions/meal-shopping-list.ts), der MealSession-slotsene KUN har en
 * lett id/slug/tittel-snapshot (se ExistingMealCourseSlot i
 * lib/kitchen-intelligence/types.ts) og trenger de ekte ingredienslistene
 * for å bygges om til handlelistelinjer. KUN publiserte oppskrifter – en
 * rett som er avpublisert etter at den ble lagt i en meny skal ikke lekke
 * upublisert innhold inn i handlelisten. Rekkefølgen på svaret følger IKKE
 * nødvendigvis `ids` – kalleren slår opp i resultatet per id selv. */
export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];

  if (!isSupabaseConfigured) {
    return demoRecipes.filter((r) => r.isPublished && ids.includes(r.id));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .in("id", ids)
    .eq("is_published", true);

  if (error) {
    console.error("Kunne ikke hente oppskrifter for handleliste:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawRecipeRow[]).map((row) => mapRecipeRow(row));
}

export async function getRecipeByIdForAdmin(id: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured) {
    const recipe = demoRecipes.find((r) => r.id === id);
    return recipe ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRecipeRow(data as unknown as RawRecipeRow);
}

export async function getAllRecipeSlugsForCollisionCheck(excludeId?: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return demoRecipes.filter((r) => r.id !== excludeId).map((r) => r.slug);
  }

  const supabase = await createClient();
  let query = supabase.from("recipes").select("id, slug");
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r) => r.slug);
}
