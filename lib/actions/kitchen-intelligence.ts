"use server";

import {
  callClaude,
  callClaudeJSON,
  callClaudeVisionJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { getCachedAiSuggestion, setCachedAiSuggestion } from "@/lib/kitchen-intelligence/ai-cache";
import { matchRecipesToPantry, type PantryMatchResult } from "@/lib/kitchen-intelligence/pantry-match";
import type { MoodId } from "@/lib/kitchen-intelligence/moods";
import {
  ALL_MEAL_COURSE_ROLES,
  inferCourseRoleFromCategory,
  MEAL_OCCASION_LABELS,
} from "@/lib/kitchen-intelligence/meal-session";
import type { MealCourseRole, MealOccasion } from "@/lib/kitchen-intelligence/types";
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

/** Korte, gjenkjennelige tidtaker-navn ("Gryten koker") for steg som har en
 * tidtaker-verdig varighet (se lib/kitchen-intelligence/timers.ts sin
 * parseStepDurationMs, som avgjør hvilke steg dette i det hele tatt kalles
 * for) – i stedet for det generiske "Steg 3" som gjør det vanskelig å
 * huske hvilken tidtaker som er hvilken når flere kjører samtidig i Cook
 * Mode/meny-Cook Mode (se tilbakemelding 26.08.2026: "de legger seg
 * nedover med steg 1, steg 2... vil ikke ha hele steget som tekst, men
 * forkortet"). Samme svar for alle besøkende som ser de samme stegene →
 * cachet, samme mønster som getParallelTaskHints over. */
export async function getStepTimerLabels(
  recipeId: string,
  steps: StepInput[],
  lang: Lang = "no",
): Promise<Record<string, string>> {
  if (steps.length === 0) return {};

  const cacheKey = `${lang}:${steps.map((s) => s.id).join(",")}`;
  const cached = await getCachedAiSuggestion<Record<string, string>>(recipeId, "step_timer_labels", cacheKey);
  if (cached) return cached;

  const stepsList = steps.map((s) => `(id: ${s.id}) ${s.text}`).join("\n");

  const system =
    lang === "en"
      ? "You give home cooks short, memorable names for a kitchen timer, so several timers running at once can be " +
        "told apart at a glance. For EACH step below, write a short label (2-4 words, no ending punctuation) " +
        "describing WHAT is happening/cooking during that step's wait – a short present-tense state, NOT a full " +
        'instruction and NOT a truncated copy of the sentence. Example: the step "Cover the pot and let it ' +
        "simmer for 2-2½ hours or until the beef is tender enough to shred. Check after 2 hours first. " +
        'Well-marbled meat cooks faster than tough, lean meat." should become "Pot simmering" – nothing longer. ' +
        'Respond with ONLY JSON: {"labels": [{"stepId": "...", "label": "..."}]} – exactly one entry per step given.'
      : "Du gir hjemmekokker korte, gjenkjennelige navn til en kjøkken-tidtaker, slik at flere tidtakere som går " +
        "samtidig kan skilles fra hverandre med et raskt blikk. For HVERT steg under, skriv en kort merkelapp " +
        "(2-4 ord, ingen avsluttende tegnsetting) som beskriver HVA som skjer/koker mens man venter i det steget " +
        "– en kort, nåtids tilstand, IKKE en full instruksjon og IKKE en forkortet kopi av setningen. Eksempel: " +
        'steget "Dekk gryten og la den koke i 2-2 1/2 timer eller til oksekjøttet er mykt nok til å shredde. ' +
        'Sjekk først etter 2 timer. Godt marmorert kjøtt koker raskere enn tøft, magert kjøtt." skal bli "Gryten ' +
        'koker" – ikke noe lengre. Svar KUN med JSON: {"labels": [{"stepId": "...", "label": "..."}]} – nøyaktig ' +
        "én oppføring per steg gitt.";

  const prompt = lang === "en" ? `Recipe steps:\n${stepsList}` : `Oppskriftens steg:\n${stepsList}`;

  const result = await callClaudeJSON<{ labels: Array<{ stepId: string; label: string }> }>(system, prompt, 400, 0.3);
  const validStepIds = new Set(steps.map((s) => s.id));
  const labels: Record<string, string> = {};
  for (const entry of result.labels ?? []) {
    if (entry?.stepId && validStepIds.has(entry.stepId) && typeof entry.label === "string" && entry.label.trim()) {
      labels[entry.stepId] = entry.label.trim().slice(0, 40);
    }
  }

  await setCachedAiSuggestion(recipeId, "step_timer_labels", cacheKey, labels);
  return labels;
}

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

/** «JEG HAR X MINUTTER» (5.13) – grov bøtte-inndeling av en fritt oppgitt
 * minuttverdi, brukt BÅDE i cache-nøkkelen (holder antall unike cache-rader
 * nede – en cache-rad per eksakt minuttall ville gitt tilnærmet null
 * gjenbruk) og i selve AI-prompten (en bøtte som "rundt 60 minutter" er en
 * like nyttig hint til AI-en som et eksakt tall, og mer stabilt å resonnere
 * rundt). Bevisst IKKE en full parallell tidsbudsjett-løser (regne ut om
 * summen av retter faktisk går opp mot en tidslinje) – det er en vesentlig
 * tyngre oppgave som overlapper med hel-meny-timelinen (5.8) sitt ansvar;
 * denne bøtten er kun en MYK hint til meny-GENERERINGEN, ikke en garanti. */
function bucketAvailableMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "none";
  if (minutes <= 30) return "30";
  if (minutes <= 60) return "60";
  if (minutes <= 90) return "90";
  if (minutes <= 120) return "120";
  return "120+";
}

