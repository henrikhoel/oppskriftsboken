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
  // "meal_plan" (Fase 5 – Experience): generateMealPlan i
  // lib/actions/kitchen-intelligence.ts – EGEN feature, ikke gjenbruk av
  // "menu_suggestion", selv om de to funksjonelt ligner (begge foreslår
  // andre retter til en gitt hovedrett). Grunnen: ulik payload-form
  // ({recipeId, note}[] for menu_suggestion vs. rolle-inndelte
  // eksisterende/nye forslag for meal_plan) – samme feature-navn på to
  // ulike former ville latt gamle cache-rader bli lest inn og feiltolket
  // som den nye formen uten noen kjøretids-sjekk som fanger det.
  "meal_plan",
  // "evening_curation" (Fase 5-finale, 5.9–5.11/5.14): getEveningCuration i
  // lib/actions/kitchen-intelligence.ts – strukturert vin/bord/stemning/
  // musikk(+servering) for HELE menyen under ett, brukt av
  // EveningExperience.tsx. recipeId er alltid null her (samme presedens som
  // "mood_mode" over) – gjelder en sammensatt meny, ikke én bestemt
  // oppskrift; cache-nøkkelen bærer i stedet anledning+rettene selv.
  // UTVIDET 26.08.2026 med "hvorfor?"-begrunnelser og en ordforklarings-
  // liste (se EveningCuration i kitchen-intelligence.ts) – BEVISST en RENT
  // ADDITIV utvidelse av samme feature/cache-nøkkelrom (ingen ny feature-
  // streng), i motsetning til "meal_plan" over: de nye feltene er valgfrie
  // i typen nettopp slik at eldre, allerede cachede rader (som mangler dem)
  // fortsatt kan leses trygt – UI-et skjuler bare "hvorfor?"-knappen der
  // feltet ikke finnes, i stedet for å kreve at HELE cachen tømmes.
  "evening_curation",
  // "step_timer_labels" (26.08.2026): getStepTimerLabels i
  // lib/actions/kitchen-intelligence.ts – korte, gjenkjennelige
  // tidtaker-navn ("Gryten koker") for steg med tidtaker-verdig varighet,
  // brukt av CookMode.tsx/MultiCookMode.tsx i stedet for det generiske
  // "Steg 3" når flere tidtakere kjører samtidig. Samme svar for alle
  // besøkende som ser de samme stegene → cachet per oppskrift.
  "step_timer_labels",
  // "recipe_question" (27.08.2026): answerRecipeQuestion i
  // lib/actions/kitchen-intelligence.ts – "Lurer du på noe?" på
  // oppskriftssiden, der en besøkende kan stille et fritt spørsmål om DENNE
  // oppskriften (f.eks. "kan jeg lage pannebrødet på forhånd og la det ligge
  // klart under et håndkle?") og få et konkret svar. Cache-nøkkelen bærer
  // selve (normaliserte) spørsmålsteksten – stiller en annen besøkende
  // samme spørsmål om samme oppskrift, gjenbrukes svaret direkte i stedet
  // for å betale for et nytt AI-kall.
  "recipe_question",
  // MERK: "taste_profile" er BEVISST ikke lenger her – smaksprofilen er
  // 25.08.2026 gjort om fra en cachet, live per-besøk AI-beregning til en
  // forhåndsgenerert admin-egenskap lagret direkte på oppskriften
  // (recipes.taste_profile), se generateTasteProfile i
  // lib/actions/recipes.ts. Gamle cache-rader med feature="taste_profile"
  // kan trygt ligge urørt/slettes manuelt i ai_suggestion_cache – de leses
  // ikke av noe lenger.
] as const;

export type AiCacheFeature = (typeof AI_CACHE_FEATURES)[number];

/**
 * MealSession – FASE 5 ("Experience"), se rapport til Henrik 25.08.2026.
 * ==============================================================
 *
 * RecipeSession (over) representerer ÉN RETT slik den besøkende faktisk
 * lager den. MealSession representerer HELE MÅLTIDET – flere retter satt
 * sammen til én meny (typisk forrett/hovedrett/tilbehør/dessert), med sin
 * egen vinanbefaling, kombinerte handleliste og tilberedningstidslinje.
 * Dette er BEVISST en helt egen type, ikke en utvidelse av RecipeSession –
 * de to har ulikt omfang og ulik levetid (en RecipeSession følger én
 * oppskrift over tid, en MealSession følger én planlagt anledning).
 * En MealSession kan referere til flere RecipeSessions (via slot.recipeId),
 * men eier ikke selve retts-tilstanden (porsjoner/erstatninger/Cook Mode for
 * den enkelte retten hører fortsatt hjemme i dens egen RecipeSession).
 *
 * Lagres KUN lokalt per besøkende (localStorage, samme mønster som
 * RecipeSession – se useMealSession.ts), og MUTERER ALDRI databasen: å
 * legge en oppskrift inn i en meny er ikke en redigering av oppskriften.
 */

