import type { Lang } from "@/lib/i18n";
import type { UnitSystem } from "@/lib/utils/units";

/**
 * FELLES TYPER FOR "KJØKKENINTELLIGENS" (Kitchen Intelligence)
 * ==============================================================
 *
 * Dette er fundament-laget for alle de nye, intelligente kjøkkenfunksjonene
 * (Smart Pantry Search, Cook Mode-timere, "Løft retten", smart
 * ingrediens-erstatning, "Bruk restene", meny-bygger, semantisk
 * porsjonsskalering, "Gjør det til en kveld" osv.). Poenget med å samle
 * typene ett sted, FØR noen av enkeltfunksjonene bygges, er at de skal dele
 * én forståelse av "hva slags rett lager brukeren egentlig nå" i stedet for
 * å bli ti frittstående AI-lapper som ikke vet om hverandre.
 *
 * Sentralt begrep: RecipeSession (se lenger ned). Den er den "levende"
 * representasjonen av retten SLIK BRUKEREN FAKTISK LAGER DEN – valgt
 * porsjonsantall, målesystem, språk, variant (original/vegetar), valgte
 * erstatninger, valgte "løft"-forslag, ønsket spisetidspunkt, aktive
 * timere og Cook Mode-fremgang. Den lagres KUN lokalt per besøkende
 * (localStorage, samme mønster som lib/hooks/useCookModeState.ts) og
 * MUTERER ALDRI den lagrede oppskriften i databasen – originalen i
 * lib/types.ts sin Recipe er og blir fasiten, sesjonen er et overlegg
 * oppå den for akkurat dette besøket.
 *
 * Deterministisk vs. AI – se også lib/kitchen-intelligence/session.ts:
 * Alt som kan regnes ut med ren logikk (porsjonsskalering, enhetsbytte,
 * sammenslåing av handlelister, hvor langt man har kommet i en oppskrift,
 * nedtelling på en timer) skal ALDRI gå via AI – det er unødvendig
 * treghet, kostnad og en feilkilde. AI brukes kun der det faktisk kreves
 * skjønn (bildeforståelse, gastronomisk vurdering av en erstatning, forslag
 * til hvordan en rett kan "løftes", meny-sammensetning, tolkning av fri
 * teksts tidsangivelser). AI-svar som er dyre/trege og som med rimelighet
 * kan gjenbrukes, caches – se ai-cache.ts.
 */

/** Hvilken "grunnvariant" av retten brukeren ser/lager. Flere varianter kan
 * finnes samtidig (f.eks. original + AI-generert vegetarvariant), men bare
 * én er "aktiv" i en gitt sesjon. */
export type RecipeVariant = "original" | "vegetarian";

/** Én ingrediens-erstatning brukeren har valgt å ta i bruk for denne økta.
 * `ingredientItemId` peker til IngredientItem.id (eller en syntetisk id fra
 * withSyntheticIds() for AI-genererte varianter) slik at UI-et kan vise
 * erstatningen presist der ingrediensen faktisk står i listen. */
export interface ChosenSubstitution {
  ingredientItemId: string;
  originalName: string;
  originalAmount: string | null;
  originalUnit: string | null;
  substituteName: string;
  /** Justert mengde/enhet for erstatningen, dersom forholdet ikke er 1:1
   * (f.eks. "2 ss soyasaus" i stedet for "1 ts salt"). Null = bruk samme
   * mengde/enhet som originalen. */
  substituteAmount: string | null;
  substituteUnit: string | null;
  /** Kort AI-generert begrunnelse, vist i UI så valget er sporbart og
   * forklart – ikke bare et bytte "i det stille". */
  reason: string;
}

/** Alvorlighetsgrad/ambisjonsnivå for et "Løft retten"-forslag – lar UI-et
 * gruppere forslag fra "5 minutter ekstra" til "en helg-prosjekt-versjon"
 * uten at hvert forslag må ha en egen ad-hoc kategori. */
export type ImprovementTier = "quick" | "considered" | "ambitious";

/** Ett "Løft retten"-forslag brukeren har valgt å ta i bruk. Selve
 * generering-av-forslag er AI (se ai-cache.ts for caching av det kallet);
 * dette er kun den lille, serialiserbare kvitteringen på HVILKET forslag
 * som er valgt, slik at Cook Mode/handleliste kan reagere på det. */
export interface ChosenImprovement {
  id: string;
  tier: ImprovementTier;
  title: string;
  description: string;
}

