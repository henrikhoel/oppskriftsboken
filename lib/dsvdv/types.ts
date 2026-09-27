/**
 * Datamodell for jobbmat-oppskrifter i DSVDV – det skjulte, interne
 * området (se lib/dsvdv/session.ts sin filheader for hele bakgrunnen).
 *
 * BEVISST en egen, lokal TypeScript-fil (lib/dsvdv/jobbmat-data.ts) i
 * stedet for en Supabase-tabell, av to grunner:
 *
 * 1) Strukturell isolasjon (kravet "hold DSVDV isolert" – jobbmat skal
 *    ALDRI dukke opp i vanlig søk/Alle oppskrifter/favoritter/I sesong/
 *    anbefalinger/"Hva passer humøret ditt?"/sitemap). Alt det der leser
 *    fra `recipes`-tabellen i Supabase (se lib/data/recipes.ts) –
 *    jobbmat-oppskrifter lever i en helt separat datakilde og kan derfor
 *    strukturelt ikke lekke inn noe sted, uten behov for egne
 *    ekskluderingsfiltre spredt rundt i eksisterende kode.
 * 2) Claude har ikke lov til å kjøre databasemigrasjoner mot den levende
 *    Supabase-databasen på egen hånd – en ny tabell her og nå ville
 *    uansett krevd at Henrik kjørte migrasjonen selv.
 *
 * "Lag datastrukturen slik at vi enkelt kan legge inn mange jobbmat-
 * oppskrifter senere" er løst ved at typen under er komplett/strengt
 * typet – å legge inn en ny oppskrift er å legge til ett nytt objekt i
 * jobbmat-data.ts, TypeScript sier fra umiddelbart om noe mangler. Om
 * mengden en dag blir stor nok til at en ekte database/admin-skjema gir
 * mer mening, er dette en naturlig, avgrenset senere utvidelse – denne
 * typen kan gjenbrukes nesten uendret som utgangspunkt for en tabell da.
 */

export const JOBBMAT_UTSTYR = ["mikro", "airfryer", "toastjern"] as const;
export type JobbmatUtstyr = (typeof JOBBMAT_UTSTYR)[number];

export const JOBBMAT_UTSTYR_LABEL: Record<JobbmatUtstyr, string> = {
  mikro: "Mikro",
  airfryer: "Airfryer",
  toastjern: "Toastjern",
};

export interface JobbmatRecipe {
  /** Stabil id/slug – brukes som React-key nå, og som URL-del den dagen vi lager egne detaljsider. */
  slug: string;
  navn: string;
  kortBeskrivelse: string;
  /** Valgfritt – uten bilde vises samme "bilde kommer"-tilstand som RecipeCard.tsx bruker for vanlige oppskrifter uten hovedbilde. */
  bildeUrl?: string;
  /** Total tid i minutter, inkl. eventuell tilberedning på jobb. */
  totalMinutter: number;
  /** Hvilket utstyr retten kan lages med – kan være flere (f.eks. både mikro og airfryer). */
  utstyr: JobbmatUtstyr[];
  /** "Null innsats"-kategorien – for mat som ikke krever noe tilberedning i det hele tatt. */
  nullInnsats?: boolean;
  /** Hva som eventuelt må gjøres/tilberedes hjemme på forhånd. Tom/utelatt = ingenting. */
  forberedHjemme?: string[];
  /** Hva man faktisk må huske å ta med på jobb. */
  taMed: string[];
  ingredienser: string[];
  /** Enkel, kort fremgangsmåte – jobbmat trenger sjelden mer enn noen få steg. */
  fremgangsmate: string[];
}