/** Hvilken plass i måltidet en rett fyller. Bevisst flat firedeling (ikke
 * f.eks. et fritt tekstfelt) slik at UI-et kan gruppere/sortere menyen
 * konsistent uten å tolke fritekst. */
export type MealCourseRole = "starter" | "main" | "side" | "dessert";

interface MealCourseSlotBase {
  /** Stabil id for DENNE PLASSEN i menyen (ikke oppskriften) – overlever at
   * brukeren bytter ut hvilken rett som fyller plassen, slik at UI-et kan
   * beholde posisjon/fokus ved redigering/bytte. */
  id: string;
  role: MealCourseRole;
  /** Målporsjoner for DENNE retten i menysammenheng – kan bevisst avvike fra
   * de andre rettene i menyen (f.eks. en dessert eller et tilbehør lages
   * ofte i mindre porsjon enn hovedretten, selv om det er samme antall
   * gjester). Sammenlignes mot oppskriftens/forslagets egen grunn-porsjon
   * for skalering, på samme måte som RecipeSession.servings. */
  servings: number;
}

/** En plass i menyen fylt av en oppskrift som FINNES i katalogen fra før.
 * `title`/`slug` er en SNAPSHOT tatt idet retten ble lagt til menyen (for
 * umiddelbar visning uten et ekstra oppslag) – selve fasiten er alltid
 * oppskriften bak `recipeId`, på samme måte som RecipeSession aldri lagrer
 * oppskriftsinnhold, kun `recipeId`. */
export interface ExistingMealCourseSlot extends MealCourseSlotBase {
  source: "existing";
  recipeId: string;
  slug: string;
  title: string;
}

/** En plass i menyen fylt av et AI-foreslått rett-forslag som IKKE finnes i
 * katalogen ennå – ingen `recipeId`, ingen oppskriftsside å lenke til. Dette
 * er kjernen i "tydelig merking av hva som finnes fra før vs. hva som er
 * nytt" (se rapport til Henrik): UI-et kan skille de to slot-typene på
 * `source` alene, uten gjetting. */
export interface SuggestedMealCourseSlot extends MealCourseSlotBase {
  source: "suggested";
  title: string;
  /** Kort AI-generert pitch for retten – står i stedet for en oppskriftsside
   * siden det ikke finnes en ennå. */
  description: string;
  /** Satt dersom brukeren senere velger å opprette forslaget som en ekte
   * oppskrift i admin – kobler slotten til den nye oppskriften i etterkant,
   * uten å måtte bygge menyen på nytt. Null helt til det skjer. Ren
   * datamodell-støtte her; selve "opprett fra forslag"-handlingen bygges i
   * menybygger-steget (5.1–5.4). */
  convertedRecipeId: string | null;
}

export type MealCourseSlot = ExistingMealCourseSlot | SuggestedMealCourseSlot;

/** ANLEDNING (Fase 5 – Experience, 5.12). Bevisst FÅ, elegante valg (ikke
 * "20 kategorier") – valgt av brukeren selv i menybyggeren, IKKE av AI.
 * Brukes som en MYK kontekst-hint til AI-kallene (meny-generering,
 * stemning/kveld, vin) – "skal aldri overstyre brukerens faktiske valg"
 * (spesifikasjonen, 5.12), altså aldri en hard filtrering av hva brukeren
 * selv kan velge, kun en preferanse AI-en tar hensyn til. */
export type MealOccasion = "hverdag" | "fredagskveld" | "date_night" | "venner" | "feiring";

/**
 * Én instans per (mealSessionId, besøkende), lagret i localStorage under
 * nøkkelen `oppskriftsboken:meal:${id}` (se useMealSession-hooken). En
 * besøkende kan i prinsippet ha flere MealSessions samtidig (flere planlagte
 * middager) – id-et skiller dem, i motsetning til RecipeSession som er
 * nøkkelert på recipeId (kun én økt per oppskrift).
 */
export interface MealSession {
  id: string;
  /** Oppskriften menyen opprinnelig ble generert rundt (typisk hovedretten
   * brukeren sto på når "lag en meny rundt denne"-forslaget ble trigget).
   * Beholdes som referanse selv om den rollen senere byttes ut med en annen
   * rett i menybyggeren – null dersom menyen ble startet uten en bestemt
   * utgangsrett. */
  anchorRecipeId: string | null;
  /** Menyens navn, f.eks. "Middag lørdag" – redigerbar av brukeren,
   * forhåndsutfylt med et AI-foreslått navn når menyen genereres. */
  title: string;
  slots: MealCourseSlot[];
  /** Ønsket tidspunkt HELE MÅLTIDET skal være klart, "HH:mm" lokal tid.
   * Samme felt/format som RecipeSession.desiredReadyAt, men her styrer det
   * en hel-meny-tidslinje (5.8) på tvers av alle rettene i stedet for én. */
  desiredReadyAt: string | null;
  /** Valgt anledning for kvelden (5.12) – null helt til brukeren aktivt
   * velger en i menybyggeren. Påvirker AI-forslag (meny/vin/stemning), aldri
   * hvilke retter brukeren FAKTISK har valgt. */
  occasion: MealOccasion | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