function availableMinutesPromptLine(minutes: number | null | undefined, lang: Lang): string {
  const bucket = bucketAvailableMinutes(minutes);
  if (bucket === "none") return "";
  const label = bucket === "120+" ? (lang === "en" ? "more than 120 minutes" : "mer enn 120 minutter") : `${bucket} ${lang === "en" ? "minutes" : "minutter"}`;
  return lang === "en"
    ? `\n\nTime available: around ${label} in total, from start of prep to the meal being ready. Keep the whole menu realistic within that – don't suggest courses that would blow this budget.`
    : `\n\nTilgjengelig tid: rundt ${label} totalt, fra forberedelser starter til måltidet er klart. Hold hele menyen realistisk innenfor dette – ikke foreslå retter som sprenger dette budsjettet.`;
}

function occasionPromptLine(occasion: MealOccasion | null | undefined, lang: Lang): string {
  if (!occasion) return "";
  const label = lang === "en" ? MEAL_OCCASION_LABELS[occasion].en : MEAL_OCCASION_LABELS[occasion].no;
  return lang === "en"
    ? `\n\nOccasion: ${label}. Let this softly guide ambition level, number of courses that feel natural, and tone – never override what the user has already chosen.`
    : `\n\nAnledning: ${label}. La dette myk-styre ambisjonsnivå, hva som føles naturlig antall retter, og tone – overstyr aldri det brukeren allerede har valgt.`;
}

/**
 * Foreslår en HEL meny rundt en gitt ankerrett (typisk oppskriften brukeren
 * står på når de trykker "Bygg en meny"). Ankerretten selv er IKKE med i
 * returnerte `courses` – kun de tre andre rollene, se filheaderen over.
 *
 * `occasion` (5.12) og `availableMinutes` (5.13) er BEGGE valgfrie, MYKE
 * hint til AI-en – de går inn i cache-nøkkelen (occasion direkte,
 * availableMinutes bøttet, se bucketAvailableMinutes over) slik at
 * forskjellige kombinasjoner ikke kolliderer i cachen, men de skal aldri
 * overstyre brukerens faktiske senere valg i menybyggeren (spesifikasjonen,
 * 5.12) – kun påvirke SELVE FORSLAGET som genereres.
 */
