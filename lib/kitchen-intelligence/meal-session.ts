import type {
  ExistingMealCourseSlot,
  MealCourseRole,
  MealCourseSlot,
  MealOccasion,
  MealSession,
  SuggestedMealCourseSlot,
} from "@/lib/kitchen-intelligence/types";
import { generateId } from "@/lib/utils/id";

/**
 * REN, DETERMINISTISK LOGIKK for MealSession – se filheaderen i types.ts for
 * hva en MealSession er/ikke er. Samme prinsipp som session.ts (RecipeSession
 * sin logikk): ingen AI-kall, ingen databasetilgang, kun regning/
 * transformasjon av allerede-kjent data, slik at den kan kalles synkront fra
 * render eller fra en hook uten egen loading-tilstand.
 *
 * Selve AI-genereringen av HVILKE retter som bør inngå i menyen (5.1–5.4)
 * hører hjemme i en egen server action (bygges i menybygger-steget) – denne
 * filen tar kun imot FERDIGE forslag/oppskrifter og setter dem inn i
 * strukturen, på samme måte som session.ts sine with*-funksjoner tar imot
 * et allerede AI-generert erstatningsforslag.
 */

/** Ny, tom meny – utgangspunktet før menybyggeren har lagt til noen retter.
 * `anchorRecipeId` er null her; menybyggeren setter den når menyen faktisk
 * genereres rundt en oppskrift. `id` tas inn utenfra (ikke generert her) slik
 * at den alltid er identisk med localStorage-nøkkelen useMealSession lagrer
 * under – samme prinsipp som createEmptyRecipeSession tar imot recipe.id i
 * stedet for å finne på sitt eget. Kallere (menybygger-UI) genererer selv en
 * ny id med crypto.randomUUID() FØR denne kalles, slik at samme id kan
 * brukes til både `useMealSessionIndex().addToIndex(id)` og
 * `useMealSession(id)` med det samme. */
