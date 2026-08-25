"use server";

import {
  callClaudeJSON,
  callClaudeVisionJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { getCachedAiSuggestion, setCachedAiSuggestion } from "@/lib/kitchen-intelligence/ai-cache";
import { matchRecipesToPantry, type PantryMatchResult } from "@/lib/kitchen-intelligence/pantry-match";
import type { MoodId } from "@/lib/kitchen-intelligence/moods";
import { ALL_MEAL_COURSE_ROLES, inferCourseRoleFromCategory } from "@/lib/kitchen-intelligence/meal-session";
import type { MealCourseRole } from "@/lib/kitchen-intelligence/types";
import { getSearchableRecipes, getPublishedRecipeSummaries } from "@/lib/data/recipes";
import type { RecipeSummary } from "@/lib/types";
import type { Lang } from "@/lib/i18n/lang";
import { t, type DictKey } from "@/lib/i18n";

/**
 * AI-drevne kjøkkenintelligens-funksjoner som IKKE er rent deterministiske
 * (se lib/kitchen-intelligence/timers.ts og timeline.ts for de som er det).
 * Følger samme mønster som lib/actions/ai.ts: ingen requireAdmin (kalles
 * direkte av besøkende), kaster en lesbar feil på problemer i stedet for et
 * {success,error}-objekt (dette skriver ikke til recipes-tabellen), og
 * cacher svaret via lib/kitchen-intelligence/ai-cache.ts siden spørsmålet
 * ("hvilke steg i DENNE oppskriften kan gjøres samtidig") har samme svar
 * for alle besøkende som ser de samme stegene.
 */

interface StepInput {
  id: string;
  stepNumber: number;
  text: string;
}

export interface ParallelTaskGroup {
  stepIds: string[];
  note: string;
}

/** Foreslår hvilke steg som kan gjøres SAMTIDIG (typisk: ett passivt
 * ventesteg – steking, koking, heving – og ett eller flere aktive steg som
 * ikke er avhengige av det), til bruk i Reverse Cooking Timeline for å
 * korte ned et ellers strengt sekvensielt anslag. Returnerer en tom liste
 * dersom ingen gode parallell-muligheter finnes – IKKE en feil, det er et
 * helt normalt og vanlig svar for korte oppskrifter. */
export async function getParallelTaskHints(
  recipeId: string,
  steps: StepInput[],
  lang: Lang = "no",
): Promise<ParallelTaskGroup[]> {
  if (steps.length < 2) return [];

  // Nøkkelen bygges av steg-id-ene i rekkefølge – stabil så lenge stegene
  // (eller en gitt AI-generert variant sine egne id-er) ikke endres, som
  // dekker det vanlige tilfellet (samme oppskrift sett av mange besøkende).
  const cacheKey = `${lang}:${steps.map((s) => s.id).join(",")}`;
  const cached = await getCachedAiSuggestion<ParallelTaskGroup[]>(recipeId, "parallel_tasks", cacheKey);
  if (cached) return cached;

  const stepsList = steps.map((s) => `${s.stepNumber}. (id: ${s.id}) ${s.text}`).join("\n");

  const system =
    lang === "en"
      ? "You help home cooks save time by spotting which recipe steps can be done AT THE SAME TIME as each other " +
        "(typically: one passive waiting step like baking/boiling/rising, alongside one or more active steps that " +
        'don\'t depend on it finishing first). Respond with ONLY JSON: {"groups": [{"stepIds": ["..."], "note": ' +
        '"short note in English, max 1 sentence, explaining what can happen in parallel"}]}. Only include GENUINELY ' +
        "safe, obvious parallel opportunities – when in doubt, leave a group out entirely. Return an empty groups " +
        "array if there are none."
      : "Du hjelper hjemmekokker å spare tid ved å se hvilke steg i en oppskrift som kan gjøres SAMTIDIG " +
        "(typisk: ett passivt ventesteg som steking/koking/heving, sammen med ett eller flere aktive steg som ikke " +
        'er avhengige av at det er ferdig først). Svar KUN med JSON: {"groups": [{"stepIds": ["..."], "note": ' +
        '"kort forklaring på norsk, maks 1 setning, om hva som kan gjøres samtidig"}]}. Ta KUN med genuint trygge, ' +
        "åpenbare parallell-muligheter – ved tvil, utelat gruppen helt. Returner en tom groups-liste dersom det ikke finnes noen.";

  const prompt =
    lang === "en"
      ? `Recipe steps, in order:\n${stepsList}`
      : `Oppskriftens steg, i rekkefølge:\n${stepsList}`;

  const result = await callClaudeJSON<{ groups: ParallelTaskGroup[] }>(system, prompt, 500, 0.2);
  const validStepIds = new Set(steps.map((s) => s.id));
  const groups = (result.groups ?? [])
    .map((g) => ({
      stepIds: (g.stepIds ?? []).filter((id) => validStepIds.has(id)),
      note: (g.note ?? "").slice(0, 200),
    }))
    .filter((g) => g.stepIds.length >= 2);

  await setCachedAiSuggestion(recipeId, "parallel_tasks", cacheKey, groups);
  return groups;
}

/** Re-eksportert for bekvemmelighet – lar UI-komponenter importere typen fra
 * samme sted som selve funksjonen som produserer den. */
export type { PantryMatchResult };

/**
 * Gjenkjenner matvarer på et bilde (kjøleskap, skap, kjøkkenbenk) – brukt av
 * "Hva kan jeg lage?"-siden (components/pantry/PantryMatchView.tsx) som ett
 * av to likestilte måter å bygge ingredienslisten på (den andre: skrive inn
 * selv, se splitIngredientList i lib/kitchen-intelligence/pantry-match.ts,
 * som er REN og trenger ingen AI). Ikke cachet – hvert bilde er unikt, det
 * finnes ingen fornuftig cache-nøkkel å gjenbruke på tvers av besøkende her
 * (i motsetning til f.eks. getParallelTaskHints, der samme oppskrift gir
 * samme spørsmål for alle).
 */
export async function detectIngredientsFromImage(
  image: { mediaType: string; base64Data: string },
  lang: Lang = "no",
): Promise<string[]> {
  if (!SUPPORTED_IMAGE_MEDIA_TYPES.includes(image.mediaType as SupportedImageMediaType)) {
    throw new Error(
      lang === "en"
        ? "Unsupported image format. Try a JPEG or PNG photo."
        : "Bildeformatet støttes ikke. Prøv et JPEG- eller PNG-bilde.",
    );
  }
  if (!image.base64Data) {
    throw new Error(lang === "en" ? "No image was received." : "Mottok ikke noe bilde.");
  }

  const system =
    lang === "en"
      ? "You look at a photo of a fridge, pantry, or kitchen counter and list the individual food ingredients you can " +
        'identify. Respond with ONLY JSON: {"ingredients": ["..."]}. Use short, common ingredient names (e.g. "onion", ' +
        'not "a slightly wilted yellow onion"). Skip packaging, containers, and anything that is not an actual food ' +
        "item. List at most 25 ingredients, most confident/clear first."
      : "Du ser på et bilde av et kjøleskap, skap eller kjøkkenbenk og lister opp matvarene du kan gjenkjenne. Svar " +
        'KUN med JSON: {"ingredients": ["..."]}. Bruk korte, vanlige ingrediensnavn (f.eks. «løk», ikke «en litt ' +
        "vissen gul løk»). Ikke ta med emballasje, beholdere eller noe som ikke faktisk er en matvare. List maks 25 " +
        "ingredienser, de tydeligste/sikreste først.";

  const prompt =
    lang === "en"
      ? "What food ingredients can you identify in this photo?"
      : "Hvilke matvarer kan du gjenkjenne på dette bildet?";

  const result = await callClaudeVisionJSON<{ ingredients: string[] }>(
    system,
    prompt,
    { mediaType: image.mediaType as SupportedImageMediaType, base64Data: image.base64Data },
    500,
    0.2,
  );

  return (result.ingredients ?? [])
    .map((name) => name.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 25);
}

/**
 * Rangerer alle publiserte oppskrifter etter hvor mange av de oppgitte
 * ingrediensene de bruker – selve rangeringen (matchRecipesToPantry) er 100
 * % deterministisk, se lib/kitchen-intelligence/pantry-match.ts. Denne
 * server-actionen finnes hovedsakelig for å slippe å sende HELE
 * oppskriftskatalogens ingredienslister til klienten – matchingen skjer her,
 * kun de beste resultatene returneres.
 */
export async function findRecipesForPantry(availableIngredients: string[]): Promise<PantryMatchResult[]> {
  const recipes = await getSearchableRecipes();
  return matchRecipesToPantry(availableIngredients, recipes, { limit: 12 });
}

export interface SubstitutionSuggestion {
  substituteName: string;
  reason: string;
}

/**
 * Foreslår én smart erstatning for én ingrediens i én oppskrift – tar hensyn
 * til hele retten (ikke bare selve ingrediensen isolert) og hvilken variant
 * som er aktiv (original/vegetar), se RecipeInteractive.tsx. Foreslår
 * bevisst KUN navn + begrunnelse, ikke en justert mengde/enhet – en AI-
 * anslått mengde ville blitt "frosset" i UI-et og vist feil dersom brukeren
 * siden endrer porsjonsantall (se ChosenSubstitution/applySubstitutions sin
 * kommentar i lib/kitchen-intelligence/session.ts), så eventuell justering
 * av mengde formidles i begrunnelsesteksten i stedet ("bruk dobbel mengde").
 */
export async function getIngredientSubstitution(
  recipeId: string,
  recipe: { title: string; ingredientNames: string[] },
  ingredient: { name: string; amount: string | null; unit: string | null; note: string | null },
  variant: "original" | "vegetarian",
  lang: Lang = "no",
): Promise<SubstitutionSuggestion> {
  const cacheKey = `${lang}:${variant}:${ingredient.name.trim().toLowerCase()}`;
  const cached = await getCachedAiSuggestion<SubstitutionSuggestion>(recipeId, "substitution", cacheKey);
  if (cached) return cached;

  const vegetarianNote =
    variant === "vegetarian"
      ? lang === "en"
        ? " This is a VEGETARIAN version of the dish – only suggest a vegetarian substitute."
        : " Dette er en VEGETAR-variant av retten – foreslå kun en vegetarisk erstatning."
      : "";

  const system =
    lang === "en"
      ? "You are a knowledgeable, practical home cook. Given a dish and one ingredient in it, suggest ONE good " +
        "substitute that's commonly available and actually works well in this specific dish – not just a generic " +
        'substitute list. Respond with ONLY JSON: {"substituteName": "short ingredient name", "reason": "1-2 ' +
        'sentences explaining why it works here, and any adjustment needed (e.g. amount, cooking time)"}.' +
        vegetarianNote
      : "Du er en kunnskapsrik, praktisk hjemmekokk. Gitt en rett og én ingrediens i den, foreslå ÉN god erstatning " +
        "som er lett å få tak i og som faktisk fungerer godt i akkurat denne retten – ikke bare en generisk " +
        'erstatningsliste. Svar KUN med JSON: {"substituteName": "kort ingrediensnavn", "reason": "1-2 setninger om ' +
        'hvorfor den fungerer her, og eventuell justering som trengs (f.eks. mengde, steketid)"}.' +
        vegetarianNote;

  const amountText = [ingredient.amount, ingredient.unit].filter(Boolean).join(" ");
  const prompt =
    lang === "en"
      ? `Dish: ${recipe.title}\nAll ingredients: ${recipe.ingredientNames.join(", ")}\n\nIngredient to substitute: ${amountText} ${ingredient.name}${ingredient.note ? ` (${ingredient.note})` : ""}`
      : `Rett: ${recipe.title}\nAlle ingredienser: ${recipe.ingredientNames.join(", ")}\n\nIngrediens som skal erstattes: ${amountText} ${ingredient.name}${ingredient.note ? ` (${ingredient.note})` : ""}`;

  const result = await callClaudeJSON<{ substituteName: string; reason: string }>(system, prompt, 300, 0.4);
  const suggestion: SubstitutionSuggestion = {
    substituteName: (result.substituteName ?? "").trim().slice(0, 120),
    reason: (result.reason ?? "").trim().slice(0, 300),
  };

  await setCachedAiSuggestion(recipeId, "substitution", cacheKey, suggestion);
  return suggestion;
}

/**
 * Smaksprofil (Fase 4 – Smak): flyttet 25.08.2026 fra en live, cachet
 * per-besøk AI-beregning her, til en FORHÅNDSGENERERT admin-egenskap lagret
 * direkte på oppskriften (recipes.taste_profile) – se generateTasteProfile
 * i lib/actions/recipes.ts og TasteProfileDisplay.tsx. Denne filen har
 * derfor ingen getTasteProfile lenger.
 */

export interface MenuSuggestionItem {
  recipe: RecipeSummary;
  note: string;
}

/**
 * "Server det sammen med …" (Fase 4 – Smak) – foreslår inntil 3 ANDRE
 * publiserte oppskrifter (forrett/tilbehør/dessert) som til sammen med
 * hovedretten utgjør en hel meny. AI velger KUN blant faktisk eksisterende
 * oppskrifter (samme valideringsmønster som getParallelTaskHints – forkaster
 * enhver id-en ikke selv ga som kandidat), aldri fritekst-oppdiktede retter.
 * Selve payloaden som caches er kun {recipeId, note} – ikke hele
 * RecipeSummary-objektet – slik at kortene som faktisk vises alltid
 * reflekterer oppskriftens NÅVÆRENDE tittel/bilde, selv om den er redigert
 * etter at forslaget ble cachet.
 */
export async function getMenuSuggestions(
  recipeId: string,
  recipe: { title: string; description: string },
  lang: Lang = "no",
): Promise<MenuSuggestionItem[]> {
  const candidates = await getPublishedRecipeSummaries();
  const others = candidates.filter((r) => r.id !== recipeId);
  if (others.length === 0) return [];

  const cached = await getCachedAiSuggestion<{ recipeId: string; note: string }[]>(recipeId, "menu_suggestion", lang);

  let picks: { recipeId: string; note: string }[];
  if (cached) {
    picks = cached;
  } else {
    const candidateList = others
      .slice(0, 120)
      .map((r) => `(id: ${r.id}) ${r.title}${r.category ? ` – ${r.category.name}` : ""}`)
      .join("\n");

    const system =
      lang === "en"
        ? "You help build a complete meal around a main dish. Given the dish and a list of OTHER recipes actually " +
          "available on this site, suggest up to 3 that would pair well as a starter, side, or dessert to build a " +
          'full meal around it – prefer variety (not more of the same course/style). Respond with ONLY JSON: ' +
          '{"suggestions": [{"recipeId": "...", "note": "short note in English, max 1 sentence, on why/how it pairs"}]}. ' +
          "ONLY use recipe ids from the list given – never invent one. Return fewer (even zero) if nothing genuinely fits."
        : "Du hjelper til med å sette sammen en hel meny rundt en hovedrett. Gitt retten og en liste over ANDRE " +
          "oppskrifter som faktisk finnes på dette nettstedet, foreslå inntil 3 som passer godt som forrett, " +
          "tilbehør eller dessert for å bygge en hel meny rundt den – ha gjerne variasjon (ikke flere av samme " +
          'type/stil). Svar KUN med JSON: {"suggestions": [{"recipeId": "...", "note": "kort forklaring på norsk, ' +
          'maks 1 setning, om hvorfor/hvordan den passer"}]}. Bruk KUN oppskrift-id-er fra listen som er gitt – ' +
          "finn aldri opp en selv. Returner færre (også null) dersom ingenting genuint passer.";

    const prompt =
      lang === "en"
        ? `Main dish: ${recipe.title}\n${recipe.description}\n\nOther recipes available:\n${candidateList}`
        : `Hovedrett: ${recipe.title}\n${recipe.description}\n\nAndre tilgjengelige oppskrifter:\n${candidateList}`;

    const result = await callClaudeJSON<{ suggestions: { recipeId: string; note: string }[] }>(
      system,
      prompt,
      500,
      0.4,
    );

    const validIds = new Set(others.map((r) => r.id));
    picks = (result.suggestions ?? [])
      .filter((s) => validIds.has(s.recipeId))
      .map((s) => ({ recipeId: s.recipeId, note: (s.note ?? "").trim().slice(0, 200) }))
      .slice(0, 3);

    await setCachedAiSuggestion(recipeId, "menu_suggestion", lang, picks);
  }

  const byId = new Map(others.map((r) => [r.id, r]));
  return picks
    .map((p) => {
      const recipeSummary = byId.get(p.recipeId);
      return recipeSummary ? { recipe: recipeSummary, note: p.note } : null;
    })
    .filter((item): item is MenuSuggestionItem => item !== null);
}

/**
 * Stemningsvelger / "Mood Mode" (Fase 4 – Smak) – fem faste stemninger (se
 * lib/kitchen-intelligence/moods.ts), IKKE fritekst, slik at AI-bruken er
 * avgrenset til ett cachet kall PER STEMNING+SPRÅK for HELE nettstedet,
 * fremfor ett kall per besøkende. "quick" er et unntak: total tilberedningstid
 * er allerede et ekte felt på hver oppskrift, så den stemningen svares på
 * 100 % deterministisk uten noe AI-kall eller cache-oppslag i det hele tatt.
 */
export async function getMoodRecommendations(mood: MoodId, lang: Lang = "no"): Promise<RecipeSummary[]> {
  const recipes = await getPublishedRecipeSummaries();
  if (recipes.length === 0) return [];

  if (mood === "quick") {
    return recipes
      .filter((r) => r.totalTimeMinutes !== null)
      .sort((a, b) => (a.totalTimeMinutes ?? 0) - (b.totalTimeMinutes ?? 0))
      .slice(0, 8);
  }

  const cacheKey = `${mood}:${lang}`;
  // recipeId = null: dette er et sidevidt svar, ikke knyttet til én bestemt
  // oppskrift – se filheader i lib/kitchen-intelligence/ai-cache.ts.
  const cached = await getCachedAiSuggestion<string[]>(null, "mood_mode", cacheKey);

  let ids: string[];
  if (cached) {
    ids = cached;
  } else {
    const candidateList = recipes
      .slice(0, 200)
      .map((r) => `(id: ${r.id}) ${r.title}${r.category ? ` – ${r.category.name}` : ""}`)
      .join("\n");

    const moodMeaning: Record<Exclude<MoodId, "quick">, { no: string; en: string }> = {
      cozy: {
        no: "koselig, varmt og trøstende – perfekt for en rolig kveld hjemme",
        en: "cozy, warm and comforting – perfect for a quiet night in",
      },
      impress: {
        no: "imponerende nok til middagsgjester du gjerne vil imponere, uten at det nødvendigvis er vanskelig å lage",
        en: "impressive enough for dinner guests you want to impress, without necessarily being difficult to make",
      },
      crowd: {
        no: "godt egnet for å lage til mange på én gang – lett å skalere opp, ikke unødvendig kostbart eller tungvint i stor skala",
        en: "well suited for feeding a crowd – easy to scale up, not unnecessarily expensive or fiddly at scale",
      },
      healthy: {
        no: "sunt og lett – gjerne grønnsaksrikt, ikke unødvendig tungt eller fettrikt",
        en: "healthy and light – vegetable-forward, not unnecessarily heavy or fatty",
      },
    };
    const meaning = moodMeaning[mood][lang];

    const system =
      lang === "en"
        ? "You help a home cook pick recipes that fit a specific MOOD or occasion, from a list of recipes actually " +
          'available on this site. Respond with ONLY JSON: {"recipeIds": ["..."]}, up to 8 ids, best fit first. ONLY ' +
          "use ids from the list given – never invent one. Return fewer (even zero) if nothing genuinely fits."
        : "Du hjelper en hjemmekokk å velge oppskrifter som passer til en bestemt STEMNING eller anledning, fra en " +
          'liste over oppskrifter som faktisk finnes på dette nettstedet. Svar KUN med JSON: {"recipeIds": ["..."]}, ' +
          "inntil 8 id-er, best passende først. Bruk KUN id-er fra listen som er gitt – finn aldri opp en selv. " +
          "Returner færre (også null) dersom ingenting genuint passer.";

    const prompt =
      lang === "en"
        ? `Mood: ${meaning}\n\nAvailable recipes:\n${candidateList}`
        : `Stemning: ${meaning}\n\nTilgjengelige oppskrifter:\n${candidateList}`;

    const result = await callClaudeJSON<{ recipeIds: string[] }>(system, prompt, 500, 0.3);
    const validIds = new Set(recipes.map((r) => r.id));
    ids = (result.recipeIds ?? []).filter((id) => validIds.has(id)).slice(0, 8);

    await setCachedAiSuggestion(null, "mood_mode", cacheKey, ids);
  }

  const byId = new Map(recipes.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is RecipeSummary => r !== undefined);
}

/**
 * MENYBYGGEREN (Fase 5 – Experience). Se filheaderen til MealSession i
 * lib/kitchen-intelligence/types.ts for hva en meny er/ikke er, og
 * lib/kitchen-intelligence/meal-session.ts for hvordan et akseptert forslag
 * herfra bygges om til faktiske MealSession-slots.
 *
 * ULIK getMenuSuggestions over på tre punkter, derfor en helt egen funksjon
 * (og egen cache-feature "meal_plan", se AI_CACHE_FEATURES i types.ts):
 *  1. Rolle-inndelt (forrett/hovedrett/tilbehør/dessert), ikke en flat liste.
 *  2. Kan foreslå en HELT NY rett (ikke i katalogen) når ingenting
 *     eksisterende passer godt – getMenuSuggestions velger utelukkende blant
 *     eksisterende oppskrifter.
 *  3. Ankerrettens egen rolle avgjøres DETERMINISTISK (kategorien –
 *     inferCourseRoleFromCategory), FØR AI-en i det hele tatt spørres – AI-en
 *     får kun i oppgave å fylle de resterende rollene, ikke gjette hvilken
 *     rolle ankerretten selv har.
 */

const ROLE_LABEL_KEYS: Record<MealCourseRole, DictKey> = {
  starter: "mealBuilder.role.starter",
  main: "mealBuilder.role.main",
  side: "mealBuilder.role.side",
  dessert: "mealBuilder.role.dessert",
};

export interface ExistingMealPlanCourse {
  role: MealCourseRole;
  source: "existing";
  recipe: RecipeSummary;
  note: string;
}

export interface SuggestedMealPlanCourse {
  role: MealCourseRole;
  source: "suggested";
  title: string;
  description: string;
  note: string;
}

export type MealPlanCourse = ExistingMealPlanCourse | SuggestedMealPlanCourse;

export interface MealPlanSuggestion {
  menuTitle: string;
  /** Rollen ankerretten selv fikk, deterministisk utledet fra kategorien –
   * IKKE inkludert i `courses` (det er kun de ANDRE rollene). */
  anchorRole: MealCourseRole;
  courses: MealPlanCourse[];
}

interface RawMealPlanCourse {
  role?: string;
  source?: string;
  recipeId?: string;
  title?: string;
  description?: string;
  note?: string;
}

interface RawMealPlan {
  menuTitle?: string;
  courses?: RawMealPlanCourse[];
}

/** Kompakt, cachbar form – samme prinsipp som getMenuSuggestions sin
 * `{recipeId, note}[]`: cacher KUN det AI-en faktisk bidro med (aldri en
 * full RecipeSummary), slik at kortene som vises alltid reflekterer
 * oppskriftens nåværende tittel/bilde/publiseringsstatus selv om den er
 * endret (eller avpublisert/slettet) etter at forslaget ble cachet. */
interface CachedMealPlanCourse {
  role: MealCourseRole;
  source: "existing" | "suggested";
  recipeId: string | null;
  title: string;
  description: string;
  note: string;
}

interface CachedMealPlan {
  menuTitle: string;
  courses: CachedMealPlanCourse[];
}

/** Validerer/renser AI-ens rå JSON-svar for ÉN rolle-plass ned til en
 * cachbar form, eller null dersom svaret ikke kan brukes (ukjent/duplisert
 * rolle, en oppdiktet recipeId, eller et tomt "suggested"-forslag). Delt
 * mellom generateMealPlan (flere plasser samtidig) og
 * regenerateMealPlanCourse (én plass om gangen), se under. */
function validateRawCourse(
  raw: RawMealPlanCourse,
  allowedRoles: Set<MealCourseRole>,
  validRecipeIds: Set<string>,
): CachedMealPlanCourse | null {
  const role = raw.role as MealCourseRole;
  if (!allowedRoles.has(role)) return null;

  if (raw.source === "existing") {
    const recipeId = raw.recipeId ?? "";
    if (!validRecipeIds.has(recipeId)) return null;
    return {
      role,
      source: "existing",
      recipeId,
      title: "",
      description: "",
      note: (raw.note ?? "").trim().slice(0, 200),
    };
  }

  if (raw.source === "suggested") {
    const title = (raw.title ?? "").trim().slice(0, 120);
    if (!title) return null;
    return {
      role,
      source: "suggested",
      recipeId: null,
      title,
      description: (raw.description ?? "").trim().slice(0, 300),
      note: (raw.note ?? "").trim().slice(0, 200),
    };
  }

  return null;
}

/** Bygger den faktiske, viste MealPlanCourse-en fra en cachet/validert
 * plass, ved å slå opp EKTE, ferske oppskriftsdata for "existing" (se
 * filheaderen over) – returnerer null dersom oppskriften ikke lenger finnes
 * blant kandidatene (slettet/avpublisert siden caching), som da bare gjør
 * at den plassen i menyen faller bort. */
function resolveCourse(
  cached: CachedMealPlanCourse,
  byId: Map<string, RecipeSummary>,
): MealPlanCourse | null {
  if (cached.source === "existing") {
    const recipe = cached.recipeId ? byId.get(cached.recipeId) : undefined;
    if (!recipe) return null;
    return { role: cached.role, source: "existing", recipe, note: cached.note };
  }
  return {
    role: cached.role,
    source: "suggested",
    title: cached.title,
    description: cached.description,
    note: cached.note,
  };
}

/**
 * Foreslår en HEL meny rundt en gitt ankerrett (typisk oppskriften brukeren
 * står på når de trykker "Bygg en meny"). Ankerretten selv er IKKE med i
 * returnerte `courses` – kun de tre andre rollene, se filheaderen over.
 */
export async function generateMealPlan(
  anchorRecipeId: string,
  anchor: { title: string; description: string; categoryName: string | null },
  lang: Lang = "no",
): Promise<MealPlanSuggestion> {
  const anchorRole = inferCourseRoleFromCategory(anchor.categoryName);
  const otherRoles = ALL_MEAL_COURSE_ROLES.filter((role) => role !== anchorRole);
  const allowedRoles = new Set(otherRoles);

  const candidates = await getPublishedRecipeSummaries();
  const others = candidates.filter((r) => r.id !== anchorRecipeId);
  const validIds = new Set(others.map((r) => r.id));
  const byId = new Map(others.map((r) => [r.id, r]));

  const cacheKey = `${lang}:${anchorRole}`;
  let plan = await getCachedAiSuggestion<CachedMealPlan>(anchorRecipeId, "meal_plan", cacheKey);

  if (!plan) {
    const roleLabel = (role: MealCourseRole) => t(lang, ROLE_LABEL_KEYS[role]);
    const otherRoleList = otherRoles.map((role) => `"${role}" (${roleLabel(role)})`).join(", ");
    const candidateList = others
      .slice(0, 120)
      .map((r) => `(id: ${r.id}) ${r.title}${r.category ? ` – ${r.category.name}` : ""}`)
      .join("\n");

    const system =
      lang === "en"
        ? "You help build a complete, well-composed meal around a given anchor dish. The anchor dish already fills " +
          `the "${anchorRole}" (${roleLabel(anchorRole)}) course. Suggest the remaining courses: ${otherRoleList}. ` +
          "For EACH remaining role, either (a) pick the best-fitting EXISTING recipe from the candidate list (by id), " +
          "or (b) if nothing in the list genuinely fits well, invent a plausible NEW dish suggestion (title + short " +
          "description) for that role. Prefer existing recipes when something actually fits – the point is to help " +
          "the user discover dishes they already have, not to always invent something new. Aim for real variety " +
          "across the whole menu (don't repeat the anchor dish's main ingredient/style unnecessarily). Respond with " +
          'ONLY JSON: {"menuTitle": "short, appetizing name for the whole menu, max 6 words", "courses": [{"role": ' +
          '"one of the roles listed above, each exactly once", "source": "existing"|"suggested", "recipeId": "ONLY ' +
          'when source is existing, an id from the candidate list – never invent one", "title": "ONLY when source is ' +
          'suggested", "description": "1-2 sentences, ONLY when source is suggested", "note": "short note in ' +
          'English, max 1 sentence, on why this dish fits the menu"}]}.'
        : "Du hjelper til med å sette sammen en komplett, helhetlig meny rundt en gitt ankerrett. Ankerretten fyller " +
          `allerede rollen "${anchorRole}" (${roleLabel(anchorRole)}). Foreslå de resterende rollene: ${otherRoleList}. ` +
          "For HVER gjenværende rolle, enten (a) velg den best passende EKSISTERENDE oppskriften fra kandidatlisten " +
          "(oppgi id-en), eller (b) hvis ingenting i listen genuint passer godt, finn opp et plausibelt NYTT " +
          "rett-forslag (tittel + kort beskrivelse) for den rollen. Prioriter eksisterende oppskrifter når noe " +
          "faktisk passer – poenget er å hjelpe brukeren oppdage retter de allerede har, ikke å alltid finne opp noe " +
          "nytt. Sikt mot ekte variasjon i hele menyen (ikke gjenta ankerrettens hovedingrediens/stil unødig). Svar " +
          'KUN med JSON: {"menuTitle": "kort, appetittvekkende navn på hele menyen, maks 6 ord", "courses": [{"role": ' +
          '"én av rollene listet over, hver nøyaktig én gang", "source": "existing"|"suggested", "recipeId": "KUN når ' +
          'source er existing, en id fra kandidatlisten – finn aldri opp en selv", "title": "KUN når source er ' +
          'suggested", "description": "1-2 setninger, KUN når source er suggested", "note": "kort forklaring på ' +
          'norsk, maks 1 setning, om hvorfor denne retten passer i menyen"}]}.';

    const prompt =
      lang === "en"
        ? `Anchor dish (${roleLabel(anchorRole)}): ${anchor.title}\n${anchor.description}\n\nOther recipes available:\n${candidateList}`
        : `Ankerrett (${roleLabel(anchorRole)}): ${anchor.title}\n${anchor.description}\n\nAndre tilgjengelige oppskrifter:\n${candidateList}`;

    const result = await callClaudeJSON<RawMealPlan>(system, prompt, 900, 0.4);

    const seenRoles = new Set<MealCourseRole>();
    const courses: CachedMealPlanCourse[] = [];
    for (const rawCourse of result.courses ?? []) {
      const validated = validateRawCourse(rawCourse, allowedRoles, validIds);
      if (!validated || seenRoles.has(validated.role)) continue;
      seenRoles.add(validated.role);
      courses.push(validated);
    }

    const fallbackTitle = lang === "en" ? `A menu around ${anchor.title}` : `En meny rundt ${anchor.title}`;
    plan = { menuTitle: (result.menuTitle ?? "").trim().slice(0, 80) || fallbackTitle, courses };

    await setCachedAiSuggestion(anchorRecipeId, "meal_plan", cacheKey, plan);
  }

  const courses = plan.courses
    .map((c) => resolveCourse(c, byId))
    .filter((c): c is MealPlanCourse => c !== null);

  return { menuTitle: plan.menuTitle, anchorRole, courses };
}

/**
 * Foreslår ETT alternativ for ÉN gitt rolle i en meny brukeren allerede
 * redigerer ("Foreslå en annen" på et enkelt menykort, se
 * components/recipe/MealBuilder.tsx) – IKKE cachet (i motsetning til
 * generateMealPlan), siden hvilke retter som skal utelukkes varierer fra
 * kall til kall (resten av menyen brukeren allerede har satt sammen), noe
 * som ville gitt en egen cache-rad per unike utelukkelses-kombinasjon uten
 * reell gjenbruksverdi.
 */
export async function regenerateMealPlanCourse(
  role: MealCourseRole,
  anchor: { title: string; description: string },
  excludeRecipeIds: string[],
  lang: Lang = "no",
): Promise<MealPlanCourse> {
  const candidates = await getPublishedRecipeSummaries();
  const excluded = new Set(excludeRecipeIds);
  const others = candidates.filter((r) => !excluded.has(r.id));
  const validIds = new Set(others.map((r) => r.id));
  const byId = new Map(others.map((r) => [r.id, r]));
  const roleLabel = t(lang, ROLE_LABEL_KEYS[role]);

  const candidateList = others
    .slice(0, 120)
    .map((r) => `(id: ${r.id}) ${r.title}${r.category ? ` – ${r.category.name}` : ""}`)
    .join("\n");

  const system =
    lang === "en"
      ? `You help fill ONE course ("${role}" / ${roleLabel}) in a meal being built around an anchor dish. Either (a) ` +
        "pick the best-fitting EXISTING recipe from the candidate list (by id), or (b) if nothing genuinely fits, " +
        'invent a plausible NEW dish suggestion (title + short description). Respond with ONLY JSON: {"source": ' +
        '"existing"|"suggested", "recipeId": "ONLY when source is existing, an id from the candidate list – never ' +
        'invent one", "title": "ONLY when source is suggested", "description": "1-2 sentences, ONLY when source is ' +
        'suggested", "note": "short note in English, max 1 sentence, on why this dish fits"}.'
      : `Du hjelper til med å fylle ÉN plass ("${role}" / ${roleLabel}) i et måltid som bygges rundt en ankerrett. ` +
        "Enten (a) velg den best passende EKSISTERENDE oppskriften fra kandidatlisten (oppgi id-en), eller (b) hvis " +
        'ingenting genuint passer, finn opp et plausibelt NYTT rett-forslag (tittel + kort beskrivelse). Svar KUN ' +
        'med JSON: {"source": "existing"|"suggested", "recipeId": "KUN når source er existing, en id fra ' +
        'kandidatlisten – finn aldri opp en selv", "title": "KUN når source er suggested", "description": "1-2 ' +
        'setninger, KUN når source er suggested", "note": "kort forklaring på norsk, maks 1 setning, om hvorfor ' +
        'denne retten passer"}.';

  const prompt =
    lang === "en"
      ? `Anchor dish: ${anchor.title}\n${anchor.description}\n\nOther recipes available:\n${candidateList}`
      : `Ankerrett: ${anchor.title}\n${anchor.description}\n\nAndre tilgjengelige oppskrifter:\n${candidateList}`;

  const result = await callClaudeJSON<RawMealPlanCourse>(system, prompt, 400, 0.5);
  const validated = validateRawCourse({ ...result, role }, new Set([role]), validIds);

  if (!validated) {
    // AI-en klarte ikke å gi et brukbart svar (ugyldig/tomt) – faller
    // tilbake til et generisk, tydelig merket forslag fremfor å kaste en
    // feil UI-et må håndtere spesielt for akkurat dette tilfellet.
    const fallback: CachedMealPlanCourse = {
      role,
      source: "suggested",
      recipeId: null,
      title: lang === "en" ? "Chef's choice" : "Kokkens valg",
      description:
        lang === "en"
          ? "Couldn't find a specific suggestion this time – pick something that fits your own taste."
          : "Fant ikke et konkret forslag denne gangen – velg noe som passer din egen smak.",
      note: "",
    };
    return resolveCourse(fallback, byId) as MealPlanCourse;
  }

  const resolved = resolveCourse(validated, byId);
  if (resolved) return resolved;

  // "existing" pekte på en oppskrift som likevel ikke slo opp (svært
  // usannsynlig rett etter at candidateList selv ble bygget fra samme
  // datasett, men favner edge-casen uten å kaste).
  return {
    role,
    source: "suggested",
    title: validated.title || (lang === "en" ? "Chef's choice" : "Kokkens valg"),
    description: validated.description,
    note: validated.note,
  };
}
