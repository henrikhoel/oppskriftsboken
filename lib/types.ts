import type { Difficulty } from "@/lib/config";
import type { NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import type { DrinkPairing } from "@/lib/kitchen-intelligence/drink-pairing";
import type { MoodId } from "@/lib/kitchen-intelligence/moods";
import type { WeeklyMenuStyleId } from "@/lib/kitchen-intelligence/weekly-menu-styles";
import type { WeekendGuestsOccasionId } from "@/lib/kitchen-intelligence/weekend-guests";
import type { MealCourseRole } from "@/lib/kitchen-intelligence/types";

/**
 * Domenetyper for oppskriftsboken. Disse speiler databaseskjemaet i
 * supabase/migrations/0001_init.sql. Feltnavn er camelCase her og
 * mappes til/fra snake_case i lib/data/mappers.ts, slik at resten av
 * appen slipper å tenke på databasens navnekonvensjon.
 */

export interface IngredientItem {
  id: string;
  /** F.eks. "200". Tom streng/undefined for "etter smak" o.l. */
  amount: string | null;
  /** F.eks. "g", "dl", "stk". */
  unit: string | null;
  /** F.eks. "rigatoni". */
  name: string;
  /** F.eks. "finhakket" eller "romtemperert". */
  note: string | null;
  sortOrder: number;
}

export interface IngredientGroup {
  id: string;
  /** F.eks. "Kjøttboller", "Saus". Null/"" for oppskrifter uten grupper. */
  title: string | null;
  sortOrder: number;
  items: IngredientItem[];
}

export interface RecipeStep {
  id: string;
  /** Gruppetittel, f.eks. "Saus", for oppskrifter med flere delsteg-sett. */
  groupTitle: string | null;
  stepNumber: number;
  text: string;
  sortOrder: number;
  /**
   * "I DETTE STEGET" i Cook Mode (07.10.2026, ønsket av Henrik: "man skal
   * ikke måtte åpne hele ingredienslisten for å sjekke mengder mens man
   * lager mat"). Admin-definerte lenker til de KONKRETE ingredienslinjene
   * (IngredientItem.id – se lib/types.ts over) dette steget faktisk bruker,
   * satt i components/admin/StepsEditor.tsx sin "Ingredienser i dette
   * steget"-avkrysningsliste.
   *
   * BEVISST id-basert, IKKE navnebasert eller tekst-/AI-tolket fra selve
   * stegteksten: samme ingrediensNAVN kan forekomme flere ganger i én
   * oppskrift med ulik mengde i ulike steg (f.eks. "20 g smør" til steking
   * og "50 g smør" i en saus) – disse må kunne pekes til HVER SIN
   * ingredienslinje, noe ren navnematching aldri kunne garantere riktig.
   *
   * Cook Mode (CookMode.tsx) slår disse id-ene opp MOT de allerede
   * skalerte/enhets-konverterte `ingredientGroups` den får inn som prop
   * (samme ferdigberegnede tall som resten av oppskriftssiden viser via
   * RecipeInteractive.tsx sin scaleAmount/convertAmountToUs) – selve mengden
   * dupliseres ALDRI her, kun hvilke linjer som hører til steget.
   *
   * Valgfritt/tom liste = ingen lenker satt (gjelder ALLE eksisterende
   * oppskrifter frem til en admin faktisk definerer dem) – Cook Mode viser
   * da ingen "I DETTE STEGET"-seksjon for steget, i stedet for å gjette.
   *
   * MERK: kun meningsfylt for den ORIGINALE, norske fremgangsmåten. Den
   * engelske AI-oversettelsen og vegetarvarianten (withSyntheticIds i
   * RecipeInteractive.tsx) får syntetiske steg-/ingrediens-id-er som aldri
   * matcher disse – "I DETTE STEGET" vises derfor ikke der (samme stille
   * fallback som for oppskrifter uten lenker satt), heller enn å vise feil
   * ingredienser.
   */
  ingredientItemIds?: string[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  /** Engelsk navn, generert med AI (eller manuelt redigert) i admin – se
   * lib/actions/categories.ts -> generateEnglishCategoryName. Null/ikke satt
   * = ingen engelsk variant ennå, bruk lib/utils/format.ts sin
   * localizedCategoryName, som faller tilbake til det norske navnet. */
  nameEn?: string | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface RecipeImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

/** Forenklet ingrediens-/steg-form uten id/sortOrder – brukt for
 * vegetarvarianten (se lib/actions/recipes.ts -> generateVegetarianVariant/
 * saveVegetarianVariant). FRA OG MED tilbakemelding 25.08.2026: IKKE lenger
 * en live AI-generering hvem som helst kan trigge på oppskriftssiden – admin
 * genererer med AI OG/ELLER skriver den selv i admin, lagres direkte på
 * oppskrift-raden (`vegetarian_variant`-kolonnen), og vises på
 * oppskriftssiden KUN dersom en variant faktisk er lagret. Samme
 * "forhåndsgenerert, ikke live"-mønster som nutritionInfo/drinkPairing. */
export interface VegetarianIngredientItem {
  amount: string | null;
  unit: string | null;
  name: string;
  note: string | null;
}

export interface VegetarianIngredientGroup {
  title: string | null;
  items: VegetarianIngredientItem[];
}

export interface VegetarianStep {
  groupTitle: string | null;
  text: string;
}

/** Selve den lagrede vegetarvarianten på en oppskrift – se
 * VegetarianIngredientGroup/VegetarianStep sin filheader over. */
export interface VegetarianVariant {
  /** Kort forklaring av hva som er byttet ut, vist når varianten vises på
   * oppskriftssiden. Skrevet av AI-en ELLER admin selv. */
  note: string;
  ingredientGroups: VegetarianIngredientGroup[];
  steps: VegetarianStep[];
}

/** Et KOMPLETT AI-generert oppskriftsutkast – brukt av "Generer resten med
 * AI"-knappen i admin-skjemaet (se generateRecipeDraft i
 * lib/actions/recipes.ts), for å fylle ut ingredienser/steg/tid/vanskelighet
 * ut fra en tittel+beskrivelse admin allerede har skrevet inn (typisk rett
 * etter "Opprett som oppskrift" fra et AI-menyforslag, se
 * components/meal/MealView.tsx). Samme "kun et forslag, IKKE lagret noe
 * sted"-mønster som VegetarianVariant-generering: admin ser over og
 * redigerer videre i skjemaet FØR faktisk lagring (ingenting skrives til
 * databasen her). Gjenbruker VegetarianIngredientGroup/VegetarianStep sin
 * identiske ingrediens-/steg-form fremfor å duplisere den. */
export interface RecipeDraft {
  ingredientGroups: VegetarianIngredientGroup[];
  steps: VegetarianStep[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  difficulty: Difficulty;
}

/** "Estimer tid og vanskelighetsgrad" (26.08.2026, ønsket av Henrik) – i
 * MOTSETNING til RecipeDraft over (som dikter opp en HEL oppskrift ut fra
 * kun tittel/beskrivelse) leser denne den oppskriften admin FAKTISK har
 * skrevet inn (ingredienser + fremgangsmåte) og estimerer tidsbruk/
 * vanskelighetsgrad ut fra det – nyttig når oppskriften er skrevet for hånd,
 * limt inn, eller importert uten at tid/vanskelighetsgrad kom med. Samme
 * "kun et forslag, IKKE lagret noe sted"-mønster: admin ser resultatet fylt
 * inn i skjemaet, og det lagres først når resten av oppskriften lagres. */
export interface RecipeTimingEstimate {
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cookTimeMinutesMax: number | null;
  difficulty: Difficulty;
}

/** "Generer tips og pass på" (27.08.2026, ønsket av Henrik) – samme
 * "les den FAKTISKE oppskriften, dikt ikke opp noe"-prinsipp som
 * RecipeTimingEstimate over. Begge felt er enkeltstrenger (ikke lister),
 * samme form som Recipe.tips/Recipe.warnings de fyller ut – admin kan
 * redigere fritt før lagring, ingenting lagres automatisk. null = AI-en
 * fant ikke noe meningsfylt å si for det feltet (skjer sjelden, men skal
 * ikke tvinge frem en tom eller generisk setning). */
export interface RecipeTipsAndWarnings {
  tips: string | null;
  warnings: string | null;
}

/** "Foreslå nye retter" (27.08.2026, ønsket av Henrik) – admin-only funksjon
 * på "Hva kan jeg lage?"-siden (se PantryMatchView.tsx). ULIK den vanlige
 * pantry-matchingen på samme side (matchRecipesToPantry i
 * lib/kitchen-intelligence/pantry-match.ts), som utelukkende finner
 * EKSISTERENDE oppskrifter som passer: dette er AI som DIKTER OPP helt nye
 * retteideer ut fra ingrediensene admin har, informert av hvilke titler som
 * allerede finnes på nettstedet (for å faktisk fylle et hull i katalogen,
 * ikke foreslå noe som ligner en oppskrift som allerede er der). Rent
 * forslag – ingenting lagres her; hver idé kan "overføres" videre til
 * opprett-oppskrift-siden via samme tittel/beskrivelse-håndtak som
 * MealView.tsx sitt "Opprett som oppskrift" allerede bruker. */
export interface NewDishSuggestion {
  title: string;
  description: string;
  /** Hvorfor denne er et godt tillegg – f.eks. at den fyller et hull i
   * kategoriene som finnes, eller bruker ingrediensene godt. Kort, 1 setning. */
  reason: string;
  /** Hvilke av ingrediensene admin oppga som denne retten faktisk bruker –
   * en delmengde av input, ikke nødvendigvis alle. */
  usesIngredients: string[];
  /** Ingredienser retten TRENGER utover det admin allerede har oppgitt –
   * f.eks. et krydder eller en sausbase som ikke stod i admin sin liste.
   * Kun NAVN (ingen mengde/enhet, AI-en dikter opp en rett, ikke faktiske
   * porsjonerte mengder) – samme "navn kun"-prinsipp som
   * PantryMatchResult.missingIngredientNames i pantry-match.ts, og brukes
   * på nøyaktig samme måte: en "Legg i handleliste"-knapp i UI-et. */
  missingIngredients: string[];
}

/** "Finn oppskrifter andre steder" (27.08.2026, ønsket av Henrik) –
 * admin-only, samme sted i UI-et som NewDishSuggestion over
 * (PantryMatchView.tsx), men ULIK på et avgjørende punkt: dette dikter
 * IKKE opp noe. Bruker Anthropics EKTE, hostede web-søk-verktøy (se
 * callClaudeWebSearchJSON i lib/ai/anthropic.ts og
 * findExternalRecipeMatches i lib/actions/ai.ts) til å finne EKSISTERENDE
 * oppskrifter på andre, kjente norske matsider som passer ingrediensene
 * admin har – hver url er et faktisk, verifisert treff modellen selv fant
 * via søk (begrenset til en kuratert liste kjente nettsteder), ikke noe
 * den husker eller gjetter seg til. */
export interface ExternalRecipeMatch {
  title: string;
  url: string;
  /** F.eks. "Matprat", "Godt.no" – vist som kildemerking i UI-et. */
  siteName: string;
  /** Kort forklaring på hvorfor/hvordan den passer ingrediensene, maks 1 setning. */
  note: string;
  /** Ingredienser DEN EKTE oppskriften bruker, utover det admin allerede
   * oppga – lest ut av søketreffet AI-en fant (best innsats, kan være tom
   * dersom AI-en ikke fikk nok av oppskriftens faktiske innhold fra
   * søket). Samme "navn kun"-prinsipp og samme "Legg i handleliste"-bruk
   * som NewDishSuggestion.missingIngredients over. */
  missingIngredients: string[];
}

/** "Forslag til forbedring" (27.08.2026, ønsket av Henrik – idé som kom av
 * å importere en oppskrift fra Tine.no via "Importer fra lenke", men
 * gjelder like gjerne en helt håndskrevet oppskrift) – admin-only, i
 * RecipeForm.tsx. AI leser gjennom oppskriften slik den FAKTISK står nå
 * (ingredienser + fremgangsmåte, samme grunnlag som
 * RecipeTimingEstimate/estimateRecipeTiming over) og foreslår konkrete
 * forbedringer. Rent forslag, samme "kun et forslag, IKKE lagret noe
 * sted"-mønster som resten av admin-AI-funksjonene i skjemaet – endrer
 * ALDRI skjemaet selv, admin leser og bestemmer selv hva som eventuelt
 * skal endres for hånd. */
export interface RecipeImprovementSuggestion {
  /** Ingredienser som kunne løftet retten – f.eks. et krydder eller en
   * finish som mangler. Tom liste er et gyldig svar (oppskriften er god
   * som den er). */
  ingredientAdditions: { name: string; reason: string }[];
  /** Konkrete endringer i fremgangsmåten/teknikken – f.eks. rekkefølge,
   * temperatur, hviletid. */
  methodImprovements: string[];
  /** Annet – smaksbalanse, presentasjon, holdbarhet og lignende som ikke
   * naturlig hører til de to over. */
  otherTips: string[];
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Forhåndsgenerert engelsk tittel/beskrivelse (admin -> "Generer med AI",
   * se lib/actions/recipes.ts -> generateEnglishTitleDescription). Null =
   * ingen engelsk variant lagret ennå – bruk lib/utils/format.ts sine
   * localizedTitle/localizedDescription, som faller tilbake til den norske
   * originalen. IKKE det samme som den fulle, live AI-oversettelsen på
   * selve oppskriftssiden (ingredienser/steg) – den er uendret. Valgfrie
   * felt (ikke satt på demo-oppskriftene i lib/demo-data/recipes.ts, som
   * ikke går via databasen). */
  titleEn?: string | null;
  descriptionEn?: string | null;
  /** Admin-satt styrkegrad for sterk mat – 1 (mild), 2 (medium) eller 3
   * (sterk), satt fra "Sterk mat"-avkrysningsboksen + ord-velgeren i
   * components/admin/RecipeForm.tsx, lagret direkte på oppskrift-raden
   * (recipes.spice_level) – migrasjon 0028. Null/undefined = ikke
   * sterk/ikke satt (vis da INGEN sterkhets-badge). Vist på
   * oppskriftssiden som fargetone-tekst (grønn/oransj/rød, se
   * SPICE_LEVEL_LABELS/SPICE_LEVEL_CLASSES i lib/config.ts) – IKKE lenger
   * håndtegnede chili-ikoner (fjernet 03.10.2026, se git-historikken for
   * components/ui/icons.tsx). Erstatter (03.10.2026, Henrik: "jeg tror vi
   * kan fjerne 'smaksprofil' den gir ingenting") den tidligere AI-
   * genererte "spicy"-dimensjonen i den nå fjernede smaksprofilen
   * (recipes.taste_profile, se MERK-kommentaren i lib/actions/recipes.ts)
   * – et enkelt, pålitelig admin-valg i stedet for en AI-gjetning. Samme
   * "eksplisitt admin-kategori fremfor AI-gjetting"-begrunnelse som
   * moods/courses/isVegetarian over. */
  spiceLevel?: number | null;
  /** Forhåndsgenerert kalori-/makro-oversikt (admin -> "Generer
   * næringsinnhold", se lib/actions/recipes.ts -> generateNutritionInfo).
   * Null/undefined = ikke generert ennå – vis da INGEN "vis
   * næringsinnhold"-knapp på oppskriftssiden. Samme "valgfritt, ikke satt i
   * demo-data"-mønster som titleEn/descriptionEn over. */
  nutritionInfo?: NutritionInfo | null;
  /** Forhåndsgenerert drikkeforslag – vin/øl/alkoholfritt (admin -> "Generer
   * drikkeforslag", se lib/actions/recipes.ts -> generateDrinkPairing).
   * Flyttet 11.09.2026 fra en live, cachet per-besøk AI-beregning – se
   * lib/kitchen-intelligence/drink-pairing.ts sin filheader. Null/undefined
   * = ikke generert ennå – vis da INGEN "DRIKKE TIL"-knapp/-seksjon på
   * oppskriftssiden (samme "valgfritt, ikke satt i demo-data"-mønster som
   * nutritionInfo over). "Passer denne?" (skriv inn/fotografer egen vin) er
   * UPÅVIRKET av dette feltet – den forblir en live AI-sjekk hver gang, se
   * DrinkPairingSection.tsx. */
  drinkPairing?: DrinkPairing | null;
  /** Forhåndslagret vegetarversjon (admin -> "Generer med AI" og/eller
   * håndredigert selv, se lib/actions/recipes.ts ->
   * generateVegetarianVariant/saveVegetarianVariant). Null/undefined = ingen
   * variant lagret ennå – vis da INGEN "ønsker du en vegetarversjon?"-knapp
   * på oppskriftssiden (i motsetning til tidligere, hvor knappen alltid
   * viste og genererte live for enhver besøkende). Samme "valgfritt, ikke
   * satt i demo-data"-mønster som spiceLevel/nutritionInfo over. */
  vegetarianVariant?: VegetarianVariant | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  /** true = hovedbildet ble generert av AI i admin, ikke et ekte opplastet foto. */
  heroImageIsAiGenerated: boolean;
  images: RecipeImage[];
  category: Category | null;
  tags: Tag[];
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  /** Valgfri ØVRE grense for tilberedningstid (admin skrev f.eks. "5-7" i
   * stedet for bare "5") – for å vise et intervall som "5-7 min". Null/
   * undefined = ikke satt, vis kun cookTimeMinutes som ett tall (som før).
   * cookTimeMinutes selv er fortsatt eneste feltet som brukes i schema.org/
   * beregninger – dette er rent presentasjon. Valgfritt, ikke satt i
   * demo-data, samme mønster som spiceLevel/nutritionInfo over. */
  cookTimeMinutesMax?: number | null;
  totalTimeMinutes: number | null;
  difficulty: Difficulty;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  notes: string | null;
  tips: string | null;
  /** Kort "pass på"-notis (admin skriver for hånd, eller "Generer med AI",
   * se lib/actions/recipes.ts -> generateRecipeTipsAndWarnings), vist
   * sammen med tips over på oppskriftssiden – migrasjon 0015. Valgfritt,
   * ikke satt i demo-data, samme "ikke touch alle demo-oppskrifter for et
   * nytt felt"-mønster som titleEn/spiceLevel/nutritionInfo lenger opp i
   * dette interfacet. */
  warnings?: string | null;
  /** Admin-satte "humør"-kategorier for forsidens "Hva passer humøret
   * ditt?" (styrt fra /admin/humor, se MoodPicker.tsx) – migrasjon 0020.
   * En oppskrift kan stå i FLERE humør samtidig (26.09.2026, Henrik:
   * "viktig at hver rett kan ligge inne i flere enn ett humør"), derfor en
   * liste, ikke ett enkelt felt. Tom liste/valgfritt = ikke valgt, dukker
   * da ikke opp under noen stemning – helt bevisst (Henrik: "hvis jeg ikke
   * velger en, så dukker den heller ikke opp på noen av dem"). Erstatter
   * den tidligere AI-baserte matchingen fullstendig. Valgfritt her av
   * samme grunn som warnings over (ikke satt i demo-data) – ikke fordi
   * listen kan mangle i en ekte, lagret oppskrift (den er NOT NULL DEFAULT
   * '{}' i databasen).
   */
  moods?: MoodId[];
  /** Admin-satte menyroller (forrett/hovedrett/tilbehør/dessert, se
   * MealCourseRole i lib/kitchen-intelligence/types.ts) – satt fra
   * /admin/roller (se RolePicker.tsx) – migrasjon 0022. Bygget 27.09.2026
   * som en direkte parallell til moods over, etter ønske fra Henrik: "da
   * må dette også være noe jeg som admin kan velge, på lik måte som
   * humør... og her også kan det jo hende at flere passer i flere
   * kategorier, så samme utforming som humør tror jeg er bra her". En
   * oppskrift kan stå i FLERE roller samtidig (f.eks. en salat som både
   * forrett og tilbehør), derfor en liste. Tom liste/valgfritt = ikke
   * plassert i noen rolle ennå.
   *
   * Brukt av menybyggeren (MealBuilder.tsx, "Gjør det til en kveld",
   * generateMealPlan/regenerateMealPlanCourse i
   * lib/actions/kitchen-intelligence.ts) som en HARD begrensning
   * (03.10.2026, Henrik: "roller må bli brukt på menybyggeren inne på
   * oppskriften også, sånn at man ikke får dessert til forrett feks") – en
   * rolletagget oppskrift kan KUN foreslås til én av sine egne roller.
   * Utagget (tom liste) er IKKE begrenset – kan fortsatt foreslås til
   * hvilken som helst rolle, basert på AI-ens egen vurdering. Valgfritt
   * her av samme grunn som moods (ikke satt i demo-data) – ikke fordi
   * listen kan mangle i en ekte, lagret oppskrift (NOT NULL DEFAULT '{}' i
   * databasen). Helt separat fra inferCourseRoleFromCategory
   * (meal-session.ts), som fortsatt brukes uendret for å avgjøre
   * ANKERRETTENS egen rolle.
   *
   * (03.10.2026) Ble tidligere også brukt til å filtrere velgeren i den
   * manuelle menybyggeren (components/meal/ManualMealBuilder.tsx), som nå
   * er fjernet.
   */
  courses?: MealCourseRole[];
  source: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  /** Om "Passer denne?" (BeverageMatchChecker) skal vises på
   * oppskriftssiden – lagt til 11.09.2026, se migrasjon 0018. Default true.
   * Uavhengig av drinkPairing (kan ha forhåndsgenererte forslag men likevel
   * skjult sjekker, og omvendt). */
  showBeverageMatchChecker: boolean;
  /** Om "Gjør det til en kveld" (MealBuilder-seksjonen) skal vises på
   * oppskriftssiden – lagt til 11.09.2026, se migrasjon 0018. Default true.
   * Skrus av for oppskrifter som ikke gir mening som anker for en hel meny
   * (f.eks. cookies, rundstykker). */
  showMealBuilder: boolean;
  /** Admin-satt rekkefølge for "ukens utvalg" på forsiden, satt fra
   * /admin/utvalg. Null = ikke i utvalget, kun meningsfylt sammen med
   * isFeatured=true. Helt atskilt fra favoritedByAdmin under (hjertet). */
  featuredSortOrder: number | null;
  favoritedByAdmin: boolean;
  /** true = denne oppskriften skal ALDRI trekkes ut i den automatiske
   * man–fre-ukesmenyen (/ukesmeny) – se migrasjon 0024. Styres fra
   * /admin/ukesmeny. Standard false (å utelate er unntaket, ikke
   * normalen). */
  weeklyMenuExcluded: boolean;
  /** Admin-satte "ukesmeny-stil"-kategorier (Sunt og enkelt/Rask
   * uke/Familievennlig/Litt ekstra), se migrasjon 0025. Styres fra
   * /admin/ukesmeny. En oppskrift kan stå i flere stiler samtidig, samme
   * mønster som moods/courses over. Tom liste/valgfritt = ingen spesifikk
   * stil satt (oppskriften dukker da kun opp under "Variert", som ikke
   * filtrerer på dette feltet). Valgfritt her av samme grunn som
   * moods/courses (ikke satt i demo-data). */
  weeklyMenuStyles?: WeeklyMenuStyleId[];
  /** true = oppskriften er vegetar – admin-satt bryter, se migrasjon
   * 0027. Styres fra /admin/ukesmeny (samme rad som "utelatt"/stilene),
   * brukt av "Kun vegetar"-filteret på selve /ukesmeny (WeeklyMenuView.tsx,
   * 01.10.2026, Henrik: "på ukesmeny bør man egentlig ha en knapp 'Kun
   * vegetar'"). Standard false – admin krysser aktivt av de vegetar-
   * oppskriftene som faktisk finnes, samme "eksplisitt admin-kategori
   * fremfor AI-gjetting/fri tekst"-begrunnelse som moods/courses/
   * weeklyMenuStyles (se filheaderen i lib/kitchen-intelligence/moods.ts
   * for hvorfor upålitelig fritekst-/AI-matching tidligere ble forkastet
   * for akkurat denne typen kategorisering). */
  isVegetarian: boolean;
  /** Admin-satt av/på-bryter for den kuraterte "Helg & gjester"-siden
   * (/helg-og-gjester) – migrasjon 0030. Styres fra /admin/helg-og-gjester
   * (se WeekendGuestsAdminPicker.tsx). Standard false (opt-in) – Henrik
   * merker aktivt de oppskriftene han vil ha med, samme
   * "eksplisitt admin-kategori"-begrunnelse som isVegetarian/moods/courses.
   * Bevisst UKOBLET fra weeklyMenuExcluded og showMealBuilder (Henrik:
   * "Ikke koble dette automatisk til Ukesmeny... Ikke koble Helg & gjester
   * teknisk til 'Gjør det til en kveld'. Jeg styrer selv begge
   * togglene") – en oppskrift kan ha enhver kombinasjon av disse tre. */
  weekendGuests: boolean;
  /** Admin-satte "Helg & gjester"-anledninger (Fredagskveld/Date night/
   * Venner på middag/Familie/Feiring), se WEEKEND_GUESTS_OCCASION_DEFINITIONS
   * i lib/kitchen-intelligence/weekend-guests.ts – migrasjon 0030. En
   * oppskrift kan stå i flere anledninger samtidig, samme mønster som
   * moods/courses/weeklyMenuStyles over. Tom liste/valgfritt = kun med
   * under "Alle" på /helg-og-gjester, ikke under noen spesifikk anledning.
   * Valgfritt her av samme grunn som weeklyMenuStyles (ikke satt i
   * demo-data). */
  weekendGuestsOccasions?: WeekendGuestsOccasionId[];
  /** Sum av alle stjernevurderinger (1-5). Snitt = ratingSum / ratingCount. */
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  /** Admin-styrt visningsrekkefølge for KUN /oppskrifter og "Nyeste
   * oppskrifter" på forsiden – satt fra "Miks rekkefølgen"-knappen
   * (components/admin/ShuffleOrderButton.tsx), se migrasjon 0029 sin
   * filheader for hele bakgrunnen og hvorfor IKKE created_at gjenbrukes.
   * Høyere tall vises først. Valgfri av samme "ikke satt i demo-data"-
   * grunn som weeklyMenuStyles over – kun populert via mapRecipeListRow
   * (listevisninger), ikke mapRecipeRow (selve oppskriftssiden trenger
   * den ikke). */
  displayOrder?: number;
}

/** Lettvekts-variant brukt i kort/lister der vi ikke trenger hele oppskriften. */
export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "titleEn"
  | "descriptionEn"
  | "heroImageUrl"
  | "heroImageAlt"
  | "category"
  | "tags"
  | "totalTimeMinutes"
  | "difficulty"
  // Lagt til 03.10.2026 slik at kort/lister (ikke bare selve
  // oppskriftssiden) kan vise en liten sterkhets-badge – se spiceLevel sin
  // filheader lenger opp.
  | "spiceLevel"
  | "isFeatured"
  | "featuredSortOrder"
  | "favoritedByAdmin"
  | "weeklyMenuExcluded"
  | "weeklyMenuStyles"
  | "isVegetarian"
  | "moods"
  | "courses"
  | "weekendGuests"
  | "weekendGuestsOccasions"
  | "createdAt"
  | "isPublished"
  | "ratingSum"
  | "ratingCount"
  | "displayOrder"
  // Lagt til 27.08.2026 for "Hva skal vi spise?"
  // (lib/kitchen-intelligence/what-to-eat.ts) sin gjeste-nærhet-bonus –
  // ren utvidelse av Pick-lista, INGEN ny migrasjon eller spørring
  // (servings ligger allerede i RECIPE_SELECT/mapRecipeRow, kun
  // toSummary() i lib/data/mappers.ts trimmet den bort før).
  | "servings"
>;

export interface RecipeFilters {
  query?: string;
  categorySlug?: string;
  difficulty?: Difficulty;
  maxTotalTime?: number;
  favoritesOnly?: boolean;
  ingredient?: string;
  /** Humør-filter på /oppskrifter (03.10.2026, Henrik: "legg inn humør som
   * en filter inne på Alle oppskrifter") – samme admin-satte
   * recipes.moods-feltet som den fristilte "Hva passer humøret ditt?"-
   * seksjonen på forsiden (MoodModeSection.tsx) alt filtrerer deterministisk
   * på, se filterRecipes i lib/utils/search.ts. Forhåndsutfylles fra
   * URL-en (?mood=<id>) i BrowseRecipesClient.tsx, slik at "Se alle →" fra
   * forsiden kan lenke rett inn hit med riktig humør allerede valgt. */
  mood?: MoodId;
}

/** Presis sporbarhet til ÉN oppskrift-bidrag på en handlelistelinje (Fase 5
 * – Experience, 5.7 – "kombinert handleliste"). Et TILLEGG til
 * fromRecipes (under), ikke en erstatning – se ShoppingListEntry.sources. */
export interface ShoppingListSourceRef {
  recipeId: string;
  slug: string;
  /** Porsjoner denne linjen ble skalert for ved akkurat dette bidraget –
   * null hvis ukjent. */
  servings: number | null;
}

export interface ShoppingListEntry {
  id: string;
  amount: number | null;
  /** Uskalert, opprinnelig tekstmengde – brukt når amount ikke kan parses. */
  displayAmount: string | null;
  /** KJØPSNORMALISERING v2 (05.10.2026) – spesifikasjonens intervall-regel
   * (§«Mengder, enheter og ukjent behov»: et intervall som «1–2 ts» skal
   * ALDRI kollapses til et gjennomsnitt/midtpunkt, verken i beregning eller
   * visning). `amount` må likevel være et vanlig tall for at eksisterende
   * sammenslåings-/avrundingslogikk (kryss-enhet, avhukings-ceil osv.)
   * fortsatt skal fungere uendret – `rawIntervalText` er DERFOR et rent
   * VISNINGS-unntak: satt til den ORIGINALE fritekst-mengden («1-2», «8-10»)
   * KUN så lenge linjen fortsatt har ETT bidrag fra ÉN oppskrift. Den
   * fjernes (settes til null) i det øyeblikket en ANNEN oppskrift slår seg
   * sammen med linjen (se mergeIngredientsIntoList), siden spesifikasjonen
   * ikke tester eller definerer hvordan to ulike intervaller skal vises
   * slått sammen – linjen faller da tilbake til det eksisterende, allerede
   * godkjente tallsummerings-visningen (se formatShoppingAmount). VALGFRITT
   * felt, samme mønster som note/sources over. */
  rawIntervalText?: string | null;
  unit: string | null;
  name: string;
  checked: boolean;
  /** Hvilke oppskrifter denne linjen stammer fra, for sporbarhet i UI. */
  fromRecipes: string[];
  /** Samme sporbarhet som fromRecipes, men strukturert (id/slug/porsjoner i
   * stedet for kun tittel-tekst) – lagt til 25.08.2026 for menyens
   * "kombinerte handleliste" (se lib/actions/meal-shopping-list.ts), som
   * trenger å vite NØYAKTIG hvilken rett og hvor mange porsjoner hver
   * ingrediens kommer fra. VALGFRITT felt: handlelister lagret FØR dette
   * feltet fantes mangler det rett og slett (ikke en tom liste) – all
   * lesing av det gjøres derfor alltid som `entry.sources ?? []`, og
   * fromRecipes forblir den ene, uendrede kilden UI-et viser frem. */
  sources?: ShoppingListSourceRef[];
  /** Kun for varer der ingrediensnotatet faktisk er en KJØPS-tips (f.eks.
   * "en fyldig, rimelig rødvin" på rødvin), ikke en tilberedningsinstruks
   * ("finhakket", "romtemperert") – se isBuyingTipWorthKeeping i
   * lib/utils/shopping-list.ts for det avgjørende skillet. VALGFRITT felt,
   * samme mønster som sources over. */
  note?: string | null;
  /** KJØPSNORMALISERING v2 (05.10.2026, Henriks produktgodkjente spesifikasjon
   * `shopping-list-purchase-normalization-spec.md` v1.0) – strukturert
   * tilstand for linjer som er styrt av registeret i
   * lib/utils/purchase-registry-data.ts, se lib/utils/purchase-engine.ts.
   * VALGFRITT felt, samme mønster som sources/note over: linjer lagret før
   * dette feltet fantes, eller linjer som ikke traff noen regel i
   * registeret, mangler det rett og slett.
   *
   * `events`/`garlicTotals` holder RÅ delressurser (ikke avrundede tall) slik
   * at S/E (sitron/lime/appelsin, egg) kan avrundes PER oppskriftshendelse/
   * faktisk tilberedningsøkt FØR kjøpsantallene summeres (spesifikasjonens
   * absolutte krav – aldri ceil(sum(...)) over flere middager), og slik at G
   * (hvitløk) kan summere fedd globalt før én avsluttende ceil. `entry.amount`
   * er alltid det FERDIG utregnede, avrundede kjøpsantallet – selve
   * delressursene ligger kun her, til etterprøving/fremtidig rekalkulering. */
  purchaseMeta?: ShoppingListPurchaseMeta;
}

/** Se ShoppingListEntry.purchaseMeta over. */
export interface ShoppingListPurchaseMeta {
  purchaseId: string;
  ruleId: "S" | "G" | "E" | "W" | "KEEP";
  ruleVersion: "1.0.0";
  /** Satt når linjen (eller en delressurs av den) ikke kunne tolkes trygt –
   * se lib/utils/purchase-engine.ts sine `ResolvedPurchaseLine["reviewReason"]`
   * -koder. Linjen MÅ da fortsatt vise det opprinnelige oppskriftsbehovet
   * uendret (se displayAmount/fromRecipes) – reviewReason er bare et flagg,
   * aldri en destruktiv omskriving. */
  reviewReason?: string;
  /** Sitron/lime/appelsin (S) og egg (E) – én oppføring per
   * oppskriftshendelse/faktiske tilberedningsøkt (= én kall til
   * mergeIngredientsIntoList i dag), se §sharingGroup. */
  events?: ShoppingListPurchaseEvent[];
  /** Hvitløk (G) – fedd/hele løk summeres GLOBALT (ikke per hendelse), se
   * G-seksjonen. Lagret som enkle tall (øvre grense av evt. intervall/ukjent
   * er allerede lagt inn før lagring – selve rå-sporingen for S/E over er
   * mer detaljert fordi de har en ekte per-hendelse-avgrensning å bevare). */
  garlicTotals?: { reservedWholeHeads: number; totalCloves: number; anyUnknown: boolean };
}

export interface ShoppingListPurchaseEvent {
  eventId: string;
  recipeTitle: string;
  /** Sitron/lime/appelsin: W/Jfruit/Jml/Zfruit/Zml/Bfruit. Egg: whole/yolk/white. */
  buckets: Record<string, { low: number; high: number; unknown: boolean }>;
}

/**
 * "HVORDAN GJØR JEG DET?" – CONVITEs kunnskapsbibliotek for praktiske
 * kjøkkenteknikker og problemløsning (koke poteter, lage roux, redde en
 * skilt saus osv.), bygget 27.08.2026. Se supabase/migrations/0013_knowledge_guides.sql
 * for skjemaet disse typene speiler, og lib/data/guides.ts for lesing.
 *
 * Egen type-familie fra Recipe/RecipeStep over med vilje – en guide er IKKE
 * en oppskrift (ingen ingrediensliste, ingen porsjoner), selv om formen
 * (kort svar → nummererte steg → tips/pass på → relatert) er bevisst
 * gjenkjennelig fra oppskriftssiden.
 */
export interface GuideCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  sortOrder: number;
}

export interface GuideStep {
  id: string;
  stepNumber: number;
  text: string;
  textEn: string | null;
  /** Kort tilleggsnotat til DETTE steget – ikke det samme som guidens egne
   * tips/warnings (de gjelder guiden som helhet). */
  note: string | null;
  noteEn: string | null;
  /** Varighet i minutter, dersom steget har en naturlig tidtaker (f.eks.
   * "la det syde i 12 min") – lar UI-et tilby en "start timer"-knapp.
   * Null = ingen tidtaker-affordance for dette steget. Tenkt gjenbrukt mot
   * samme tidtaker-infrastruktur som Cook Mode (se
   * lib/hooks/useCookModeTimers.ts) den dagen guider vises inne i Cook
   * Mode – se punkt 15/16 i spesifikasjonen. */
  durationMinutes: number | null;
  /** Fri tekst, IKKE alltid et rent tall ("180°C", "middels varme"). */
  temperature: string | null;
  sortOrder: number;
}

/** Kompakt form av en relatert guide, brukt i Guide.relatedGuides – akkurat
 * nok til å vise/lenke et "Relatert"-kort uten et ekstra oppslag. */
export interface GuideRelatedSummary {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  category: GuideCategory | null;
  difficulty: Difficulty;
  estimatedTimeMinutes: number | null;
  estimatedTimeMinutesMax: number | null;
}

/** Full guide, inkl. steg og relaterte guider – det GuideContent.tsx tar
 * imot for å rendre hele guide-siden (og senere en Cook Mode-sheet, se
 * filheaderen til GuideContent.tsx). */
export interface Guide {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  /** Kort intro/underoverskrift – IKKE steg-teksten. */
  intro: string;
  introEn: string | null;
  /** "Kort svar"-linjer, vist FØR selve stegene (spesifikasjon punkt 11).
   * Tom liste = ingen quick answer for denne guiden. */
  quickAnswerLines: string[];
  quickAnswerLinesEn: string[];
  category: GuideCategory | null;
  difficulty: Difficulty;
  estimatedTimeMinutes: number | null;
  estimatedTimeMinutesMax: number | null;
  steps: GuideStep[];
  tips: string[];
  tipsEn: string[];
  warnings: string[];
  warningsEn: string[];
  /** Frie søkefraser ("vannete saus") – se search_knowledge_guides i
   * migrasjon 0013 for hvordan disse vektes i søket. */
  searchTerms: string[];
  searchTermsEn: string[];
  /** Alias/synonymer for selve begrepet ("roux" osv.) – vektet høyere enn
   * searchTerms i søket, se samme funksjon. */
  aliases: string[];
  aliasesEn: string[];
  relatedGuides: GuideRelatedSummary[];
  isPublished: boolean;
  /** Se knowledge_guides.is_demo i migrasjonen – kun en synlig
   * admin-merkelapp for de få seed-/placeholder-guidene, påvirker aldri
   * vanlig visning. */
  isDemo: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Lett vekt av Guide til lister (landingsside, kategorisider,
 * admin-oversikt) – uten steg/relaterte guider. */
export type GuideSummary = Pick<
  Guide,
  | "id"
  | "slug"
  | "title"
  | "titleEn"
  | "intro"
  | "introEn"
  | "category"
  | "difficulty"
  | "estimatedTimeMinutes"
  | "estimatedTimeMinutesMax"
  | "isPublished"
  | "isDemo"
>;

/** Ett søketreff – GuideSummary-felter pluss databasens beregnede
 * relevans-rangering (kun brukt til sortering, aldri vist i UI-et). Se
 * search_knowledge_guides i migrasjon 0013. */
export interface GuideSearchResult extends GuideSummary {
  rank: number;
}

/**
 * "I sesong" – CONVITEs redaksjonelle sesonglag (se
 * supabase/migrations/0014_seasons.sql). EGEN tabell fra alt annet
 * innhold, samme begrunnelse som guide_categories/knowledge_guides i
 * lib/types.ts sin egen filheader over: en sesong er ikke en
 * oppskrift-kategori og ikke en guide – den er en tidsperiode
 * ("SENSOMMER") med en fast, håndskrevet introtekst og en liste råvarer
 * som er gode akkurat i den perioden.
 *
 * `months` er de kalendermånedene (1-12) sesongen "eier" for spørsmålet
 * "hvilken sesong er det NÅ" – se resolveCurrentSeason() i
 * lib/kitchen-intelligence/seasonal.ts. De 6 sesongene bør til sammen
 * partisjonere alle 12 månedene (ingen overlapp SEG IMELLOM), men enkelt-
 * råvarer (SeasonalIngredient) kan likevel ha egne, snevrere eller bredere
 * topp-vinduer enn sesongen de tilhører – se SeasonalIngredient under for
 * hvorfor dette er to atskilte tidsbegreper.
 */
export interface Season {
  id: string;
  slug: string;
  nameNo: string;
  nameEn: string | null;
  /** Kalendermåneder (1-12) denne sesongen dekker. Kan pakke rundt
   * årsskiftet (f.eks. vinter: [12, 1, 2]) – rekkefølgen i arrayet spiller
   * ingen rolle, kun medlemskap sjekkes. */
  months: number[];
  introNo: string;
  introEn: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Kulinarisk/biologisk type – brukt til søk/filtrering og til å avgjøre
 * standardgruppering. IKKE nødvendigvis det samme som `IngredientOriginGroup`
 * under (f.eks. er både ville blåbær og dyrkede jordbær kategorien "berry",
 * men hører hjemme i to ulike visningsgrupper).
 */
export type IngredientCategory =
  | "vegetable"
  | "fruit"
  | "berry"
  | "herb"
  | "mushroom"
  | "fish"
  | "shellfish"
  | "game"
  | "meat";

/** Redaksjonell visningsgruppe på sesongsidene ("FRA HAVET" osv, se
 * spesifikasjonens punkt 5/38) – et EGET felt fra `category` over, ikke
 * utledet fra den, fordi kategori alene ikke forteller om f.eks. et bær er
 * viltvoksende (skogen) eller dyrket (hagen). Kun gruppene som faktisk har
 * innhold i en gitt sesong vises – se resolveIngredientsForSeasonPage() i
 * lib/kitchen-intelligence/seasonal.ts. */
export type IngredientOriginGroup = "havet" | "skogen" | "jorda" | "hagen" | "beite";

/** Norsk vs importert (spesifikasjonens punkt 6) – CONVITE skal aldri
 * fremstille en importert råvare (f.eks. blodappelsin) som norsk, selv om
 * den er en reell og relevant vintersesong-råvare kulinarisk. */
export type IngredientOrigin = "norwegian" | "imported";

/**
 * Én råvare som er god i en gitt sesong – oppgradert 28.08.2026 (ønsket av
 * Henrik: "gjør 'I sesong' til en komplett, kildebasert og elegant
 * råvareguide") til å skille tre atskilte tidsbegreper i stedet for bare
 * ett vindu:
 *
 *   TILGJENGELIG  (availableStart/EndMonth) – bredest. Råvaren finnes/kan
 *                 skaffes i denne perioden, men er ikke nødvendigvis
 *                 kulinarisk interessant hele tiden (f.eks. blåskjell).
 *   SESONG        (seasonStart/EndMonth) – den naturlige/relevante perioden
 *                 CONVITE faktisk fremhever råvaren i. `null`/`null` her
 *                 betyr "bruk foreldre-sesongens `months`" (samme fallback-
 *                 prinsipp som peak alltid har hatt), og gjør at råvaren KUN
 *                 vises på sin egen hjemme-sesongside. Sette et EKSPLISITT
 *                 vindu her (som kan strekke seg utover én sesongs `months`)
 *                 er det som lar samme råvare dukke opp på FLERE
 *                 sesongsider – se ingredientAppliesToSeasonPage() i
 *                 lib/kitchen-intelligence/seasonal.ts.
 *   PEAK          (peakStart/EndMonth) – smalest, kulinarisk høydepunkt.
 *                 `null`/`null` = ingen dedikert peak, råvaren får ALDRI
 *                 "PÅ SITT BESTE NÅ"-merket (bevisst konservativt, se
 *                 spesifikasjonens punkt 34 – merket skal faktisk bety noe).
 *
 * Disse er ALDRI det samme begrepet, se spesifikasjonens punkt 2: en
 * råvare kan være tilgjengelig uten å være i sesong, og i sesong uten å
 * være på sitt beste.
 *
 * `descriptionNo`/`descriptionEn` er den KORTE, alltid synlige teksten
 * (vises kun på selve råvaresiden, aldri i oversiktslisten – progressive
 * disclosure, se spesifikasjonens punkt 1). `seasonNoteNo`/`seasonNoteEn`
 * er en lengre, kildebasert forklaring på HVORFOR (spesifikasjonens punkt
 * 18/24) – også kun på råvaresiden.
 *
 * `sourceName`/`sourceUrl`/`sourceNote`/`verifiedAt` lagrer kildegrunnlaget
 * strukturert (spesifikasjonens punkt 36) i stedet for at det blir
 * hardkodede tekster ingen vet opphavet til om noen år.
 *
 * `aliases` brukes til normalisert substring-matching mot
 * oppskrift-ingrediensenes frie tekstnavn (samme mønster som
 * ingredientMatches() i lib/kitchen-intelligence/pantry-match.ts) OG mot
 * råvaresøket – se lib/kitchen-intelligence/seasonal.ts.
 */
export interface SeasonalIngredient {
  id: string;
  /** "Hjemme-sesongen" – styrer hvor råvaren organiseres i admin, og er
   * fallback-vinduet når seasonStartMonth/seasonEndMonth ikke er satt. IKKE
   * lenger den ENESTE sesongsiden råvaren kan vises på, se filheaderen. */
  seasonId: string;
  slug: string;
  nameNo: string;
  nameEn: string | null;
  aliases: string[];
  category: IngredientCategory;
  originGroup: IngredientOriginGroup;
  origin: IngredientOrigin;
  availableStartMonth: number | null;
  availableEndMonth: number | null;
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
  peakStartMonth: number | null;
  peakEndMonth: number | null;
  descriptionNo: string | null;
  descriptionEn: string | null;
  seasonNoteNo: string | null;
  seasonNoteEn: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  verifiedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Én sesong med sine "hjemme"-råvarer embeddet – det datalaget faktisk
 * henter for admin og som byggesteinen for "akkurat nå"-motoren (se
 * lib/data/seasons.ts). Merk at en sesongSIDE i praksis kan vise FLERE
 * råvarer enn kun `ingredients` under, dersom nabo-råvarer har et eget
 * seasonStart/EndMonth som overlapper denne sesongens `months` – se
 * resolveIngredientsForSeasonPage() i lib/kitchen-intelligence/seasonal.ts. */
export interface SeasonWithIngredients extends Season {
  ingredients: SeasonalIngredient[];
}