export function createEmptyMealSession(id: string, title: string): MealSession {
  const now = new Date(0).toISOString();
  return {
    id,
    anchorRecipeId: null,
    title,
    slots: [],
    desiredReadyAt: null,
    occasion: null,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** Legger til en plass fylt av en oppskrift som finnes i katalogen fra før.
 * Genererer en ny, stabil slot-id – kall denne når brukeren/menybyggeren
 * plukker en EKSISTERENDE oppskrift til en rolle i menyen. */
export function addExistingSlot(
  session: MealSession,
  role: MealCourseRole,
  recipe: { id: string; slug: string; title: string },
  servings: number,
): MealSession {
  const slot: ExistingMealCourseSlot = {
    // generateId() (IKKE crypto.randomUUID() direkte) – se lib/utils/id.ts
    // sin filheader: crypto.randomUUID kan mangle i nettleseren (f.eks.
    // testing over LAN-IP via http:// på mobil-Safari, ikke en "secure
    // context") og krasjet tidligere akkurat her ("Fant ikke menyen"-
    // rapporten 26.08.2026 var faktisk dette – lagringen kastet en
    // TypeError midtveis og rakk aldri frem til selve navigasjonen).
    id: generateId(),
    role,
    servings,
    source: "existing",
    recipeId: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
  };
  return { ...session, slots: [...session.slots, slot] };
}

/** Legger til en plass fylt av et AI-foreslått rett-forslag som IKKE finnes
 * i katalogen ennå. Se SuggestedMealCourseSlot i types.ts – ingen recipeId,
 * kun tittel/beskrivelse fra forslaget. */
export function addSuggestedSlot(
  session: MealSession,
  role: MealCourseRole,
  suggestion: { title: string; description: string },
  servings: number,
): MealSession {
  const slot: SuggestedMealCourseSlot = {
    id: generateId(), // se kommentaren i addExistingSlot over
    role,
    servings,
    source: "suggested",
    title: suggestion.title,
    description: suggestion.description,
    convertedRecipeId: null,
  };
  return { ...session, slots: [...session.slots, slot] };
}

export function removeSlot(session: MealSession, slotId: string): MealSession {
  return { ...session, slots: session.slots.filter((s) => s.id !== slotId) };
}

/** Bytter ut RETTEN på en gitt plass uten å røre resten av menyen (rekke-
 * følge, andre plasser) – brukes av "bytt ut denne retten"-handlingen i
 * menybyggeren. Rollen (`role`) på plassen beholdes; kun hva som fyller den
 * endres. `servings` kan valgfritt settes samtidig (f.eks. et nytt forslag
 * har en annen naturlig porsjonsstørrelse enn det som lå der før) – utelates
 * den, beholdes forrige verdi. */
export function replaceSlotContent(
  session: MealSession,
  slotId: string,
  content:
    | { source: "existing"; recipe: { id: string; slug: string; title: string }; servings?: number }
    | { source: "suggested"; suggestion: { title: string; description: string }; servings?: number },
): MealSession {
  return {
    ...session,
    slots: session.slots.map((slot) => {
      if (slot.id !== slotId) return slot;
      const servings = content.servings ?? slot.servings;
      if (content.source === "existing") {
        const next: ExistingMealCourseSlot = {
          id: slot.id,
          role: slot.role,
          servings,
          source: "existing",
          recipeId: content.recipe.id,
          slug: content.recipe.slug,
          title: content.recipe.title,
        };
        return next;
      }
      const next: SuggestedMealCourseSlot = {
        id: slot.id,
        role: slot.role,
        servings,
        source: "suggested",
        title: content.suggestion.title,
        description: content.suggestion.description,
        convertedRecipeId: null,
      };
      return next;
    }),
  };
}

export function setSlotServings(session: MealSession, slotId: string, servings: number): MealSession {
  return {
    ...session,
    slots: session.slots.map((slot) => (slot.id === slotId ? { ...slot, servings } : slot)),
  };
}

/** Kobler en tidligere "suggested" plass til en ekte, nyopprettet oppskrift
 * – brukes når brukeren velger å faktisk lage et AI-forslag i admin i
 * etterkant (se `convertedRecipeId` i types.ts). Slotten forblir en
 * SuggestedMealCourseSlot (beholder AI-beskrivelsen for sporbarhet); UI-et
 * kan velge å lenke til `convertedRecipeId` i tillegg til å vise teksten. */
export function markSuggestionConverted(
  session: MealSession,
  slotId: string,
  recipeId: string,
): MealSession {
  return {
    ...session,
    slots: session.slots.map((slot) =>
      slot.id === slotId && slot.source === "suggested" ? { ...slot, convertedRecipeId: recipeId } : slot,
    ),
  };
}

export function renameMeal(session: MealSession, title: string): MealSession {
  return { ...session, title };
}

/** Setter HVILKEN oppskrift menyen ble bygget rundt (26.08.2026, rettet:
 * feltet fantes i typen og ble alltid opprettet som `null` i
 * createEmptyMealSession over, men ble aldri faktisk SATT noe sted – ingen
 * kalte denne, så feltet sto som `null` for absolutt alle menyer, uansett
 * hvordan de ble laget. Oppdaget da "tilbake til oppskriften"-lenken på
 * /meny/[id] aldri viste seg). Kalles av MealBuilder.tsx sin "Lagre
 * menyen"-handling, samtidig som selve ankerretten legges inn som en
 * ordinær "existing"-plass via addExistingSlot – de to henger sammen
 * (MealView.tsx sin anchorSlot-oppslag finner ankerretten IGJEN blant
 * slots via akkurat denne id-en), men er bevisst to separate kall/felter i
 * stedet for at addExistingSlot skal gjette "er dette ankeret?" ut fra
 * kontekst. */
export function setMealAnchorRecipeId(session: MealSession, anchorRecipeId: string | null): MealSession {
  return { ...session, anchorRecipeId };
}

export function setMealNotes(session: MealSession, notes: string): MealSession {
  return { ...session, notes };
}

export function setMealDesiredReadyAt(session: MealSession, desiredReadyAt: string | null): MealSession {
  return { ...session, desiredReadyAt };
}

/** ANLEDNING (5.12) – ren tilstandssetting, se MealOccasion i types.ts for
 * hva feltet faktisk brukes til (myk AI-kontekst, ikke en hard filtrering). */
export function setMealOccasion(session: MealSession, occasion: MealOccasion | null): MealSession {
  return { ...session, occasion };
}

/** Kort, redaksjonell norsk/engelsk-etikett per anledning – brukt både i
 * menybyggerens valgknapper og i "Gjør det til en kveld"-skjermen. Bevisst
 * KUN 5 valg (spesifikasjonen, 5.12: "Ikke lag 20 kategorier"). */
export const MEAL_OCCASION_LABELS: Record<MealOccasion, { no: string; en: string }> = {
  hverdag: { no: "Hverdag", en: "Weeknight" },
  fredagskveld: { no: "Fredagskveld", en: "Friday night" },
  date_night: { no: "Date night", en: "Date night" },
  venner: { no: "Venner", en: "Friends" },
  feiring: { no: "Feiring", en: "Celebration" },
};

/** Fast rekkefølge for anlednings-valgene i UI-et. */
export const ALL_MEAL_OCCASIONS: MealOccasion[] = ["hverdag", "fredagskveld", "date_night", "venner", "feiring"];

/** Hvilke ord i en kategoris navn peker mot hvilken menyrolle – brukt til å
 * plassere "ankerretten" (retten menyen bygges rundt) deterministisk FØR
 * AI-en spørres om resten av menyen, se generateMealPlan i
 * lib/actions/kitchen-intelligence.ts. Bevisst konservativ: kun dessert og
 * tilbehør/saus-kategorier trekkes ut tydelig (entydige nok navn i praksis),
 * ellers antas "main" – en feilklassifisert "forrett" som blir stående som
 * hovedrett er et langt mindre synlig feilgrep enn f.eks. en faktisk
 * hovedrett (f.eks. en gryterett i kategorien "Middag") som feilaktig
 * havner som forrett. */
const DESSERT_CATEGORY_WORDS = ["dessert", "kake", "is", "søt", "sjokolade", "bakst", "bakverk"];
const SIDE_CATEGORY_WORDS = ["tilbehør", "saus", "dressing", "siderett"];
const STARTER_CATEGORY_WORDS = ["forrett", "suppe", "salat"];

export function inferCourseRoleFromCategory(categoryName: string | null): MealCourseRole {
  if (!categoryName) return "main";
  const normalized = categoryName.toLowerCase();
  if (DESSERT_CATEGORY_WORDS.some((word) => normalized.includes(word))) return "dessert";
  if (SIDE_CATEGORY_WORDS.some((word) => normalized.includes(word))) return "side";
  if (STARTER_CATEGORY_WORDS.some((word) => normalized.includes(word))) return "starter";
  return "main";
}

/** Fast rekkefølge (forrett → hovedrett → tilbehør → dessert), brukt både
 * som selve rolle-registeret (f.eks. for å regne ut "de tre gjenværende
 * rollene" rundt en ankerrett i generateMealPlan) og for sortering. */
export const ALL_MEAL_COURSE_ROLES: MealCourseRole[] = ["starter", "main", "side", "dessert"];

/** Praktisk gruppering for UI-et (menybygger-kortene, hel-meny-timeline) –
 * ren visningshjelp, ingen tilstand. */
export function sortSlotsByRole(slots: MealCourseSlot[]): MealCourseSlot[] {
  return [...slots].sort(
    (a, b) => ALL_MEAL_COURSE_ROLES.indexOf(a.role) - ALL_MEAL_COURSE_ROLES.indexOf(b.role),
  );
}

/** Antall retter i menyen som faktisk finnes i katalogen vs. kun er
 * AI-forslag ennå – brukes til den påkrevde "tydelig merking"-oppsummeringen
 * (f.eks. "3 av 4 retter finnes allerede i oppskriftsboken"). */
export function countSlotsBySource(slots: MealCourseSlot[]): { existing: number; suggested: number } {
  return {
    existing: slots.filter((s) => s.source === "existing").length,
    suggested: slots.filter((s) => s.source === "suggested").length,
  };
}