export async function generateMealPlan(
  anchorRecipeId: string,
  anchor: { title: string; description: string; categoryName: string | null },
  lang: Lang = "no",
  context?: { occasion?: MealOccasion | null; availableMinutes?: number | null },
): Promise<MealPlanSuggestion> {
  const anchorRole = inferCourseRoleFromCategory(anchor.categoryName);
  const otherRoles = ALL_MEAL_COURSE_ROLES.filter((role) => role !== anchorRole);
  const allowedRoles = new Set(otherRoles);

  const candidates = await getPublishedRecipeSummaries();
  const others = candidates.filter((r) => r.id !== anchorRecipeId);
  const validIds = new Set(others.map((r) => r.id));
  const byId = new Map(others.map((r) => [r.id, r]));

  const occasion = context?.occasion ?? null;
  const minutesBucket = bucketAvailableMinutes(context?.availableMinutes);
  const cacheKey = `${lang}:${anchorRole}:${occasion ?? "none"}:${minutesBucket}`;
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
          `the "${anchorRole}" (${roleLabel(anchorRole)}) course. Consider the remaining courses: ${otherRoleList}. ` +
          "IMPORTANT: not every remaining role should always be filled – judge each one on whether it genuinely " +
          "adds something. In particular, SKIP the \"side\" course whenever the anchor dish already stands well on " +
          "its own (e.g. a pasta dish, a stew or one-pot dish that already includes starch/vegetables, a dish " +
          "normally eaten without a separate side) – forcing a side onto a dish that doesn't need one makes for a " +
          "worse menu, not a better one. Starter and dessert are usually still worth suggesting for a proper meal, " +
          "but skip them too if truly nothing fits well. For each role you DO include, either (a) pick the " +
          "best-fitting EXISTING recipe from the candidate list (by id), or (b) if nothing in the list genuinely " +
          "fits well, invent a plausible NEW dish suggestion (title + short description) for that role. Prefer " +
          "existing recipes when something actually fits – the point is to help the user discover dishes they " +
          "already have, not to always invent something new. Aim for real variety across the whole menu (don't " +
          "repeat the anchor dish's main ingredient/style unnecessarily) – and specifically avoid always defaulting " +
          "to the single most generic, \"safe\" starter or dessert. Different anchor dishes should genuinely lead " +
          "to different starter/dessert choices, not the same go-to pick every time. Respond with ONLY JSON: " +
          '{"menuTitle": "short, appetizing name for the whole menu, max 6 words", "courses": [{"role": "one of the ' +
          'roles listed above – OMIT a role from this array entirely if you decided to skip it", "source": ' +
          '"existing"|"suggested", "recipeId": "ONLY when source is existing, an id from the candidate list – never ' +
          'invent one", "title": "ONLY when source is suggested", "description": "1-2 sentences, ONLY when source is ' +
          'suggested", "note": "short note in English, max 1 sentence, on why this dish fits the menu"}]}.'
        : "Du hjelper til med å sette sammen en komplett, helhetlig meny rundt en gitt ankerrett. Ankerretten fyller " +
          `allerede rollen "${anchorRole}" (${roleLabel(anchorRole)}). Vurder de resterende rollene: ${otherRoleList}. ` +
          "VIKTIG: ikke alle gjenværende roller skal alltid fylles – vurder hver enkelt ut fra om den faktisk gir " +
          "noe ekstra. Spesielt: HOPP OVER tilbehør ('side') når ankerretten allerede står godt på egen hånd (f.eks. " +
          "en pastarett, en gryte/wok-rett som allerede inneholder stivelse/grønnsaker, eller en rett som normalt " +
          "spises uten eget tilbehør) – å presse på et tilbehør en rett ikke trenger gjør menyen dårligere, ikke " +
          "bedre. Forrett og dessert er vanligvis fortsatt verdt å foreslå for et helstøpt måltid, men hopp over " +
          "også dem hvis virkelig ingenting passer godt. For HVER rolle du VELGER å inkludere, enten (a) velg den " +
          "best passende EKSISTERENDE oppskriften fra kandidatlisten (oppgi id-en), eller (b) hvis ingenting i " +
          "listen genuint passer godt, finn opp et plausibelt NYTT rett-forslag (tittel + kort beskrivelse) for den " +
          "rollen. Prioriter eksisterende oppskrifter når noe faktisk passer – poenget er å hjelpe brukeren oppdage " +
          "retter de allerede har, ikke å alltid finne opp noe nytt. Sikt mot ekte variasjon i hele menyen (ikke " +
          "gjenta ankerrettens hovedingrediens/stil unødig) – og unngå spesielt å alltid falle tilbake på den ene " +
          "mest generiske, \"trygge\" forretten eller desserten. Ulike ankerretter bør genuint gi ulike " +
          "forrett-/dessertvalg, ikke det samme faste svaret hver gang. Svar KUN med JSON: {\"menuTitle\": \"kort, " +
          'appetittvekkende navn på hele menyen, maks 6 ord", "courses": [{"role": "én av rollene listet over – ' +
          'UTELAT en rolle helt fra denne listen dersom du valgte å hoppe over den", "source": "existing"|' +
          '"suggested", "recipeId": "KUN når source er existing, en id fra kandidatlisten – finn aldri opp en selv", ' +
          '"title": "KUN når source er suggested", "description": "1-2 setninger, KUN når source er suggested", ' +
          '"note": "kort forklaring på norsk, maks 1 setning, om hvorfor denne retten passer i menyen"}]}.';

    const prompt =
      (lang === "en"
        ? `Anchor dish (${roleLabel(anchorRole)}): ${anchor.title}\n${anchor.description}\n\nOther recipes available:\n${candidateList}`
        : `Ankerrett (${roleLabel(anchorRole)}): ${anchor.title}\n${anchor.description}\n\nAndre tilgjengelige oppskrifter:\n${candidateList}`) +
      occasionPromptLine(occasion, lang) +
      availableMinutesPromptLine(context?.availableMinutes, lang);

    // Temperatur hevet fra 0.4 til 0.75 (etter tilbakemelding: samme
    // forrett/dessert gikk igjen på tvers av ulike ankerretter) – kombinert
    // med promptens nye eksplisitte variasjons-krav over, ikke temperatur
    // alene, siden en liten katalog ellers lett konvergerer mot ett "trygt"
    // svar uansett temperatur.
    const result = await callClaudeJSON<RawMealPlan>(system, prompt, 900, 0.75);

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

/**
 * "GJØR DET TIL EN KVELD" – KURATERT KVELD (Fase 5-finale, 5.9–5.11/5.14).
 * ÉN strukturert AI-handling for HELE menyen under ett, brukt av
 * EveningExperience.tsx – ULIK getMealMoodSuggestion/getMealWineRecommendation
 * i lib/actions/ai.ts (som returnerer fri, ucachet prosa for ÉN ting om
 * gangen): denne returnerer alle seksjonene fra spesifikasjonens 5.9-mock
 * (vin/bord/stemning/musikk, pluss en valgfri serveringstips) i ETT kall,
 * som ETT strukturert, cachet objekt – matcher mock-oppsettets diskrete
 * seksjoner (MENY/I GLASSET/PÅ BORDET/STEMNING/MUSIKK) direkte, i stedet for
 * å måtte parse dem ut av løpende tekst.
 *
 * IKKE knyttet til én bestemt oppskrift (recipeId: null, samme presedens som
 * "mood_mode") – cache-nøkkelen bæres i stedet av språk + anledning + selve
 * rettesammensetningen (roller+titler), slik at to besøkende som bygger
 * NØYAKTIG samme meny (høyst sannsynlig når begge tar utgangspunkt i samme
 * katalog-oppskrifter) deler ett AI-kall i stedet for ett hver.
 *
 * "HVORFOR?" OG ORDFORKLARINGER (26.08.2026, Henrik: "hva om man kan trykke
 * på noe på hver av disse og få en forklaring på hvorfor det bør gjøres
 * sånn? ... og hvis det brukes avanserte ord ... så bør det gå an å få en
 * forklaring på hva det er"). Begge deler genereres i DETTE ene kallet
 * sammen med resten (ikke et eget AI-kall trigget av selve trykket) – all
 * begrunnelse/ordforklaring er dermed allerede klar og cachet når brukeren
 * trykker, ingen ekstra ventetid. why-feltene og `glossary` er BEVISST
 * valgfrie (`?`) i typen, ikke fordi AI-en får lov å utelate dem i en fersk
 * respons (se prompten – de er påkrevd der), men fordi ELDRE cache-rader
 * (skrevet før denne utvidelsen) mangler dem helt – uten `?` ville en gammel
 * cachet rad blitt lest inn med `undefined` på et felt typen påsto alltid
 * fantes. UI-et (EveningExperience.tsx) skjuler ganske enkelt
 * "hvorfor?"-knappen der feltet mangler, i stedet for å krasje – se samme
 * "gamle cache-rader har ikke det nye feltet"-resonnement i
 * AI_CACHE_FEATURES sin kommentar til "evening_curation" i types.ts.
 */

export interface EveningGlossaryTerm {
  term: string;
  definition: string;
}

export interface EveningCuration {
  wine: {
    style: string;
    /** Kort, 1-4 ords "overskrift" for vinstilen (f.eks. "Pinot Grigio",
     * eller "Lett, tørr hvit" når ingen kjent drue passer presist) – lagt
     * til 26.08.2026 for den redaksjonelle "I GLASSET"-scenen (se
     * EveningExperience.tsx), IKKE en produsent/flaske. Valgfri (`?`) av
     * samme "eldre cache-rader mangler feltet"-grunn som why/glossary
     * under – UI-et faller da tilbake til å vise `style` som eneste
     * overskrift. */
    label?: string;
    /** 2-4 korte stikkord (f.eks. ["Italia", "Hvit", "Frisk"]) – dynamisk
     * fra AI-en ut fra DENNE vinstilen, ALDRI hardkodet. Samme
     * eldre-cache-fallback som `label`. */
    tags?: string[];
    note: string;
    why?: string | null;
  } | null;
  tableAccompaniments: string[];
  /** Nøkkelen er den EKSAKTE strengen fra tableAccompaniments – begge er
   * utledet fra samme rå AI-par (se RawEveningCuration.tableAccompaniments
   * under), aldri sammenlignet/matchet i etterkant, så de kan aldri komme ut
   * av synk med hverandre. */
  tableAccompanimentsWhy?: Record<string, string>;
  mood: string;
  moodWhy?: string | null;
  musicDirection: string;
  musicDirectionWhy?: string | null;
  servingTip: string | null;
  servingTipWhy?: string | null;
  /** Avanserte/fremmede fagord brukt et sted i teksten over (f.eks. "fleur
   * de sel"), med en kort forklaring – tom liste er det normale/forventede
   * svaret når ingenting uvanlig ble brukt. */
  glossary?: EveningGlossaryTerm[];
}

interface RawEveningCuration {
  wineStyle?: string;
  wineLabel?: string;
  wineTags?: string[];
  wineNote?: string;
  wineWhy?: string;
  // Ett objekt per bord-ting (IKKE et parallelt array til
  // tableAccompaniments) – garanterer at teksten og begrunnelsen aldri kan
  // havne på feil indeks i forhold til hverandre.
  tableAccompaniments?: Array<{ item?: string; why?: string }>;
  mood?: string;
  moodWhy?: string;
  musicDirection?: string;
  musicDirectionWhy?: string;
  servingTip?: string | null;
  servingTipWhy?: string | null;
  glossary?: Array<{ term?: string; definition?: string }>;
}

/** Stabil, kort signatur for HVILKE retter menyen faktisk består av – del av
 * cache-nøkkelen, se filheaderen over. Rekkefølge (rolle-sortert) gjør at
 * samme rettesett alltid gir samme signatur uansett i hvilken rekkefølge
 * slotsene ligger i selve MealSession. */
function courseSignature(courses: { roleLabel: string; title: string }[]): string {
  return courses
    .map((c) => `${c.roleLabel}:${c.title}`)
    .join("|")
    .toLowerCase()
    .slice(0, 300);
}

export async function getEveningCuration(
  meal: { title: string; courses: { roleLabel: string; title: string }[] },
  occasion: MealOccasion | null,
  lang: Lang = "no",
): Promise<EveningCuration> {
  const cacheKey = `${lang}:${occasion ?? "none"}:${courseSignature(meal.courses)}`;
  const cached = await getCachedAiSuggestion<EveningCuration>(null, "evening_curation", cacheKey);
  if (cached) return cached;

  const courseList = meal.courses.map((c) => `${c.roleLabel}: ${c.title}`).join("\n");
  const occasionLine = occasionPromptLine(occasion, lang);

  // 5.10 er eksplisitt om HVA som skal unngås – de faktiske, navngitte
  // dårlige eksemplene fra spesifikasjonen sendes inn som negative eksempler
  // i selve prompten (samme "vis AI-en hva den IKKE skal gjøre"-mønster som
  // getParallelTaskHints/getMenuSuggestions bruker for gyldige id-er).
  const system =
    lang === "en"
      ? "You curate the frame around a complete home-cooked meal – NOT the food itself, but the wine, table, mood " +
        "and music that go around it. Tone is the single most important thing here: short, confident, sophisticated, " +
        "concrete, understated. NEVER write generic lifestyle-AI poetry. Bad examples to actively avoid – do not " +
        'write anything resembling: "Let the aroma fill the room as the magic unfolds.", "Create unforgettable ' +
        'moments around the table.", "A symphony of flavors." A good mood line looks like: "Dim the lights. Chill ' +
        'the wine. Let dinner take the time it takes." – one or two short, concrete sentences, never a long romantic ' +
        "paragraph.\n\n" +
        "Wine: suggest a WINE STYLE/GRAPE (e.g. \"a bright, medium-bodied red like Pinot Noir\") that fits the " +
        "meal's arc as a whole, never a specific producer/bottle. If truly nothing sensible fits (e.g. a very " +
        "casual weeknight meal), you may omit wine entirely. ALSO give a short 1-4 word LABEL for it – a known " +
        "grape/style name if one genuinely fits (e.g. \"Pinot Grigio\", \"Chianti-style red\") or otherwise a " +
        "short generic descriptor (e.g. \"Crisp dry rosé\") – never a producer/bottle name. ALSO give 2-4 short " +
        "one-or-two-word TAGS describing it (e.g. [\"Italy\", \"White\", \"Crisp\"] – country/region if relevant, " +
        "color, character).\n" +
        "Table: 2-4 short, concrete, modest items actually placed on the table (e.g. \"a simple green salad\", " +
        "\"good bread\", \"cold water\") – never anything expensive or elaborate to buy.\n" +
        "Music: a short GENRE or search phrase only (e.g. \"Warm Italian dinner\", \"Soul & jazz\", \"Late-night " +
        "acoustic\") – NEVER invent a specific playlist name, a fake streaming link, or claim integration with any " +
        "music service. Just a direction someone could type into their own player.\n" +
        "Serving tip: ONLY include one if genuinely relevant to this specific meal (e.g. a dish that needs to be " +
        "served immediately, or benefits from warm plates) – omit it entirely rather than inventing decorative " +
        "advice just to fill space.\n\n" +
        "Reasoning (\"why\" fields): for wine/table items/mood/music, ALSO give a short, factual one-sentence " +
        "reason for that specific suggestion – not a repeat of the suggestion itself, the actual REASONING behind " +
        'it (e.g. for "good bread + butter" on the table: "balances the richness of the sauce and gives something ' +
        'to mop it up with", NOT "bread and butter are tasty"). Keep these matter-of-fact, never salesy.\n\n' +
        "Glossary: scan everything you just wrote (wine note, table items, mood, music, serving tip) for any " +
        'non-obvious, foreign, or specialist culinary/wine term you used (e.g. "fleur de sel", "beurre blanc", a ' +
        "specific grape variety) and give each a short, plain-language definition a home cook without specialist " +
        "knowledge would understand. Empty list if you used no such terms – do NOT force an entry just to fill " +
        "the list.\n\n" +
        'Respond with ONLY JSON in exactly this shape: {"wineStyle": string|omit if none, "wineLabel": "1-4 word ' +
        'label, omit if no wine", "wineTags": ["...", ...] (2-4 short tags, omit if no wine), "wineNote": "max 1 short ' +
        'sentence, omit if no wine", "wineWhy": "max 1 short sentence reasoning, omit if no wine", ' +
        '"tableAccompaniments": [{"item": "...", "why": "max 1 short sentence reasoning"}, ...] (2-4 items), ' +
        '"mood": "1-2 short, concrete sentences, imperative/instructional tone", "moodWhy": "max 1 short sentence ' +
        'reasoning", "musicDirection": "a short genre/search phrase, never a specific song/playlist/link", ' +
        '"musicDirectionWhy": "max 1 short sentence reasoning", "servingTip": "1 short sentence, or omit/null if ' +
        'not genuinely relevant", "servingTipWhy": "max 1 short sentence reasoning, omit/null if no serving tip", ' +
        '"glossary": [{"term": "...", "definition": "max 1 short plain-language sentence"}, ...] (empty array if none)}'
      : "Du kuraterer rammen rundt et komplett hjemmelaget måltid – IKKE selve maten, men vinen, bordet, stemningen " +
        "og musikken rundt. Tonen er det aller viktigste her: kort, trygg, sofistikert, konkret, understated. " +
        'Skriv ALDRI generisk livsstils-AI-poesi. Dårlige eksempler du aktivt skal unngå – skriv ikke noe som ' +
        'ligner: «La duften fylle rommet mens magien utfolder seg.», «Skap uforglemmelige øyeblikk rundt bordet.», ' +
        '«En symfoni av smaker.» En god stemningslinje ser slik ut: «Demp lyset. Sett vinen kaldt. La middagen ta ' +
        "den tiden den tar.» – én eller to korte, konkrete setninger, aldri et langt romantisk avsnitt.\n\n" +
        "Vin: foreslå en VINSTIL/DRUE (f.eks. «en frisk, middels fyldig rødvin som Pinot Noir») som passer hele " +
        "måltidets bue – aldri en bestemt produsent/flaske. Hvis virkelig ingenting fornuftig passer (f.eks. en " +
        "veldig avslappet hverdagsmiddag), kan vin utelates helt. Gi OGSÅ en kort 1-4 ords ETIKETT for den – et " +
        "kjent drue-/stilnavn dersom ett genuint passer (f.eks. «Pinot Grigio», «Chianti-aktig rødvin») eller " +
        "ellers en kort, generisk beskrivelse (f.eks. «Frisk, tørr rosé») – aldri et produsent-/flaskenavn. Gi " +
        "OGSÅ 2-4 korte stikkord om den (f.eks. [«Italia», «Hvit», «Frisk»] – land/region der relevant, farge, " +
        "karakter).\n" +
        "Bord: 2-4 korte, konkrete, nøkterne ting som faktisk står på bordet (f.eks. «en enkel grønn salat», «godt " +
        "brød», «kaldt vann») – aldri noe dyrt eller ambisiøst å kjøpe inn.\n" +
        "Musikk: KUN en kort SJANGER eller søkefrase (f.eks. «Warm Italian dinner», «Soul & jazz», «Late-night " +
        "acoustic») – finn ALDRI opp et konkret spillelistenavn, en falsk strømmelenke, eller påstå integrasjon med " +
        "noen musikktjeneste. Bare en retning noen kan skrive inn i sin egen spiller.\n" +
        "Serveringstips: KUN med dersom det er genuint relevant for akkurat dette måltidet (f.eks. en rett som må " +
        "serveres umiddelbart, eller trenger varme tallerkener) – utelat det helt fremfor å finne opp dekorative " +
        "råd bare for å fylle plass.\n\n" +
        "Begrunnelser («hvorfor»-feltene): for vin/bord-ting/stemning/musikk skal du OGSÅ gi en kort, saklig " +
        "setning som forklarer HVORFOR akkurat det forslaget – ikke en gjentagelse av selve forslaget, men den " +
        'FAKTISKE begrunnelsen (f.eks. for «godt brød + smør» på bordet: «balanserer den kraftige sausen og gir ' +
        'noe å dyppe i», IKKE «brød og smør er godt»). Hold disse nøkterne og saklige, aldri selgende.\n\n' +
        "Ordforklaringer: se gjennom alt du nettopp skrev (vinnote, bord-ting, stemning, musikk, serveringstips) " +
        'etter avanserte, fremmede eller fagspesifikke mat-/vinord du selv brukte (f.eks. «fleur de sel», «beurre ' +
        "blanc», en bestemt drue) og gi hver av dem en kort, enkel forklaring en hjemmekokk uten fagkunnskap ville " +
        "forstått. Tom liste dersom du ikke brukte noen slike ord – ikke tving frem en oppføring bare for å fylle " +
        "listen.\n\n" +
        'Svar KUN med JSON på nøyaktig denne formen: {"wineStyle": streng|utelates hvis ingen, "wineLabel": "1-4 ' +
        'ords etikett, utelat hvis ingen vin", "wineTags": ["...", ...] (2-4 korte stikkord, utelat hvis ingen ' +
        'vin), "wineNote": "maks 1 ' +
        'kort setning, utelat hvis ingen vin", "wineWhy": "maks 1 kort begrunnelsessetning, utelat hvis ingen ' +
        'vin", "tableAccompaniments": [{"item": "...", "why": "maks 1 kort begrunnelsessetning"}, ...] (2-4 ting), ' +
        '"mood": "1-2 korte, konkrete setninger, imperativ/instruerende tone", "moodWhy": "maks 1 kort ' +
        'begrunnelsessetning", "musicDirection": "en kort sjanger/søkefrase, aldri en konkret sang/spilleliste/' +
        'lenke", "musicDirectionWhy": "maks 1 kort begrunnelsessetning", "servingTip": "1 kort setning, eller ' +
        'utelat/null hvis ikke genuint relevant", "servingTipWhy": "maks 1 kort begrunnelsessetning, utelat/null ' +
        'hvis intet serveringstips", "glossary": [{"term": "...", "definition": "maks 1 kort, enkel setning"}, ' +
        '...] (tom liste hvis ingen)}';

  const prompt =
    (lang === "en"
      ? `Menu: ${meal.title}\n\nCourses:\n${courseList}`
      : `Meny: ${meal.title}\n\nRetter:\n${courseList}`) + occasionLine;

  // Hevet fra 500 (før why-feltene/glossary ble lagt til) – samme
  // begrunnelse som 6000-grensen i lib/actions/recipe-import.ts: et for lavt
  // tak kutter JSON-svaret av midt inne og gir en uleselig parse-feil i
  // stedet for et faktisk resultat.
  const raw = await callClaudeJSON<RawEveningCuration>(system, prompt, 900, 0.6);

  const wineStyle = (raw.wineStyle ?? "").trim().slice(0, 120);
  const wineLabel = (raw.wineLabel ?? "").toString().trim().slice(0, 40);
  const wineTags = Array.isArray(raw.wineTags)
    ? raw.wineTags
        .map((tagValue) => (tagValue ?? "").toString().trim().slice(0, 24))
        .filter((tagValue) => tagValue !== "")
        .slice(0, 4)
    : [];

  // Ett rå-objekt per bord-ting (item+why sammen, se RawEveningCuration sin
  // kommentar) – tableAccompaniments (listen som faktisk vises) og
  // tableAccompanimentsWhy (oppslag for "hvorfor?"-knappen) utledes BEGGE
  // herfra, aldri matchet mot hverandre i etterkant.
  const accompanimentEntries = (raw.tableAccompaniments ?? [])
    .map((entry) => ({
      item: (entry?.item ?? "").toString().trim().slice(0, 80),
      why: (entry?.why ?? "").toString().trim().slice(0, 200),
    }))
    .filter((entry) => entry.item !== "")
    .slice(0, 4);
  const tableAccompaniments = accompanimentEntries.map((entry) => entry.item);
  const tableAccompanimentsWhy: Record<string, string> = {};
  for (const entry of accompanimentEntries) {
    if (entry.why) tableAccompanimentsWhy[entry.item] = entry.why;
  }

  const glossary: EveningGlossaryTerm[] = (raw.glossary ?? [])
    .map((entry) => ({
      term: (entry?.term ?? "").toString().trim().slice(0, 60),
      definition: (entry?.definition ?? "").toString().trim().slice(0, 220),
    }))
    .filter((entry) => entry.term !== "" && entry.definition !== "")
    .slice(0, 10);

  const curation: EveningCuration = {
    wine: wineStyle
      ? {
          style: wineStyle,
          label: wineLabel || undefined,
          tags: wineTags.length > 0 ? wineTags : undefined,
          note: (raw.wineNote ?? "").trim().slice(0, 200),
          why: (raw.wineWhy ?? "").toString().trim().slice(0, 200) || null,
        }
      : null,
    tableAccompaniments,
    tableAccompanimentsWhy,
    mood: (raw.mood ?? "").trim().slice(0, 300),
    moodWhy: (raw.moodWhy ?? "").toString().trim().slice(0, 200) || null,
    musicDirection: (raw.musicDirection ?? "").trim().slice(0, 120),
    musicDirectionWhy: (raw.musicDirectionWhy ?? "").toString().trim().slice(0, 200) || null,
    servingTip: raw.servingTip ? raw.servingTip.toString().trim().slice(0, 200) || null : null,
    servingTipWhy: raw.servingTipWhy ? raw.servingTipWhy.toString().trim().slice(0, 200) || null : null,
    glossary,
  };

  await setCachedAiSuggestion(null, "evening_curation", cacheKey, curation);
  return curation;
}

/**
 * "LURER DU PÅ NOE?" (27.08.2026) – fritt spørsmål om ÉN BESTEMT oppskrift,
 * stilt av en besøkende direkte på oppskriftssiden (f.eks. "Kan jeg lage
 * pannebrødet først og la det ligge klart på benken under et håndkle?").
 * Svaret baserer seg KUN på selve oppskriften som gis inn (ingredienser,
 * fremgangsmåte, tips) pluss AI-ens generelle kokkekunnskap – ingen egen
 * database å slå opp i utover det.
 *
 * Bevisst uten strukturert JSON (callClaude, ikke callClaudeJSON/ToolJSON) –
 * svaret ER selve teksten, ingen felter å skille fra hverandre, så det
 * enklere, rå tekst-kallet er tilstrekkelig og litt raskere.
 *
 * Cachet (i motsetning til f.eks. getWineRecommendation i lib/actions/ai.ts,
 * som er bevisst UCACHET) – her er det reell sannsynlighet for at flere
 * besøkende stiller nøyaktig det samme, vanlige spørsmålet om samme rett
 * ("kan denne fryses?", "kan jeg bruke X i stedet for Y?"), og cache-nøkkelen
 * (normalisert spørsmålstekst) fanger nettopp det gjenbrukstilfellet uten å
 * late som ULIKE spørsmål har samme svar.
 */
interface RecipeQuestionIngredientInput {
  amount: string | null;
  unit: string | null;
  name: string;
  note: string | null;
}

interface RecipeQuestionGroupInput {
  title: string | null;
  items: RecipeQuestionIngredientInput[];
}

interface RecipeQuestionStepInput {
  groupTitle: string | null;
  stepNumber: number;
  text: string;
}

export interface RecipeQuestionContextInput {
  title: string;
  description: string;
  ingredientGroups: RecipeQuestionGroupInput[];
  steps: RecipeQuestionStepInput[];
  tips?: string | null;
}

/** Maks lengde på selve spørsmålsteksten – rundhåndet nok for et ekte
 * kjøkkenspørsmål, stramt nok til å holde både prompten og cache-nøkkelen
 * fornuftige (se ai-cache.ts sin "hold nøkkelen kort"-anbefaling). */
const MAX_QUESTION_LENGTH = 500;

export async function answerRecipeQuestion(
  recipeId: string,
  recipe: RecipeQuestionContextInput,
  question: string,
  lang: Lang = "no",
): Promise<string> {
  const trimmedQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) {
    throw new Error(lang === "en" ? "Write a question first." : "Skriv et spørsmål først.");
  }

  // Normalisering er bevisst enkel (kun trim+lowercase via toLowerCase(),
  // ikke f.eks. fjerning av tegnsetting/dobbeltmellomrom) – to spørsmål som
  // er nesten, men ikke helt like, bør fortsatt kunne gi litt ulike svar. Vi
  // vil bare unngå å betale for et rent ordrett duplikat.
  const cacheKey = `${lang}:${trimmedQuestion.toLowerCase()}`;
  const cached = await getCachedAiSuggestion<string>(recipeId, "recipe_question", cacheKey);
  if (cached) return cached;

  const ingredientsText =
    recipe.ingredientGroups
      .flatMap((group) =>
        group.items.map((item) => {
          const line = [item.amount, item.unit, item.name].filter(Boolean).join(" ");
          return item.note ? `- ${line} (${item.note})` : `- ${line}`;
        }),
      )
      .join("\n") || (lang === "en" ? "(none listed)" : "(ingen oppgitt)");

  const stepsText =
    recipe.steps.map((step) => `${step.stepNumber}. ${step.text}`).join("\n") ||
    (lang === "en" ? "(none listed)" : "(ingen oppgitt)");

  const system =
    lang === "en"
      ? "You are a friendly, knowledgeable cooking assistant answering a home cook's SPECIFIC question about the " +
        "exact recipe they are looking at right now. Base your answer ONLY on the recipe given below plus general, " +
        "sound cooking knowledge - never invent ingredients or steps that aren't there. Answer directly and " +
        'practically, max 3-4 sentences, no heading, no preamble like "Great question!". If the question has ' +
        "nothing to do with cooking or this recipe, politely say you can only help with questions about this dish."
      : "Du er en vennlig, kunnskapsrik kjøkkenassistent som svarer på et konkret spørsmål en besøkende har om " +
        "NØYAKTIG den oppskriften de ser på akkurat nå. Basér svaret KUN på oppskriften under, pluss generell, " +
        "sunn kokkekunnskap - finn aldri på ingredienser eller steg som ikke står der. Svar direkte og praktisk, " +
        "maks 3-4 setninger, ingen overskrift, ingen innledning som «Godt spørsmål!». Dersom spørsmålet ikke har " +
        "noe med matlaging eller denne oppskriften å gjøre, si vennlig at du kun kan hjelpe med spørsmål om denne retten.";

  const prompt =
    lang === "en"
      ? `Recipe: ${recipe.title}\n${recipe.description ? `Description: ${recipe.description}\n` : ""}\nIngredients:\n${ingredientsText}\n\nSteps:\n${stepsText}\n${recipe.tips ? `\nTips: ${recipe.tips}\n` : ""}\nQuestion: ${trimmedQuestion}`
      : `Oppskrift: ${recipe.title}\n${recipe.description ? `Beskrivelse: ${recipe.description}\n` : ""}\nIngredienser:\n${ingredientsText}\n\nFremgangsmåte:\n${stepsText}\n${recipe.tips ? `\nTips: ${recipe.tips}\n` : ""}\nSpørsmål: ${trimmedQuestion}`;

  const answer = (await callClaude(system, prompt, 400, 0.4)).trim();

  await setCachedAiSuggestion(recipeId, "recipe_question", cacheKey, answer);
  return answer;
}