/** Fremdrift i Cook Mode. Samme felt som lib/hooks/useCookModeState.ts sin
 * interne CookModeState, samlet inn i RecipeSession sitt fundament-lag slik
 * at fremtidig kode (f.eks. "Reverse Cooking Timeline") kan lese fremdrift
 * uten en egen, parallell datakilde. useCookModeState.ts er IKKE erstattet
 * av dette ennå – det er en egen, separat lagret nøkkel i dag, og migrering
 * av CookMode.tsx til å bruke RecipeSession i stedet er bevisst utsatt til
 * fasen der Cook Mode-utvidelsene (timere, parallell-oppgave-varsling)
 * faktisk bygges, for å unngå å røre en ferdig, fungerende komponent uten
 * samtidig å levere noe nytt i den.
 */
export interface CookModeProgress {
  currentStepIndex: number;
  checkedStepIds: string[];
  checkedIngredientIds: string[];
}

/** Én aktiv nedtellingstimer i Cook Mode. Rent datamodell-nivå her – selve
 * "flere samtidige timere + varsling om parallelle oppgaver"-logikken er en
 * senere fase; dette feltet lar RecipeSession beskrive tilstanden
 * konsistent den dagen den logikken bygges. `startedAtMs`/`durationMs` (ikke
 * f.eks. "sekunder igjen") slik at nedtelling regnes ut løpende fra
 * klokkeslett og overlever at fanen har vært i bakgrunnen, i stedet for å
 * drive og telle ned mens siden er inaktiv. */
export interface RecipeSessionTimer {
  id: string;
  label: string;
  /** Hvilket steg timeren hører til, for visning/kobling i UI. Null = ikke
   * knyttet til et bestemt steg (f.eks. en frittstående kjøkkentimer). */
  stepId: string | null;
  durationMs: number;
  startedAtMs: number | null;
  /** Satt når brukeren pauser – differansen brukes til å justere
   * gjenværende tid ved gjenopptak, uten drift. */
  pausedRemainingMs: number | null;
}

/**
 * RecipeSession – se filheader. Én instans per (recipeId, besøkende),
 * lagret i localStorage under nøkkelen
 * `oppskriftsboken:session:${recipeId}` (se useRecipeSession-hooken).
 */
export interface RecipeSession {
  recipeId: string;
  /** Målporsjoner for DENNE økta. Sammenlignes mot Recipe.servings
   * (originalen) for å regne ut skaleringsfaktor – se session.ts. */
  servings: number;
  unitSystem: UnitSystem;
  lang: Lang;
  variant: RecipeVariant;
  substitutions: ChosenSubstitution[];
  improvements: ChosenImprovement[];
  /** Ønsket tidspunkt retten skal være klar, som "HH:mm" i besøkendes
   * lokale tid. Null = ikke satt (brukes av "Reverse Cooking Timeline"). */
  desiredReadyAt: string | null;
  cookMode: CookModeProgress;
  timers: RecipeSessionTimer[];
  /** Frie notater brukeren skriver til seg selv for akkurat denne
   * tilberedningen ("dobbel dose hvitløk", "husk å ta ut kylling kl 16"). */
  notes: string;
  updatedAt: string;
}

/** Kompakt, serialiserbart sammendrag av en RecipeSession – dette er formen
 * enhver ny AI-server-action (erstatninger, "Løft retten", meny-forslag,
 * smaksprofil) bør ta imot i tillegg til selve oppskriftsteksten, slik at
 * forslagene faktisk tar hensyn til det brukeren allerede har valgt (f.eks.
 * ikke foreslå en kjøttbasert "løft" når variant === "vegetarian"). Ren
 * dataoverføringstype – ingen logikk. */
export interface RecipeSessionContext {
  servings: number;
  unitSystem: UnitSystem;
  lang: Lang;
  variant: RecipeVariant;
  activeSubstitutions: Pick<ChosenSubstitution, "originalName" | "substituteName">[];
  activeImprovements: Pick<ChosenImprovement, "title">[];
}

/** Navn på funksjonsområdene som kan cache AI-svar via ai-cache.ts. Samlet
 * ett sted (i stedet for frittstående strenger spredt i hver feature) slik
 * at alle nye funksjoner bruker samme, forutsigbare cache-nøkkel-rom. */
export const AI_CACHE_FEATURES = [
  "substitution",
  "improvement",
  "pantry_match",
  "menu_suggestion",
  "leftovers",
  "mood_mode",
  "parallel_tasks",
  // MERK: "taste_profile" er BEVISST ikke lenger her – smaksprofilen er
  // 25.08.2026 gjort om fra en cachet, live per-besøk AI-beregning til en
  // forhåndsgenerert admin-egenskap lagret direkte på oppskriften
  // (recipes.taste_profile), se generateTasteProfile i
  // lib/actions/recipes.ts. Gamle cache-rader med feature="taste_profile"
  // kan trygt ligge urørt/slettes manuelt i ai_suggestion_cache – de leses
  // ikke av noe lenger.
] as const;

export type AiCacheFeature = (typeof AI_CACHE_FEATURES)[number];
