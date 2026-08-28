"use server";

import {
  callClaude,
  callClaudeJSON,
  callClaudeToolJSON,
  callClaudeVisionJSON,
  callClaudeWebSearchJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { generateDishImageBase64 } from "@/lib/ai/openai";
import { uploadGeneratedRecipeImage } from "@/lib/actions/upload";
import { requireAdmin } from "@/lib/auth";
import type {
  VegetarianIngredientGroup,
  VegetarianStep,
  RecipeDraft,
  RecipeTimingEstimate,
  RecipeTipsAndWarnings,
  NewDishSuggestion,
  ExternalRecipeMatch,
  RecipeImprovementSuggestion,
} from "@/lib/types";
import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/config";
import { WINE_VERDICTS, type WineVerdict } from "@/lib/wine-verdict";
import type { Lang } from "@/lib/i18n/lang";

/**
 * AI-funksjoner for vin og vegetarvariant. Alle er PUBLIKE (ingen
 * requireAdmin) – de kalles direkte fra selve oppskriftssiden når en
 * besøkende trykker på en knapp, genereres på stedet, og lagrer ikke noe i
 * databasen (i motsetning til resten av oppskriftsinnholdet, som lagres
 * via lib/actions/recipes.ts).
 */

interface RecipeContext {
  title: string;
  description: string;
  ingredientNames: string[];
}

/** Kort, generell vinanbefaling – generert på forespørsel av en besøkende. */
export async function getWineRecommendation(recipe: RecipeContext, lang: Lang = "no"): Promise<string> {
  const system =
    lang === "en"
      ? "You are a knowledgeable sommelier who gives short, concrete wine pairing suggestions for dinner dishes, in English. " +
        "Since you don't have access to a specific wine selection right now, suggest a WINE STYLE/GRAPE (e.g. \"a full-bodied, dark red like Syrah or Malbec\"), not a specific producer. " +
        "Answer in max 2-3 sentences, warm and everyday in tone, no heading or preamble."
      : "Du er en kunnskapsrik sommelier som gir korte, konkrete vinanbefalinger til middagsretter, på norsk. " +
        "Siden du ikke har tilgang til et konkret vinsortiment akkurat nå, foreslå en VINSTIL/DRUE (f.eks. «en fyldig, mørk rødvin som Syrah eller Malbec»), ikke et bestemt produsentnavn. " +
        "Svar med maks 2-3 setninger, varmt og hverdagslig, ingen overskrift eller innledning.";

  const prompt =
    lang === "en"
      ? `Dish: ${recipe.title}\nDescription: ${recipe.description || "(no description)"}\nMain ingredients: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(unknown)"}\n\nSuggest a wine that goes well with this dish.`
      : `Rett: ${recipe.title}\nBeskrivelse: ${recipe.description || "(ingen beskrivelse)"}\nHovedingredienser: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(ukjent)"}\n\nForeslå en vin som passer til denne retten.`;

  const text = await callClaude(system, prompt, 250);
  return text.trim();
}

/**
 * MENYNIVÅ-VIN (Fase 5 – Experience, 5.6). Samme prinsipp som
 * getWineRecommendation over (vinSTIL, ikke et bestemt produsentnavn – det
 * er getVinmonopoletWineSuggestion i lib/actions/vinmonopolet.ts sin jobb),
 * men vurderer HELE MENYEN under ett i stedet for én rett – bygger direkte
 * på MealSession-objektet fra Fase 5 steg 1 (se
 * components/meal/MealView.tsx), ikke bare på ankerretten alene.
 *
 * IKKE cachet, av samme grunn som getWineRecommendation: en gitt
 * meny-sammensetning er en personlig, unik kombinasjon denne ene besøkende
 * satte sammen – langt mindre sannsynlig å gjenbrukes på tvers av andre
 * besøkende enn f.eks. et menyforslag for én bestemt oppskrift, så caching
 * ville gitt lite reell gjenbruksverdi for kompleksiteten det tilfører.
 */
export async function getMealWineRecommendation(
  meal: { title: string; courses: { roleLabel: string; title: string }[] },
  lang: Lang = "no",
): Promise<string> {
  const courseList = meal.courses.map((c) => `${c.roleLabel}: ${c.title}`).join("\n");

  const system =
    lang === "en"
      ? "You are a knowledgeable sommelier giving a wine recommendation for an ENTIRE MULTI-COURSE MEAL, not a " +
        "single dish. Consider the arc of the whole meal – suggest ONE wine style/grape (e.g. \"a medium-bodied " +
        "red like Pinot Noir\") that works well across as much of the meal as possible (starter and main in " +
        "particular). If the dessert genuinely needs something different (e.g. a sweet wine), say so briefly as a " +
        "second, separate suggestion – otherwise don't force a second wine in. Since you don't have access to a " +
        "specific wine selection right now, suggest a WINE STYLE/GRAPE, not a specific producer. Answer in max " +
        "3-4 sentences, warm and everyday in tone, no heading or preamble."
      : "Du er en kunnskapsrik sommelier som gir en vinanbefaling for ET HELT FLERRETTERS MÅLTID, ikke én enkelt " +
        "rett. Vurder hele måltidets bue – foreslå ÉN vinstil/drue (f.eks. «en middels fyldig rødvin som Pinot " +
        "Noir») som fungerer godt gjennom så mye av måltidet som mulig (særlig forrett og hovedrett). Hvis " +
        "desserten genuint trenger noe annet (f.eks. en søt vin), nevn det kort som et eget, andre forslag – ikke " +
        "press inn en vin nummer to hvis det ikke trengs. Siden du ikke har tilgang til et konkret vinsortiment " +
        "akkurat nå, foreslå en VINSTIL/DRUE, ikke et bestemt produsentnavn. Svar med maks 3-4 setninger, varmt " +
        "og hverdagslig, ingen overskrift eller innledning.";

  const prompt =
    lang === "en"
      ? `Menu: ${meal.title}\n\nCourses:\n${courseList}\n\nSuggest a wine (or wine plan) for this whole meal.`
      : `Meny: ${meal.title}\n\nRetter:\n${courseList}\n\nForeslå en vin (eller vin-plan) for hele dette måltidet.`;

  const text = await callClaude(system, prompt, 300);
  return text.trim();
}

/**
 * "GJØR DET TIL EN KVELD" – STEMNINGSFORSLAG (Fase 5 – Experience, siste
 * steg). Samme knapp-trigget, ukalte mønster som getMealWineRecommendation
 * rett over – vurderer HELE menyen under ett og foreslår en kort, varm
 * "ramme" rundt selve spisingen: musikk, borddekning/lys og en kort tone
 * for kvelden. Bevisst løpende, redaksjonell tekst (som vinforslaget)
 * fremfor strukturerte felter/ikoner – matcher "ingen AI-dashboard-følelse"
 * fremfor et sett med små kort/emojis.
 *
 * IKKE cachet – samme begrunnelse som vin: en gitt meny-sammensetning er
 * unik for denne besøkende, lite gjenbruksverdi på tvers av andre.
 */
export async function getMealMoodSuggestion(
  meal: { title: string; courses: { roleLabel: string; title: string }[] },
  lang: Lang = "no",
): Promise<string> {
  const courseList = meal.courses.map((c) => `${c.roleLabel}: ${c.title}`).join("\n");

  const system =
    lang === "en"
      ? "You help home cooks turn an ordinary dinner into a proper EVENING – not just food. Given a full menu " +
        "(all courses), suggest a short, warm mood/setting for the evening: what kind of music fits, a simple " +
        "table-setting or lighting idea, and one sentence on the overall tone (relaxed weeknight, a little " +
        "celebration, etc. – read this from the dishes themselves, don't ask). Be concrete and modest (candles, " +
        "a playlist genre, simple table linen) – never suggest buying anything expensive or elaborate. Answer in " +
        "max 3-4 sentences, warm and editorial in tone, no heading, no bullet points, no preamble."
      : "Du hjelper hjemmekokker med å gjøre en helt vanlig middag til en skikkelig KVELD – ikke bare mat. Gitt en " +
        "hel meny (alle rettene), foreslå en kort, varm stemning/ramme for kvelden: hva slags musikk som passer, " +
        "en enkel idé til borddekning eller lys, og én setning om den generelle tonen (rolig hverdagskveld, litt " +
        "feiring, osv. – les dette ut av selve rettene, ikke spør). Vær konkret og nøktern (stearinlys, en " +
        "sjanger til spillelisten, enkel duk) – foreslå aldri noe dyrt eller ambisiøst å kjøpe inn. Svar med maks " +
        "3-4 setninger, varmt og redaksjonelt i tonen, ingen overskrift, ingen punktliste, ingen innledning.";

  const prompt =
    lang === "en"
      ? `Menu: ${meal.title}\n\nCourses:\n${courseList}\n\nSuggest a mood/setting for this evening.`
      : `Meny: ${meal.title}\n\nRetter:\n${courseList}\n\nForeslå en stemning/ramme for denne kvelden.`;

  const text = await callClaude(system, prompt, 300);
  return text.trim();
}

/** Gjest skriver inn et vinnavn, får en vurdering av match mot retten. */
export async function checkWineMatch(
  recipe: RecipeContext,
  wineNameRaw: string,
  lang: Lang = "no",
): Promise<{ verdict: WineVerdict; reasoning: string; wineNameParsed: string }> {
  const wineName = wineNameRaw.trim().slice(0, 120);
  if (!wineName) {
    throw new Error(lang === "en" ? "Enter the name of a wine first." : "Skriv inn navnet på en vin først.");
  }

  const system =
    lang === "en"
      ? "You are a knowledgeable sommelier. You're given a dinner dish and the name of a wine typed in by a guest " +
        "(may be spelled inaccurately or incompletely). Interpret which wine/wine type is most likely meant, " +
        "and judge how well it pairs with the dish.\n\n" +
        'Respond with ONLY JSON in exactly this shape: {"verdict": "ikke_bra" | "greit" | "bra" | "meget_bra", "reasoning": "short reasoning in English, max 2 sentences", "wineNameParsed": "the wine/wine type as you interpreted it"}'
      : "Du er en kunnskapsrik sommelier. Du får en middagsrett og navnet på en vin skrevet inn av en gjest " +
        "(kan være stavet unøyaktig eller ufullstendig). Tolk hvilken vin/vintype det mest sannsynlig er snakk om, " +
        "og vurder hvor godt den passer til retten.\n\n" +
        'Svar KUN med JSON på nøyaktig denne formen: {"verdict": "ikke_bra" | "greit" | "bra" | "meget_bra", "reasoning": "kort begrunnelse på norsk, maks 2 setninger", "wineNameParsed": "vinen/vintypen slik du tolket den"}';

  const prompt =
    lang === "en"
      ? `Dish: ${recipe.title}\nDescription: ${recipe.description || "(no description)"}\nMain ingredients: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(unknown)"}\n\nWine given by guest: "${wineName}"`
      : `Rett: ${recipe.title}\nBeskrivelse: ${recipe.description || "(ingen beskrivelse)"}\nHovedingredienser: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(ukjent)"}\n\nVin oppgitt av gjest: "${wineName}"`;

  const result = await callClaudeJSON<{
    verdict: string;
    reasoning: string;
    wineNameParsed: string;
  }>(system, prompt, 300);

  return normalizeWineVerdict(result, wineName);
}

function normalizeWineVerdict(
  result: { verdict: string; reasoning: string; wineNameParsed: string },
  fallbackName: string,
): { verdict: WineVerdict; reasoning: string; wineNameParsed: string } {
  const verdict = (WINE_VERDICTS as readonly string[]).includes(result.verdict)
    ? (result.verdict as WineVerdict)
    : "greit";

  return {
    verdict,
    reasoning: (result.reasoning ?? "").slice(0, 500),
    wineNameParsed: (result.wineNameParsed ?? fallbackName).slice(0, 120),
  };
}

/** Gjest tar bilde av (eller velger fra bibliotek) en vinflaske/etikett – AI-en
 * leser etiketten og vurderer match mot retten i samme kall. Bildet lastes
 * aldri opp noe sted permanent; det sendes direkte videre til Anthropic sitt
 * API og kastes etterpå. */
export async function checkWineMatchFromImage(
  recipe: RecipeContext,
  image: { mediaType: string; base64Data: string },
  lang: Lang = "no",
): Promise<{ verdict: WineVerdict; reasoning: string; wineNameParsed: string }> {
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
      ? "You are a knowledgeable sommelier. You're shown a photo of a wine bottle or label taken by a guest, and a " +
        "dinner dish. Read the label as best you can (it may be angled, blurry, or partially visible) to identify " +
        "the wine (producer, grape/wine type, and vintage if visible). If you can't read the name clearly, describe " +
        "the wine style/color you can see instead, and note in wineNameParsed that the label was hard to read. If the " +
        "photo clearly doesn't show a wine bottle or label at all, set wineNameParsed to \"Not recognized as wine\" and " +
        "explain briefly in reasoning. Then judge how well the wine (or wine style, if the name is uncertain) pairs " +
        "with the dish.\n\n" +
        'Respond with ONLY JSON in exactly this shape: {"verdict": "ikke_bra" | "greit" | "bra" | "meget_bra", "reasoning": "short reasoning in English, max 2 sentences", "wineNameParsed": "the wine as you identified it from the photo"}'
      : "Du er en kunnskapsrik sommelier. Du får et bilde av en vinflaske eller etikett tatt av en gjest, og en " +
        "middagsrett. Les etiketten så godt du kan (den kan være vinklet, uskarp, eller delvis skjult) for å " +
        "identifisere vinen (produsent, drue-/vintype, og gjerne årgang hvis synlig). Hvis du ikke klarer å lese " +
        "navnet tydelig, beskriv i stedet vinstilen/fargen du kan se, og noter i wineNameParsed at etiketten var " +
        "vanskelig å lese. Hvis bildet tydelig ikke viser en vinflaske eller etikett i det hele tatt, sett " +
        'wineNameParsed til "Ikke gjenkjent som vin" og forklar kort i reasoning. Vurder deretter hvor godt vinen ' +
        "(eller vinstilen, om navnet er usikkert) passer til retten.\n\n" +
        'Svar KUN med JSON på nøyaktig denne formen: {"verdict": "ikke_bra" | "greit" | "bra" | "meget_bra", "reasoning": "kort begrunnelse på norsk, maks 2 setninger", "wineNameParsed": "vinen slik du identifiserte den fra bildet"}';

  const prompt =
    lang === "en"
      ? `Dish: ${recipe.title}\nDescription: ${recipe.description || "(no description)"}\nMain ingredients: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(unknown)"}\n\nIdentify the wine in the photo and judge the pairing.`
      : `Rett: ${recipe.title}\nBeskrivelse: ${recipe.description || "(ingen beskrivelse)"}\nHovedingredienser: ${recipe.ingredientNames.slice(0, 15).join(", ") || "(ukjent)"}\n\nIdentifiser vinen på bildet og vurder matchen.`;

  const result = await callClaudeVisionJSON<{
    verdict: string;
    reasoning: string;
    wineNameParsed: string;
  }>(
    system,
    prompt,
    { mediaType: image.mediaType as SupportedImageMediaType, base64Data: image.base64Data },
    300,
  );

  return normalizeWineVerdict(result, lang === "en" ? "Unknown wine" : "Ukjent vin");
}

/** Genererer et midlertidig AI-bilde av retten (via OpenAI) og laster det opp
 * til samme bildelagring som vanlige admin-opplastinger. I MOTSETNING til de
 * andre AI-funksjonene i denne filen er dette admin-only (requireAdmin) –
 * brukes fra "Generer AI-bilde"-knappen i admin-skjemaet (se
 * components/admin/ImageUploadField.tsx), som en plassholder frem til et
 * ekte foto av retten legges inn. */
export async function generateRecipeHeroImage(
  recipe: RecipeContext,
): Promise<{ success: boolean; url?: string; error?: string }> {
  await requireAdmin();

  if (!recipe.title.trim()) {
    return { success: false, error: "Legg inn en tittel før du genererer et bilde." };
  }

  try {
    const base64Png = await generateDishImageBase64(recipe);
    const bytes = Buffer.from(base64Png, "base64");
    const uploadResult = await uploadGeneratedRecipeImage(bytes, "image/png", "png");

    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error ?? "Opplasting feilet." };
    }
    return { success: true, url: uploadResult.url };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Kunne ikke generere bilde. Prøv igjen.",
    };
  }
}

interface VegetarianSuggestionInput {
  title: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string; note: string | null }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}

interface VegetarianSuggestionResult {
  note: string;
  ingredientGroups: VegetarianIngredientGroup[];
  steps: VegetarianStep[];
}

/** Gjør om AI-ens JSON-svar til garantert riktig type – modellen følger som
 * regel formatet vi ber om, men svarer av og til med f.eks. et tall der vi
 * ba om en tekststreng. Uten denne normaliseringen feiler lagringen i
 * admin-skjemaet med en valideringsfeil som er vanskelig å forstå. */
function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toStringValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

interface EnglishVariantInput {
  title: string;
  description: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string; note: string | null }[] }[];
  steps: { groupTitle: string | null; text: string }[];
  notes: string | null;
  tips: string | null;
  warnings: string | null;
}

interface EnglishVariantResult {
  title: string;
  description: string;
  ingredientGroups: VegetarianIngredientGroup[];
  steps: VegetarianStep[];
  notes: string | null;
  tips: string | null;
  warnings: string | null;
}

/** Oversetter tittel, beskrivelse, ingredienser, steg, notater og tips til engelsk –
 * generert på forespørsel av en besøkende, samme mønster som getVegetarianVariant
 * (lagres ikke i databasen). Selve UI-et rundt (knapper, feilmeldinger osv.) forblir
 * norsk – det er kun oppskriftsinnholdet som byttes til engelsk. */
export async function getEnglishVariant(input: EnglishVariantInput): Promise<EnglishVariantResult> {
  const system =
    "You are a professional culinary translator. You translate Norwegian recipes into natural, fluent English " +
    "for home cooks abroad. Translate the title, description, ingredient names/notes/group titles, step text " +
    "(and step group titles), and any notes/tips/warnings. Keep numeric amounts UNCHANGED. Translate Norwegian unit " +
    "abbreviations to their common English equivalents (ss → tbsp, ts → tsp, stk → drop the unit and rely on the " +
    "name, boks → can, pk/pakke → package/pkg; dl/g/kg/l/ml can stay as their normal English abbreviation). Do not " +
    "add, remove, or reorder ingredients or steps, and do not change quantities or the meaning of the instructions.\n\n" +
    'Respond with ONLY JSON in exactly this shape, where "amount", "unit", "note", "title", "groupTitle", "notes", ' +
    '"tips" and "warnings" are ALWAYS strings or null (never numbers): {"title": string, "description": string, ' +
    '"ingredientGroups": [{"title": string|null, "items": [{"amount": string|null, "unit": string|null, "name": string, "note": string|null}]}], ' +
    '"steps": [{"groupTitle": string|null, "text": string}], "notes": string|null, "tips": string|null, "warnings": string|null}';

  const prompt =
    `Title: ${input.title}\nDescription: ${input.description || "(none)"}\n\n` +
    `Ingredient groups:\n${JSON.stringify(input.ingredientGroups, null, 2)}\n\n` +
    `Steps:\n${JSON.stringify(input.steps, null, 2)}\n\n` +
    `Notes: ${input.notes || "(none)"}\nTips: ${input.tips || "(none)"}\nWarnings: ${input.warnings || "(none)"}`;

  const raw = await callClaudeJSON<{
    title?: unknown;
    description?: unknown;
    ingredientGroups?: unknown;
    steps?: unknown;
    notes?: unknown;
    tips?: unknown;
    warnings?: unknown;
  }>(system, prompt, 2500);

  if (!Array.isArray(raw.ingredientGroups) || !Array.isArray(raw.steps)) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  const ingredientGroups: VegetarianIngredientGroup[] = raw.ingredientGroups
    .map((g) => {
      const group = g as Record<string, unknown>;
      const items = Array.isArray(group.items) ? group.items : [];
      return {
        title: toStringOrNull(group.title),
        items: items
          .map((it) => {
            const item = it as Record<string, unknown>;
            return {
              amount: toStringOrNull(item.amount),
              unit: toStringOrNull(item.unit),
              name: toStringValue(item.name),
              note: toStringOrNull(item.note),
            };
          })
          .filter((item) => item.name !== ""),
      };
    })
    .filter((g) => g.items.length > 0);

  const steps: VegetarianStep[] = raw.steps
    .map((s) => {
      const step = s as Record<string, unknown>;
      return {
        groupTitle: toStringOrNull(step.groupTitle),
        text: toStringValue(step.text),
      };
    })
    .filter((s) => s.text !== "");

  return {
    title: toStringValue(raw.title) || input.title,
    description: toStringValue(raw.description),
    ingredientGroups,
    steps,
    notes: toStringOrNull(raw.notes),
    tips: toStringOrNull(raw.tips),
    warnings: toStringOrNull(raw.warnings),
  };
}

interface TitleDescriptionTranslationResult {
  title: string;
  description: string;
}

/** Oversetter KUN tittel og kort beskrivelse til engelsk – admin-only, mye
 * billigere/raskere enn getEnglishVariant over (som også oversetter
 * ingredienser/steg, og kun kjøres live på selve oppskriftssiden). Brukes
 * til å forhåndsgenerere recipes.title_en/description_en (se
 * lib/actions/recipes.ts -> generateEnglishTitleDescription), slik at
 * forsiden/lister kan vise engelsk tittel/beskrivelse momentant – uten et
 * AI-kall ved hver sidevisning. Selve lagringen skjer IKKE her, kun i
 * lib/actions/recipes.ts (denne funksjonen returnerer bare oversatt tekst). */
export async function translateTitleAndDescription(
  input: { title: string; description: string },
): Promise<TitleDescriptionTranslationResult> {
  await requireAdmin();

  const system =
    "You are a professional culinary translator. Translate this Norwegian recipe title and short teaser " +
    "description into natural, fluent English for home cooks abroad. Keep the tone, length and register close " +
    "to the original – the title should stay a short dish name (not a full sentence), and the description should " +
    "stay a short 1-2 sentence teaser, not a full explanation.\n\n" +
    'Respond with ONLY JSON in exactly this shape, where both fields are always strings (never null): ' +
    '{"title": string, "description": string}';

  const prompt = `Title: ${input.title}\nDescription: ${input.description || "(none)"}`;

  const raw = await callClaudeJSON<{ title?: unknown; description?: unknown }>(system, prompt, 400);

  return {
    title: toStringValue(raw.title) || input.title,
    description: toStringValue(raw.description),
  };
}

/** Oversetter KUN et kategorinavn til engelsk – admin-only, samme mønster
 * som translateTitleAndDescription over. Brukes til å forhåndsgenerere
 * categories.name_en (se lib/actions/categories.ts ->
 * generateEnglishCategoryName). */
export async function translateCategoryName(name: string): Promise<string> {
  await requireAdmin();

  const system =
    "You translate short Norwegian food-category names (e.g. website navigation labels like \"Kjøtt\", \"Tilbehør\") " +
    "into their natural, idiomatic English equivalent, in the same short label style (1-2 words, no explanations).\n\n" +
    'Respond with ONLY JSON in exactly this shape: {"name": string}';

  const raw = await callClaudeJSON<{ name?: unknown }>(system, `Category name: ${name}`, 100);
  return toStringValue(raw.name) || name;
}

interface UsMeasurementsInput {
  steps: { groupTitle: string | null; text: string }[];
  notes: string | null;
  tips: string | null;
  warnings: string | null;
}

interface UsMeasurementsResult {
  steps: VegetarianStep[];
  notes: string | null;
  tips: string | null;
  warnings: string | null;
}

/** Konverterer KUN mål nevnt i fri tekst (ovnstemperatur, form-/panne-størrelser
 * o.l.) i steg/notater/tips til vanlige US-ekvivalenter (°C → °F, cm → inches),
 * avrundet til normale/vanlige verdier. Endrer IKKE språk eller annen tekst –
 * fullstendig uavhengig av NO/EN-bryteren, og av ingrediensmengdene (de
 * konverteres separat og deterministisk, se lib/utils/units.ts). Generert på
 * forespørsel av en besøkende, lagres ikke i databasen. */
export async function getUsMeasurementsVariant(
  input: UsMeasurementsInput,
): Promise<UsMeasurementsResult> {
  const system =
    "You are a precise unit converter for recipe text. You are given recipe steps (and possibly notes/tips), " +
    "written in either Norwegian or English – you must NOT translate or change the language. Your ONLY job is to " +
    "find measurements mentioned in the text – oven/cooking temperatures, and physical sizes like pan/dish/tin " +
    "dimensions – and convert them to their standard US customary equivalent, rounded to a normal, commonly used " +
    "value (e.g. 200°C -> 400°F, not 392°F; 175°C -> 350°F; a 23 cm pan -> a 9-inch pan, not '9.06 inch'). " +
    "Do NOT change ingredient amounts mentioned in the text (e.g. \"the remaining 100 g sugar\") unless they " +
    "specifically look like an oven temperature or a pan/dish size – leave those as-is, they are handled " +
    "separately elsewhere. Do NOT change ANY other wording – copy every other word EXACTLY as given, including " +
    "punctuation and casing. If a step/note/tip/warning has no relevant measurement, return it completely " +
    "unchanged. Keep the exact same number of steps in the exact same order.\n\n" +
    'Respond with ONLY JSON in exactly this shape: {"steps": [{"groupTitle": string|null, "text": string}], ' +
    '"notes": string|null, "tips": string|null, "warnings": string|null}';

  const prompt =
    `Steps:\n${JSON.stringify(input.steps, null, 2)}\n\n` +
    `Notes: ${input.notes || "(none)"}\nTips: ${input.tips || "(none)"}\nWarnings: ${input.warnings || "(none)"}`;

  const raw = await callClaudeJSON<{
    steps?: unknown;
    notes?: unknown;
    tips?: unknown;
    warnings?: unknown;
  }>(system, prompt, 2500);

  if (!Array.isArray(raw.steps)) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  const steps: VegetarianStep[] = raw.steps.map((s) => {
    const step = s as Record<string, unknown>;
    return {
      groupTitle: toStringOrNull(step.groupTitle),
      text: toStringValue(step.text),
    };
  });

  // Fallback: modellen SKAL beholde antall steg likt – dersom den likevel
  // svarer med et annet antall (sjeldent, men mulig), er det tryggere å
  // beholde originalteksten enn å vise et feil antall steg i UI-et.
  if (steps.length !== input.steps.length) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  return {
    steps,
    notes: toStringOrNull(raw.notes) ?? input.notes,
    tips: toStringOrNull(raw.tips) ?? input.tips,
    warnings: toStringOrNull(raw.warnings) ?? input.warnings,
  };
}

/** Foreslå en vegetarvariant (erstattede ingredienser + justerte steg) – ren
 * AI-logikk, ingen database/auth her. FRA OG MED tilbakemelding 25.08.2026
 * kalles denne KUN fra generateVegetarianVariant (admin-gatet, se
 * lib/actions/recipes.ts) – ikke lenger direkte fra en besøkendes knapp på
 * oppskriftssiden (se filheaderen til VegetarianVariant i lib/types.ts).
 * Selve funksjonen er strukturelt uendret (fortsatt "PUBLIK" i den forstand
 * at den ikke har sin egen requireAdmin – samme mønster som resten av
 * filens funksjoner, se filheaderen øverst), admin-sjekken skjer hos
 * kalleren. */
export async function getVegetarianVariant(
  input: VegetarianSuggestionInput,
): Promise<VegetarianSuggestionResult> {
  const system =
    "Du er en erfaren kokk som lager vegetarvarianter av oppskrifter, på norsk. " +
    "Du får en oppskrifts ingrediensgrupper og fremgangsmåte. Lag en vegetarversjon ved å erstatte kjøtt/fisk/sjømat " +
    "med passende vegetarske alternativer (f.eks. kjøttdeig → soya-kjøttdeig eller linser, kylling → jackfruit eller tofu, " +
    "bacon → røkt tofu). Behold alt annet UENDRET (mengder, andre ingredienser, rekkefølge). " +
    "Returner HELE ingredienslisten og HELE fremgangsmåten på nytt (ikke bare det som endret seg), men juster kun " +
    "tekst i steg der selve tilberedningen faktisk blir annerledes med erstatningen – la andre steg stå akkurat som originalen. " +
    "Hvis oppskriften allerede er helt vegetarisk, returner ingredientGroups og steps identisk med originalen, og sett note til " +
    '"Oppskriften er allerede vegetarisk."\n\n' +
    'Svar KUN med JSON på nøyaktig denne formen, der "amount" og "unit" og "note" og "title" og "groupTitle" ALLTID er ' +
    'tekststrenger (aldri tall) eller null: {"note": "kort forklaring på norsk av hva som er byttet ut, maks 2 setninger", ' +
    '"ingredientGroups": [{"title": string|null, "items": [{"amount": string|null, "unit": string|null, "name": string, "note": string|null}]}], ' +
    '"steps": [{"groupTitle": string|null, "text": string}]}';

  const prompt = `Oppskrift: ${input.title}\n\nIngrediensgrupper:\n${JSON.stringify(input.ingredientGroups, null, 2)}\n\nFremgangsmåte:\n${JSON.stringify(input.steps, null, 2)}`;

  const raw = await callClaudeJSON<{
    note?: unknown;
    ingredientGroups?: unknown;
    steps?: unknown;
  }>(system, prompt, 2000);

  if (!Array.isArray(raw.ingredientGroups) || !Array.isArray(raw.steps)) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  const ingredientGroups: VegetarianIngredientGroup[] = raw.ingredientGroups
    .map((g) => {
      const group = g as Record<string, unknown>;
      const items = Array.isArray(group.items) ? group.items : [];
      return {
        title: toStringOrNull(group.title),
        items: items
          .map((it) => {
            const item = it as Record<string, unknown>;
            return {
              amount: toStringOrNull(item.amount),
              unit: toStringOrNull(item.unit),
              name: toStringValue(item.name),
              note: toStringOrNull(item.note),
            };
          })
          .filter((item) => item.name !== ""),
      };
    })
    .filter((g) => g.items.length > 0);

  const steps: VegetarianStep[] = raw.steps
    .map((s) => {
      const step = s as Record<string, unknown>;
      return {
        groupTitle: toStringOrNull(step.groupTitle),
        text: toStringValue(step.text),
      };
    })
    .filter((s) => s.text !== "");

  return {
    note: toStringValue(raw.note).slice(0, 500),
    ingredientGroups,
    steps,
  };
}

export interface RecipeDraftInput {
  title: string;
  description: string;
  servings: number;
  categoryName?: string | null;
}

/** Runder av til nærmeste 5 minutter (10, 15, 20 …), aldri ujevne tall som
 * 11 eller 13 – AI-en gir ofte overraskende presise tall (Henrik
 * 26.08.2026: "den må runde opp så det ikke blir sånn 11 min forberedelser,
 * men da 10"). Minimum 5 minutter for enhver reell, positiv verdi – aldri 0. */
function sanitizeDraftMinutes(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Genererer et KOMPLETT oppskriftsutkast (ingredienser, fremgangsmåte, tid,
 * vanskelighetsgrad) ut fra en tittel+beskrivelse admin allerede har skrevet
 * – se filheaderen til RecipeDraft i lib/types.ts. Typisk brukt rett etter
 * "Opprett som oppskrift" fra et AI-menyforslag (se
 * components/meal/MealView.tsx), der tittel/beskrivelse/porsjoner allerede
 * er fylt ut, men resten av oppskriften mangler.
 *
 * Admin-gatet (kalles kun fra generateRecipeDraft i lib/actions/recipes.ts,
 * ALDRI direkte fra en besøkendes knapp) – samme grunn som
 * getVegetarianVariant over ikke lenger er det.
 */
export async function getRecipeDraft(input: RecipeDraftInput): Promise<RecipeDraft> {
  const system =
    "Du er en erfaren kokk og oppskriftsforfatter som skriver oppskrifter for en norsk, redaksjonell " +
    "kokebok-app (À TABLE). Du får en tittel og en kort beskrivelse av en rett, og skal dikte opp en komplett, " +
    "realistisk oppskrift som passer godt til beskrivelsen – ingredienser MED konkrete, fornuftige mengder " +
    "tilpasset det oppgitte antall porsjoner, og en fremgangsmåte steg for steg. Skriv kort, konkret og " +
    "appetittvekkende, uten unødvendig poesi eller overdrivelser – samme nøkterne, presise stil som resten av " +
    'kokebokens oppskrifter. Del ingrediensene inn i naturlige grupper der det gir mening (f.eks. "Til sausen", ' +
    '"Til garnityr") – ellers ÉN gruppe uten tittel. Hvert steg skal beskrive ÉN sammenhengende handling (ikke ' +
    "flere uavhengige oppgaver presset inn i samme steg). Foreslå en realistisk forberedelses- og koketid i " +
    "minutter (hver for seg) og en vanskelighetsgrad som faktisk passer rettens kompleksitet.\n\n" +
    'Svar KUN med JSON på nøyaktig denne formen, der "amount"/"unit"/"name"/"note"/"title"/"groupTitle" ALLTID ' +
    'er tekststrenger (aldri tall) eller null: {"prepTimeMinutes": tall|null, "cookTimeMinutes": tall|null, ' +
    '"difficulty": "enkel"|"middels"|"avansert", "ingredientGroups": [{"title": string|null, "items": ' +
    '[{"amount": string, "unit": string, "name": string, "note": string|null}]}], "steps": [{"groupTitle": ' +
    "string|null, \"text\": string}]}";

  const contextLines = [
    `Tittel: ${input.title}`,
    input.description.trim() ? `Beskrivelse: ${input.description.trim()}` : null,
    `Porsjoner: ${input.servings}`,
    input.categoryName ? `Kategori: ${input.categoryName}` : null,
  ].filter((line): line is string => Boolean(line));

  const raw = await callClaudeJSON<{
    prepTimeMinutes?: unknown;
    cookTimeMinutes?: unknown;
    difficulty?: unknown;
    ingredientGroups?: unknown;
    steps?: unknown;
  }>(system, contextLines.join("\n"), 2200, 0.6);

  if (!Array.isArray(raw.ingredientGroups) || !Array.isArray(raw.steps)) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  const ingredientGroups: VegetarianIngredientGroup[] = raw.ingredientGroups
    .map((g) => {
      const group = g as Record<string, unknown>;
      const items = Array.isArray(group.items) ? group.items : [];
      return {
        title: toStringOrNull(group.title),
        items: items
          .map((it) => {
            const item = it as Record<string, unknown>;
            return {
              amount: toStringOrNull(item.amount),
              unit: toStringOrNull(item.unit),
              name: toStringValue(item.name),
              note: toStringOrNull(item.note),
            };
          })
          .filter((item) => item.name !== ""),
      };
    })
    .filter((g) => g.items.length > 0);

  const steps: VegetarianStep[] = raw.steps
    .map((s) => {
      const step = s as Record<string, unknown>;
      return {
        groupTitle: toStringOrNull(step.groupTitle),
        text: toStringValue(step.text),
      };
    })
    .filter((s) => s.text !== "");

  if (ingredientGroups.length === 0 || steps.length === 0) {
    throw new Error("Klarte ikke å generere en fullstendig oppskrift. Prøv igjen, evt. med en mer detaljert beskrivelse.");
  }

  const difficulty: Difficulty =
    typeof raw.difficulty === "string" && (DIFFICULTY_LEVELS as readonly string[]).includes(raw.difficulty)
      ? (raw.difficulty as Difficulty)
      : "middels";

  return {
    ingredientGroups,
    steps,
    prepTimeMinutes: sanitizeDraftMinutes(raw.prepTimeMinutes),
    cookTimeMinutes: sanitizeDraftMinutes(raw.cookTimeMinutes),
    difficulty,
  };
}

export interface RecipeTimingEstimateInput {
  title: string;
  description: string;
  servings: number;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}

/**
 * "Estimer tid og vanskelighetsgrad" (26.08.2026, ønsket av Henrik – se
 * filheaderen til RecipeTimingEstimate i lib/types.ts). I MOTSETNING til
 * getRecipeDraft over dikter denne IKKE opp en oppskrift – den leser den
 * FAKTISKE, allerede skrevne ingredienslisten og fremgangsmåten (samme
 * prinsipp som generateNutritionInfo i lib/actions/recipes.ts sender med
 * FAKTISKE mengder, ikke bare navn) og estimerer ut fra det.
 *
 * Admin-gatet (kalles kun fra estimateRecipeTiming i
 * lib/actions/recipes.ts, ALDRI direkte fra en besøkendes knapp).
 */
export async function estimateRecipeTiming(input: RecipeTimingEstimateInput): Promise<RecipeTimingEstimate> {
  const system =
    "Du er en erfaren kokk som estimerer realistisk tidsbruk og vanskelighetsgrad for en oppskrift som allerede " +
    "er skrevet ferdig – ut fra den FAKTISKE ingredienslisten og fremgangsmåten under, ikke ut fra tittelen " +
    "alene. Vurder hvor lang tid forberedelsene tar (rense, skjære, marinere, røre sammen osv. – alt FØR selve " +
    "tilberedningen) og hvor lang tid selve tilberedningen tar (steking, koking, baking, hviletid i ovn osv.), " +
    "samt hvor krevende retten er å gjennomføre for en vanlig hjemmekokk. Rund ALLTID av til nærmeste 5 " +
    "minutter (5, 10, 15, 20, 25 …) – ALDRI ujevne tall som 7, 11 eller 18. Oppgi tilberedningstid som et " +
    'intervall (min/max) når det er naturlig variasjon (f.eks. "stek i 25-30 minutter") – sett max til samme ' +
    "tall som min hvis det ikke er noen reell variasjon.\n\n" +
    'Svar KUN med JSON: {"prepTimeMinutes": tall|null, "cookTimeMinutes": tall|null, "cookTimeMinutesMax": ' +
    'tall|null, "difficulty": "enkel"|"middels"|"avansert"}.';

  const ingredientLines = input.ingredientGroups
    .flatMap((g) => g.items)
    .map((i) => [i.amount, i.unit, i.name].filter((part) => part && part.trim()).join(" "))
    .join("\n");
  const stepLines = input.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  const prompt =
    `Rett: ${input.title}\n${input.description.trim()}\nPorsjoner: ${input.servings}\n\n` +
    `Ingredienser:\n${ingredientLines}\n\nFremgangsmåte:\n${stepLines}`;

  const raw = await callClaudeJSON<{
    prepTimeMinutes?: unknown;
    cookTimeMinutes?: unknown;
    cookTimeMinutesMax?: unknown;
    difficulty?: unknown;
  }>(system, prompt, 300, 0.2);

  const difficulty: Difficulty =
    typeof raw.difficulty === "string" && (DIFFICULTY_LEVELS as readonly string[]).includes(raw.difficulty)
      ? (raw.difficulty as Difficulty)
      : "middels";

  const cookTimeMinutes = sanitizeDraftMinutes(raw.cookTimeMinutes);
  const cookTimeMinutesMaxRaw = sanitizeDraftMinutes(raw.cookTimeMinutesMax);
  // Kun behold max dersom den faktisk er STØRRE enn min – ellers er det bare
  // min gjentatt, og feltet skal stå tomt (samme "intervall kun når det
  // faktisk er ett" som parseMinutesRange i RecipeForm.tsx allerede følger).
  const cookTimeMinutesMax =
    cookTimeMinutesMaxRaw != null && cookTimeMinutes != null && cookTimeMinutesMaxRaw > cookTimeMinutes
      ? cookTimeMinutesMaxRaw
      : null;

  return {
    prepTimeMinutes: sanitizeDraftMinutes(raw.prepTimeMinutes),
    cookTimeMinutes,
    cookTimeMinutesMax,
    difficulty,
  };
}

export interface RecipeTipsAndWarningsInput {
  title: string;
  description: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}

/**
 * "Generer tips og pass på" (27.08.2026, ønsket av Henrik: "gjør sånn at
 * jeg kan generere tips og 'pass på' nederst på siden når jeg oppretter
 * eller redigerer oppskrifter"). Samme "les den FAKTISKE, allerede skrevne
 * ingredienslisten og fremgangsmåten – ikke bare tittelen"-prinsipp som
 * estimateRecipeTiming over, se filheaderen til RecipeTipsAndWarnings i
 * lib/types.ts. Genererer BEGGE felt i ett kall (ett Claude-kall er nok
 * billigere enn to, og feltene deler samme kontekst).
 *
 * Admin-gatet (kalles kun fra generateRecipeTipsAndWarnings i
 * lib/actions/recipes.ts, ALDRI direkte fra en besøkendes knapp).
 */
export async function generateRecipeTipsAndWarnings(input: RecipeTipsAndWarningsInput): Promise<RecipeTipsAndWarnings> {
  const system =
    "Du er en erfaren kokk som skriver to korte notiser til en oppskrift som allerede er skrevet ferdig, ut fra " +
    "den FAKTISKE ingredienslisten og fremgangsmåten under – ikke ut fra tittelen alene, og ikke generisk " +
    'matlagingsråd som kunne stått på hvilken som helst oppskrift.\n\n' +
    '"tips": praktiske råd spesifikt for DENNE retten – f.eks. hvordan oppbevare rester, hva den passer godt til, ' +
    "en variasjon som fungerer, eller en teknikk som gjør resultatet bedre.\n" +
    '"warnings" ("pass på"): de vanligste tabbene eller fallgruvene for AKKURAT DENNE retten – f.eks. et steg som ' +
    "lett brenner seg, en ingrediens som lett blir overkokt, eller en rekkefølge som er lett å gjøre feil.\n\n" +
    "Vær kort og konkret (1-3 setninger per felt, maks 2 korte avsnitt om det trengs). Skriv i vanlig norsk " +
    "brødtekst med vanlige punktum og komma – bruk ALDRI lange tankestreker (—), kun vanlige bindestreker eller " +
    "komma. Sett feltet til null (ikke tom streng) dersom du ikke finner noe reelt, spesifikt å si for akkurat " +
    "denne retten.\n\n" +
    'Svar KUN med JSON: {"tips": tekst|null, "warnings": tekst|null}.';

  const ingredientLines = input.ingredientGroups
    .flatMap((g) => g.items)
    .map((i) => [i.amount, i.unit, i.name].filter((part) => part && part.trim()).join(" "))
    .join("\n");
  const stepLines = input.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  const prompt =
    `Rett: ${input.title}\n${input.description.trim()}\n\n` +
    `Ingredienser:\n${ingredientLines}\n\nFremgangsmåte:\n${stepLines}`;

  const raw = await callClaudeJSON<{ tips?: unknown; warnings?: unknown }>(system, prompt, 400, 0.4);

  const cleanText = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    tips: cleanText(raw.tips),
    warnings: cleanText(raw.warnings),
  };
}

export interface RecipeDescriptionInput {
  title: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
  categoryName: string | null;
}

/**
 * "Generer kort beskrivelse" (27.08.2026, ønsket av Henrik: "jeg vil også
 * kunne generere 'Kort beskrivelse' av retten etter å ha fylt ut resten").
 * Samme "les den FAKTISKE, allerede skrevne ingredienslisten og
 * fremgangsmåten – ikke bare tittelen"-prinsipp som estimateRecipeTiming/
 * generateRecipeTipsAndWarnings over. I MOTSETNING til generateRecipeDraft
 * (som bruker en admin-skrevet beskrivelse som INPUT for å dikte opp resten
 * av oppskriften) går denne veien MOTSATT: beskrivelsen er OUTPUT, generert
 * fra den ferdige ingredienslisten/fremgangsmåten.
 *
 * Admin-gatet (kalles kun fra generateRecipeDescription i
 * lib/actions/recipes.ts, ALDRI direkte fra en besøkendes knapp).
 */
export async function generateRecipeDescription(input: RecipeDescriptionInput): Promise<string> {
  const system =
    "Du er en erfaren matredaktør som skriver en kort, innbydende beskrivelse av en oppskrift, ut fra den FAKTISKE " +
    "ingredienslisten og fremgangsmåten under – ikke bare tittelen. Beskrivelsen skal friste og gi et raskt " +
    "inntrykk av retten (f.eks. smak, konsistens eller hva som gjør den spesiell) – IKKE en oppsummering av " +
    "fremgangsmåten steg for steg, og IKKE bare en gjentakelse av tittelen.\n\n" +
    "Skriv 1-2 setninger, maks ca. 200 tegn. Skriv i vanlig norsk brødtekst med vanlige punktum og komma – bruk " +
    "ALDRI lange tankestreker (—), kun vanlige bindestreker eller komma. Ikke finn på ingredienser, anledninger " +
    "eller detaljer som ikke faktisk følger av listen under, og unngå slitte klisjeer.\n\n" +
    'Svar KUN med JSON: {"description": tekst}.';

  const ingredientLines = input.ingredientGroups
    .flatMap((g) => g.items)
    .map((i) => [i.amount, i.unit, i.name].filter((part) => part && part.trim()).join(" "))
    .join("\n");
  const stepLines = input.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  const prompt =
    `Rett: ${input.title}${input.categoryName ? ` (kategori: ${input.categoryName})` : ""}\n\n` +
    `Ingredienser:\n${ingredientLines}\n\nFremgangsmåte:\n${stepLines}`;

  const raw = await callClaudeJSON<{ description?: unknown }>(system, prompt, 200, 0.5);

  return typeof raw.description === "string" ? raw.description.trim() : "";
}

export interface NewDishSuggestionInput {
  /** Ingredienser admin har for hånden – fritekst, samme form som pantry-
   * matchingens ingredienser (splitIngredientList). */
  availableIngredients: string[];
  /** Valgfritt ønske om type mat (f.eks. "noe asiatisk", "en salat") – null
   * betyr at AI-en står fritt. */
  desiredType: string | null;
  /** Titler på oppskrifter som FINNES på nettstedet fra før – gitt som
   * kontekst slik at AI-en kan unngå å foreslå noe som allerede er dekket,
   * og heller finne et reelt hull i katalogen. IKKE sendt som noe admin skal
   * velge blant (i motsetning til getMenuSuggestions/getMoodRecommendations
   * i lib/actions/kitchen-intelligence.ts, som velger BLANT eksisterende
   * oppskrifter) – denne funksjonen skal alltid dikte opp noe NYTT. */
  existingRecipeTitles: string[];
}

/**
 * "Foreslå nye retter" (27.08.2026, ønsket av Henrik – se filheaderen til
 * NewDishSuggestion i lib/types.ts). Admin-gatet (kalles kun fra
 * suggestNewDishIdeas i lib/actions/recipes.ts, ALDRI direkte fra en
 * besøkendes knapp) – samme mønster som getRecipeDraft/estimateRecipeTiming
 * over. IKKE cachet: input er admin sin egen, ad-hoc kombinasjon av
 * ingredienser + ønsket type mat hver gang, så et cachet svar ville aldri
 * faktisk bli gjenbrukt (samme begrunnelse som getMealWineRecommendation
 * lenger opp i denne filen).
 */
export async function suggestNewDishIdeas(input: NewDishSuggestionInput): Promise<NewDishSuggestion[]> {
  const system =
    "Du er en erfaren kokk og redaktør som hjelper til med å utvide en norsk, redaksjonell kokebok-app (À TABLE) " +
    "med NYE retter. Du får en liste over ingredienser en admin har for hånden, ev. et ønske om type mat, og en " +
    "liste over titler på retter som ALLEREDE finnes på nettstedet. Foreslå 3-5 HELT NYE retteideer – IKKE " +
    "oppskrifter som allerede finnes i listen, og heller ikke noe som er for likt en eksisterende tittel (unngå " +
    "nære duplikater, f.eks. foreslå ikke enda en «kremet kyllinggryte» hvis en slik allerede finnes) – tenk på " +
    "dette som å finne et reelt hull i katalogen, ikke bare å matche ingrediensene. Prioriter ideer som faktisk " +
    "bruker flere av de oppgitte ingrediensene godt. Hvis et ønsket type mat er oppgitt, hold deg til det – " +
    "ellers stå fritt, men hold deg til retter som passer en hverdagslig, redaksjonell kokebok (ikke eksotiske " +
    "eller vanskelig tilgjengelige retter). Skriv kort, konkret og appetittvekkende, uten unødvendig poesi – samme " +
    "nøkterne stil som resten av kokebokens tekster. Returner færre (også null) fremfor å presse frem dårlige " +
    "ideer dersom ingenting genuint passer. Oppgi også hvilke andre ingredienser retten faktisk trenger, UTOVER " +
    "det admin allerede har oppgitt – kun det som faktisk trengs for å lage retten (f.eks. et krydder, en " +
    "sausbase eller en tilbehørsingrediens), ikke en fullstendig handleliste med basisvarer som salt/pepper/olje.\n\n" +
    'Svar KUN med JSON på nøyaktig denne formen: {"suggestions": [{"title": "kort tittel på norsk", ' +
    '"description": "kort, appetittvekkende beskrivelse, maks 2 setninger", "reason": "kort forklaring på norsk ' +
    'av hvorfor dette er et godt tillegg (hull i katalogen og/eller god bruk av ingrediensene), maks 1 setning", ' +
    '"usesIngredients": ["kun de av de oppgitte ingrediensene retten faktisk bruker"], "missingIngredients": ' +
    '["ingredienser retten trenger utover det admin oppga, kun navn"]}]}';

  const contextLines = [
    `Ingredienser admin har: ${input.availableIngredients.join(", ") || "(ingen oppgitt)"}`,
    input.desiredType ? `Ønsket type mat: ${input.desiredType}` : null,
    `Retter som allerede finnes på nettstedet:\n${input.existingRecipeTitles.slice(0, 300).join("\n") || "(ingen ennå)"}`,
  ].filter((line): line is string => Boolean(line));

  const raw = await callClaudeJSON<{ suggestions?: unknown }>(system, contextLines.join("\n\n"), 1500, 0.7);

  if (!Array.isArray(raw.suggestions)) {
    throw new Error("Fikk et uventet svarformat fra AI-en. Prøv igjen.");
  }

  const availableLower = new Set(input.availableIngredients.map((i) => i.toLowerCase()));

  return raw.suggestions
    .map((s) => {
      const item = s as Record<string, unknown>;
      const usesIngredientsRaw = Array.isArray(item.usesIngredients) ? item.usesIngredients : [];
      const missingIngredientsRaw = Array.isArray(item.missingIngredients) ? item.missingIngredients : [];
      return {
        title: toStringValue(item.title).slice(0, 120),
        description: toStringValue(item.description).slice(0, 400),
        reason: toStringValue(item.reason).slice(0, 300),
        // Behold kun de AI-en faktisk fikk oppgitt (samme valideringsmønster
        // som getMenuSuggestions filtrerer på gyldige id-er) – forkast
        // eventuelle ingredienser AI-en fant på selv.
        usesIngredients: usesIngredientsRaw
          .map((u) => toStringValue(u))
          .filter((u) => u !== "" && availableLower.has(u.toLowerCase())),
        // Motsatt filter av usesIngredients over: her forkastes det som
        // FAKTISK er blant det admin oppga (skulle uansett ikke skjedd, men
        // gjør UI-et robust mot at AI-en ved en feil lister en ingrediens
        // admin allerede har som "mangler").
        missingIngredients: missingIngredientsRaw
          .map((m) => toStringValue(m).slice(0, 80))
          .filter((m) => m !== "" && !availableLower.has(m.toLowerCase())),
      };
    })
    .filter((s) => s.title !== "")
    .slice(0, 5);
}

/** Kuratert liste over kjente, pålitelige norske matsider – valgt av Henrik
 * 27.08.2026 ("sider som matprat osv"). Bevisst en fast, kort liste (ikke
 * fritt søk på hele nettet) for å holde kildekvaliteten oppe. */
const EXTERNAL_RECIPE_SITES = ["matprat.no", "godt.no", "tine.no", "coop.no", "meny.no", "ica.no"];

export interface ExternalRecipeMatchInput {
  availableIngredients: string[];
  desiredType: string | null;
}

/**
 * "Finn oppskrifter andre steder" (27.08.2026, ønsket av Henrik – se
 * filheaderen til ExternalRecipeMatch i lib/types.ts). Admin-gatet (kalles
 * kun fra findExternalRecipeMatches i lib/actions/recipes.ts). IKKE cachet
 * – samme begrunnelse som suggestNewDishIdeas over (admin sin egen, ad-hoc
 * ingredienskombinasjon hver gang, lite reell gjenbruksverdi).
 */
const EXTERNAL_MATCH_RESULT_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Oppskriftens faktiske tittel" },
          url: { type: "string", description: "Den faktiske, fullstendige URL-en du fant via søk" },
          siteName: { type: "string", description: "Kort nettstedsnavn, f.eks. Matprat eller Godt.no" },
          note: { type: "string", description: "Kort forklaring på norsk av hvorfor den passer, maks 1 setning" },
          missingIngredients: {
            type: "array",
            items: { type: "string" },
            description: "Ingredienser DEN oppskriften trenger utover det admin oppga, kun navn – tom liste hvis usikker",
          },
        },
        required: ["title", "url", "siteName", "note", "missingIngredients"],
      },
    },
  },
  required: ["matches"],
} as const;

export async function findExternalRecipeMatches(input: ExternalRecipeMatchInput): Promise<ExternalRecipeMatch[]> {
  const system =
    "Du hjelper en admin i en norsk kokebok-app med å finne EKSISTERENDE oppskrifter på andre, kjente norske " +
    "matnettsteder som passer ingrediensene admin har for hånden. Bruk søkeverktøyet til å faktisk finne ekte, " +
    "fungerende oppskriftssider – finn ALDRI på en URL eller tittel selv, kun det du faktisk fant via søk. " +
    "Foreslå inntil 5 oppskrifter som bruker flere av de oppgitte ingrediensene godt. Hvis et ønsket type mat er " +
    "oppgitt, hold deg til det – ellers stå fritt. Returner kun treff du faktisk fant via søk – færre (også null) " +
    "er bedre enn å presse frem dårlige eller usikre treff. Oppgi også, ut fra det du faktisk så av oppskriftens " +
    "ingrediensliste i søketreffet, hvilke ingredienser DEN oppskriften bruker utover det admin allerede har " +
    "oppgitt – kun det som faktisk trengs, ikke en fullstendig handleliste med basisvarer som salt/pepper/olje. " +
    "Er du usikker på den ekte oppskriftens fulle ingrediensliste, la denne stå tom fremfor å gjette.";

  const contextLines = [
    `Ingredienser admin har: ${input.availableIngredients.join(", ") || "(ingen oppgitt)"}`,
    input.desiredType ? `Ønsket type mat: ${input.desiredType}` : null,
  ].filter((line): line is string => Boolean(line));

  const { data: raw, searchResults } = await callClaudeWebSearchJSON<{ matches?: unknown }>(
    system,
    contextLines.join("\n"),
    EXTERNAL_MATCH_RESULT_SCHEMA,
    {
      allowedDomains: EXTERNAL_RECIPE_SITES,
      maxUses: 5,
      maxTokens: 1500,
    },
  );

  if (!Array.isArray(raw.matches)) {
    throw new Error("Fikk et uventet svarformat fra AI-søket. Prøv igjen.");
  }

  const availableLower = new Set(input.availableIngredients.map((i) => i.toLowerCase()));

  return raw.matches
    .map((m) => {
      const item = m as Record<string, unknown>;
      const missingIngredientsRaw = Array.isArray(item.missingIngredients) ? item.missingIngredients : [];
      return {
        title: toStringValue(item.title).slice(0, 160),
        url: toStringValue(item.url).slice(0, 500),
        siteName: toStringValue(item.siteName).slice(0, 60),
        note: toStringValue(item.note).slice(0, 300),
        // Samme motsatte filter som i suggestNewDishIdeas over: forkast alt
        // som faktisk ER blant det admin oppga.
        missingIngredients: missingIngredientsRaw
          .map((mi) => toStringValue(mi).slice(0, 80))
          .filter((mi) => mi !== "" && !availableLower.has(mi.toLowerCase())),
      };
    })
    .map((m) => {
      if (m.title === "" || m.url === "") return null;
      // Bytt ALLTID ut url-en fra modellens JSON-tekst med den EKTE url-en
      // fra searchResults (strukturert API-data) – se filheaderen til
      // callClaudeWebSearchJSON i lib/ai/anthropic.ts for hvorfor: modellen
      // kan gjøre en liten avskrivingsfeil (Henrik 27.08.2026 fant et
      // Tine-treff med én bokstav for mye i URL-en) selv om den faktisk
      // fant riktig side via søket. Finnes ingen trygg match, forkastes
      // treffet heller enn å risikere en feil/ødelagt lenke.
      const realUrl = resolveVerifiedUrl(m.url, m.title, searchResults);
      return realUrl ? { ...m, url: realUrl } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    // Siste sikkerhetsnett i tillegg til allowed_domains i selve søket:
    // forkast alt som ikke er en gyldig, faktisk http(s)-URL fra et av de
    // tillatte nettstedene, i tilfelle modellen likevel skulle dikte opp noe.
    .filter((m) => {
      try {
        const host = new URL(m.url).hostname.replace(/^www\./, "");
        return EXTERNAL_RECIPE_SITES.some((site) => host === site || host.endsWith(`.${site}`));
      } catch {
        return false;
      }
    })
    .slice(0, 5);
}

export interface DishRecipeSearchInput {
  dishName: string;
}

const DISH_RECIPE_MATCH_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Oppskriftens faktiske tittel" },
          url: { type: "string", description: "Den faktiske, fullstendige URL-en du fant via søk" },
          siteName: { type: "string", description: "Kort nettstedsnavn, f.eks. Matprat eller Godt.no" },
          note: {
            type: "string",
            description: "Kort notat på norsk om treffet, maks 1 setning, f.eks. «klassisk versjon» eller «rask variant uten fløte»",
          },
        },
        required: ["title", "url", "siteName", "note"],
      },
    },
  },
  required: ["matches"],
} as const;

/**
 * "Finn oppskrift" på "Ny oppskrift"-siden (27.08.2026, ønsket av Henrik:
 * skriv inn en rett – f.eks. «Pasta Carbonara» – og finn EKTE oppskrifter
 * på nett for akkurat DEN retten, som alternativ til "Generer med AI").
 * Nesten identisk mekanisme som findExternalRecipeMatches over (samme
 * kuraterte nettsteder, samme verifiserte URL via resolveVerifiedUrl,
 * samme strukturerte tool-call-svar), men søker etter en NAVNGITT rett i
 * stedet for ut fra en ingrediensliste – og gjenbruker derfor samme
 * ExternalRecipeMatch-type/UI-kort (ExternalRecipeMatchCard.tsx) i stedet
 * for å finne opp en egen visning. missingIngredients er alltid tom her
 * (ingen pantry-kontekst å sammenligne mot i denne bruken) – kortet skjuler
 * selv den seksjonen når lista er tom.
 */
export async function findRecipesByDishName(input: DishRecipeSearchInput): Promise<ExternalRecipeMatch[]> {
  const system =
    "Du hjelper en admin på en norsk oppskriftsside finne EKTE, eksisterende oppskrifter for en SPESIFIKK rett " +
    "de ønsker å legge til på siden sin. Bruk søkeverktøyet til å faktisk finne ekte, fungerende oppskriftssider " +
    "på kjente norske matnettsteder som matcher retten – finn ALDRI på en URL eller tittel selv, kun det du " +
    "faktisk fant via søk. Foreslå inntil 5 gode, relevante treff, gjerne med litt variasjon (f.eks. en klassisk " +
    "versjon og en rask/forenklet variant, dersom det finnes). Returner kun treff du faktisk fant via søk – " +
    "færre (også null) er bedre enn å presse frem dårlige eller usikre treff.";

  const prompt = `Finn oppskrifter for retten: ${input.dishName.trim()}`;

  const { data: raw, searchResults } = await callClaudeWebSearchJSON<{ matches?: unknown }>(
    system,
    prompt,
    DISH_RECIPE_MATCH_SCHEMA,
    { allowedDomains: EXTERNAL_RECIPE_SITES, maxUses: 5, maxTokens: 1200 },
  );

  if (!Array.isArray(raw.matches)) {
    throw new Error("Fikk et uventet svarformat fra AI-søket. Prøv igjen.");
  }

  return raw.matches
    .map((m) => {
      const item = m as Record<string, unknown>;
      return {
        title: toStringValue(item.title).slice(0, 160),
        url: toStringValue(item.url).slice(0, 500),
        siteName: toStringValue(item.siteName).slice(0, 60),
        note: toStringValue(item.note).slice(0, 300),
        missingIngredients: [] as string[],
      };
    })
    .map((m) => {
      if (m.title === "" || m.url === "") return null;
      // Samme URL-verifisering som findExternalRecipeMatches – se
      // kommentaren der for hele begrunnelsen.
      const realUrl = resolveVerifiedUrl(m.url, m.title, searchResults);
      return realUrl ? { ...m, url: realUrl } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .filter((m) => {
      try {
        const host = new URL(m.url).hostname.replace(/^www\./, "");
        return EXTERNAL_RECIPE_SITES.some((site) => host === site || host.endsWith(`.${site}`));
      } catch {
        return false;
      }
    })
    .slice(0, 5);
}

function normalizeMatchTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå ]/g, "")
    .trim();
}

/** Enkel Levenshtein-redigeringsavstand – brukt til å kjenne igjen en URL
 * modellen har "skrevet av" med en liten feil (f.eks. én bokstav for mye)
 * som faktisk den samme, EKTE url-en fra søketreffene. */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Finner den EKTE url-en (fra searchResults – strukturert API-data) som
 * faktisk hører til et forslag modellen ga, i stedet for å stole blindt på
 * url-strengen modellen selv skrev i JSON-svaret. Prøver i rekkefølge:
 * 1) eksakt url-match (det vanlige – modellen skrev av riktig)
 * 2) nær-eksakt url-match (liten redigeringsavstand – fanger opp
 *    avskrivingsfeil som en dobbel bokstav)
 * 3) tittel-match (siste forsøk, dersom url-en avviker for mye)
 * Returnerer null (forkast forslaget) dersom ingen trygg match finnes.
 */
function resolveVerifiedUrl(
  claimedUrl: string,
  claimedTitle: string,
  searchResults: { url: string; title: string }[],
): string | null {
  if (searchResults.length === 0) return null;

  const exact = searchResults.find((r) => r.url === claimedUrl);
  if (exact) return exact.url;

  let closest: { url: string; distance: number } | null = null;
  for (const r of searchResults) {
    const distance = levenshteinDistance(claimedUrl, r.url);
    if (!closest || distance < closest.distance) closest = { url: r.url, distance };
  }
  const threshold = Math.max(3, Math.round(claimedUrl.length * 0.03));
  if (closest && closest.distance <= threshold) return closest.url;

  const targetTitle = normalizeMatchTitle(claimedTitle);
  if (targetTitle === "") return null;
  const titleMatch =
    searchResults.find((r) => normalizeMatchTitle(r.title) === targetTitle) ??
    searchResults.find((r) => {
      const resultTitle = normalizeMatchTitle(r.title);
      return resultTitle !== "" && (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle));
    });
  return titleMatch ? titleMatch.url : null;
}

export interface RecipeImprovementInput {
  title: string;
  description: string;
  ingredientGroups: { title: string | null; items: { amount: string | null; unit: string | null; name: string }[] }[];
  steps: { groupTitle: string | null; text: string }[];
}

/**
 * "Forslag til forbedring" (27.08.2026, ønsket av Henrik – se filheaderen
 * til RecipeImprovementSuggestion i lib/types.ts). Admin-gatet (kalles kun
 * fra suggestRecipeImprovements i lib/actions/recipes.ts). IKKE cachet –
 * samme begrunnelse som estimateRecipeTiming over (leser skjemaets
 * NÅVÆRENDE, ikke-lagrede innhold – kan endre seg fra tastetrykk til
 * tastetrykk, et cachet svar ville fort blitt utdatert).
 */
export async function suggestRecipeImprovements(input: RecipeImprovementInput): Promise<RecipeImprovementSuggestion> {
  const system =
    "Du er en erfaren kokk og oppskriftsredaktør som gir konstruktive, konkrete forbedringsforslag til en " +
    "oppskrift som allerede er skrevet ferdig – ut fra den FAKTISKE ingredienslisten og fremgangsmåten under. " +
    "Foreslå (1) ingredienser som kunne løftet retten – f.eks. et krydder, en syre, en finish eller en aromatisk " +
    "ingrediens som mangler – med en kort begrunnelse for hver, (2) konkrete endringer i selve fremgangsmåten/" +
    "teknikken som ville gitt et bedre resultat – f.eks. rekkefølge, temperatur, hviletid, bruning – og (3) annet, " +
    "som smaksbalanse, presentasjon eller holdbarhet, som ikke hører naturlig til de to over. Vær KONKRET og " +
    "PRAKTISK, ikke generiske råd («smak til underveis» uten å si med hva). Foreslå kun det som FAKTISK ville " +
    "forbedret akkurat DENNE retten – behold rettens grunnleggende karakter, ikke foreslå en helt annen rett. Er " +
    "oppskriften allerede solid uten åpenbare forbedringer på ett eller flere punkter, returner en tom liste for " +
    "det punktet – ikke presser frem svake forslag bare for å ha noe å si.\n\n" +
    'Svar KUN med JSON på nøyaktig denne formen: {"ingredientAdditions": [{"name": "kort navn på norsk", "reason": ' +
    '"kort begrunnelse på norsk, maks 1 setning"}], "methodImprovements": ["konkret endringsforslag på norsk, maks ' +
    '1-2 setninger"], "otherTips": ["kort tips på norsk, maks 1-2 setninger"]}';

  const ingredientLines = input.ingredientGroups
    .flatMap((g) => g.items)
    .map((i) => [i.amount, i.unit, i.name].filter((part) => part && part.trim()).join(" "))
    .join("\n");
  const stepLines = input.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  const prompt =
    `Rett: ${input.title}\n${input.description.trim()}\n\n` +
    `Ingredienser:\n${ingredientLines}\n\nFremgangsmåte:\n${stepLines}`;

  const raw = await callClaudeJSON<{
    ingredientAdditions?: unknown;
    methodImprovements?: unknown;
    otherTips?: unknown;
  }>(system, prompt, 1200, 0.5);

  const ingredientAdditions = (Array.isArray(raw.ingredientAdditions) ? raw.ingredientAdditions : [])
    .map((a) => {
      const item = a as Record<string, unknown>;
      return {
        name: toStringValue(item.name).slice(0, 80),
        reason: toStringValue(item.reason).slice(0, 200),
      };
    })
    .filter((a) => a.name !== "")
    .slice(0, 6);

  const methodImprovements = (Array.isArray(raw.methodImprovements) ? raw.methodImprovements : [])
    .map((s) => toStringValue(s).slice(0, 300))
    .filter((s) => s !== "")
    .slice(0, 6);

  const otherTips = (Array.isArray(raw.otherTips) ? raw.otherTips : [])
    .map((s) => toStringValue(s).slice(0, 300))
    .filter((s) => s !== "")
    .slice(0, 6);

  return { ingredientAdditions, methodImprovements, otherTips };
}

export interface IntegrateStepsInput {
  steps: { groupTitle: string | null; text: string }[];
  improvements: string[];
}

export interface IntegratedRecipeStep {
  groupTitle: string | null;
  text: string;
}

const INTEGRATE_STEPS_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          groupTitle: { type: ["string", "null"] },
          text: { type: "string" },
        },
        required: ["text"],
      },
    },
  },
  required: ["steps"],
} as const;

/**
 * "Implementer valgte" på "Forslag til forbedring" (27.08.2026, utvidet
 * etter ønske fra Henrik: "hva om den forstår hvor den skal legge seg i
 * fremgangsmåten, og muligens da også skriver om de andre punktene dersom
 * det trengs" – en forbedring som f.eks. "stek løk i smør først" eller
 * "tilsett crème fraîche etter blending, men før oppkok" skal IKKE bare
 * limes på som et helt nytt steg til slutt. Får hele den nåværende
 * fremgangsmåten OG kun de forbedringene admin faktisk har huket av,
 * returnerer HELE den oppdaterte fremgangsmåten (alle steg, endrede og
 * uendrede, i riktig rekkefølge) – klientkoden erstatter da hele
 * steps-arrayet, se handleImplementSelectedImprovements i RecipeForm.tsx.
 *
 * Bruker callClaudeToolJSON (tvunget strukturert verktøykall), IKKE vanlig
 * callClaudeJSON – stegtekst er fri tekst som fint kan inneholde
 * anførselstegn/spesialtegn, og fritekst-JSON viste seg 27.08.2026 (se
 * filheaderen til callClaudeWebSearchJSON) å ikke være 100 % robust mot
 * det. Admin-gatet, IKKE cachet – samme begrunnelse som
 * suggestRecipeImprovements over (leser skjemaets nåværende,
 * ikke-lagrede fremgangsmåte).
 */
export async function integrateStepsWithImprovements(
  input: IntegrateStepsInput,
): Promise<IntegratedRecipeStep[]> {
  if (input.improvements.length === 0) {
    return input.steps.map((s) => ({ groupTitle: s.groupTitle, text: s.text }));
  }

  const system =
    "Du er en erfaren oppskriftsredaktør. Du får en oppskrifts NÅVÆRENDE fremgangsmåte (nummererte steg) og en " +
    "liste med GODKJENTE forbedringer som admin har valgt å ta inn. Din jobb er å veve forbedringene naturlig " +
    "inn i fremgangsmåten – IKKE bare hekte dem på som nye steg til slutt.\n\n" +
    "For hver forbedring: vurder om den hører hjemme i et steg som ALLEREDE finnes (f.eks. en presisering av " +
    "tidspunkt/temperatur/teknikk for noe steget allerede beskriver – da skal du REDIGERE det steget sin tekst " +
    "til å inkludere presiseringen, ikke lage et nytt steg for det samme), eller om den er en helt ny handling " +
    "som mangler et eget steg (da setter du inn et nytt steg på riktig plass i rekkefølgen – ikke nødvendigvis " +
    "sist). Eksempel: forbedringen «Tilsett crème fraîche etter blending, men før oppkok, og varm forsiktig for " +
    "å unngå at den brytes ned – ikke la den koke hardt» skal redigeres INN i det steget som allerede tilsetter " +
    "crème fraîche (juster rekkefølge/varme-instruksjonen der), ikke bli et eget, ekstra steg.\n\n" +
    "Endre KUN steg som faktisk er berørt av en forbedring – alle andre steg skal beholdes ord for ord, " +
    "uendret. Ikke fjern eller slå sammen steg som ikke er nevnt. Ikke dikt opp forbedringer utover de som er " +
    "oppgitt. Behold eventuell delsteg-gruppe (groupTitle) på uendrede steg; sett groupTitle på et nytt steg " +
    "kun dersom det tydelig hører til en gruppe som allerede brukes rett før/etter.\n\n" +
    "Returner HELE den oppdaterte fremgangsmåten, i endelig rekkefølge – alle steg, både endrede og uendrede.";

  const stepLines = input.steps
    .map((s, i) => `${i + 1}. ${s.groupTitle ? `[${s.groupTitle}] ` : ""}${s.text}`)
    .join("\n");
  const improvementLines = input.improvements.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `NÅVÆRENDE FREMGANGSMÅTE:\n${stepLines}\n\nGODKJENTE FORBEDRINGER SOM SKAL TAS INN:\n${improvementLines}`;

  const raw = await callClaudeToolJSON<{ steps?: unknown }>(system, prompt, INTEGRATE_STEPS_SCHEMA, {
    maxTokens: 2000,
    temperature: 0.3,
  });

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((s) => {
      const item = s as Record<string, unknown>;
      const text = toStringValue(item.text).slice(0, 2000);
      if (text === "") return null;
      const groupTitleRaw = toStringValue(item.groupTitle);
      return { groupTitle: groupTitleRaw === "" ? null : groupTitleRaw.slice(0, 80), text };
    })
    .filter((s): s is IntegratedRecipeStep => s !== null);

  if (steps.length === 0) {
    throw new Error("Kunne ikke integrere forbedringene i fremgangsmåten. Prøv igjen.");
  }

  return steps;
}

export interface IngredientGroupingItemInput {
  amount: string | null;
  unit: string | null;
  name: string;
  note: string | null;
}

export interface IngredientGroupingInput {
  title: string;
  /** FLAT liste over ALLE ingredienser på tvers av eksisterende grupper, i
   * opprinnelig rekkefølge – se handleSuggestIngredientGrouping i
   * RecipeForm.tsx, som flater ut `groups` før kallet. Sendes flat inn
   * (ikke allerede gruppert) nettopp fordi poenget er å la AI-en bestemme
   * grupperingen på nytt, uansett hvordan (eller om) admin/en import
   * allerede hadde delt dem inn. */
  ingredients: IngredientGroupingItemInput[];
  steps: { groupTitle: string | null; text: string }[];
}

export interface IngredientGroupingSuggestion {
  title: string;
  /** Indekser inn i INPUT-listen `ingredients` (0-basert) – se
   * suggestIngredientGrouping under for hvorfor selve ingrediens-INNHOLDET
   * (mengde/enhet/navn/notat) aldri går via AI-en i retur. */
  itemIndices: number[];
}

const INGREDIENT_GROUPING_SCHEMA = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          itemIndices: { type: "array", items: { type: "integer" } },
        },
        required: ["title", "itemIndices"],
      },
    },
  },
  required: ["groups"],
} as const;

/**
 * "Del ingredienser inn i grupper" (27.08.2026, ønsket av Henrik: "når en
 * oppskrift inneholder salat og brød, bør alle ingrediensene til brødet
 * ligge under 'brød' i ingredienslista, og alt til salaten ligger under
 * 'salat'"). Leser HELE oppskriften (ingredienser + fremgangsmåte) og
 * foreslår en naturlig inndeling av ingredienslisten i grupper etter hvilken
 * DEL AV RETTEN de faktisk hører til – ikke bare de eksisterende, ofte
 * fraværende/for grove gruppetitlene. Fungerer altså UAVHENGIG av om
 * fremgangsmåten fra før har egne seksjonstitler (groupTitle) – AI-en leser
 * selve stegteksten for å forstå hvilken ingrediens som brukes hvor, selv om
 * ingen seksjoner er satt opp ennå.
 *
 * KUN ET FORSLAG, IKKE lagret noe sted – samme mønster som resten av
 * RecipeForm.tsx sine AI-forslag (Forslag til forbedring, Importer, Finn
 * oppskrift). Admin ser resultatet og kan velge å bruke det (erstatter
 * `groups`-state i skjemaet) eller forkaste det; ingenting skrives til
 * databasen før admin selv trykker "Lagre" på skjemaet, som før.
 *
 * BEVISST kun indekser i retur, ALDRI ingrediensenes faktiske
 * mengde/enhet/navn/notat – AI-en skal AVGJØRE HVOR HVER INGREDIENS HØRER
 * HJEMME, ikke få lov til å gjendikte selve ingrediensdataene (feil skrevet
 * mengde/enhet ville vært en alvorlig, lett-oversett datafeil i en
 * handleliste). Klientkoden i RecipeForm.tsx bygger de nye gruppene ved å
 * slå opp de originale, ureduserte item-objektene på indeks – se
 * handleApplyIngredientGrouping.
 *
 * Admin-gatet (kalles kun fra suggestIngredientGrouping i
 * lib/actions/recipes.ts). IKKE cachet – leser skjemaets nåværende,
 * ikke-lagrede innhold, samme begrunnelse som suggestRecipeImprovements
 * over. Bruker callClaudeToolJSON (tvunget strukturert verktøykall), samme
 * begrunnelse som integrateStepsWithImprovements – ingrediensnavn/notater er
 * fri tekst som kan inneholde anførselstegn/spesialtegn.
 */
export async function suggestIngredientGrouping(
  input: IngredientGroupingInput,
): Promise<IngredientGroupingSuggestion[]> {
  if (input.ingredients.length === 0) return [];

  const system =
    "Du er en erfaren oppskriftsredaktør. Du får en oppskrifts fulle ingrediensliste (nummerert, FLAT – uten " +
    "hensyn til eventuell eksisterende gruppering) og fremgangsmåten. Din jobb er å dele ingredienslisten inn i " +
    "grupper etter hvilken DEL AV RETTEN hver ingrediens faktisk hører til (f.eks. «Brød», «Salat», " +
    "«Kjøttboller», «Saus», «Dressing», «Til servering») – les fremgangsmåten nøye for å forstå hvor hver " +
    "ingrediens faktisk brukes, ikke bare gjett ut fra navnet alene.\n\n" +
    "Er retten ÉN sammenhengende helhet uten naturlige, atskilte deler (f.eks. en enkel gryte eller suppe der " +
    "alt kokes sammen), skal du returnere ÉN gruppe med alle ingrediensene – ikke tvinge frem en kunstig " +
    "oppdeling der det ikke finnes noen. Del KUN opp der det faktisk finnes tydelig atskilte deler av retten.\n\n" +
    "Hver ingrediens (identifisert ved sin indeks i inputlisten) skal havne i NØYAKTIG ÉN gruppe – ingen skal " +
    "utelates, ingen skal dupliseres på tvers av grupper. Gruppetitlene skal være korte (1-2 ord), på norsk, i " +
    "den rekkefølgen de naturlig opptrer i fremgangsmåten. Returner ALDRI selve ingrediensteksten (mengde/enhet/" +
    "navn) – kun gruppetittel og hvilke indekser som hører til den.";

  const ingredientLines = input.ingredients
    .map((item, i) => `${i}. ${[item.amount, item.unit, item.name].filter((part) => part && part.trim()).join(" ")}`)
    .join("\n");
  const stepLines = input.steps
    .map((s, i) => `${i + 1}. ${s.groupTitle ? `[${s.groupTitle}] ` : ""}${s.text}`)
    .join("\n");

  const prompt = `Rett: ${input.title}\n\nIngredienser (indeksert):\n${ingredientLines}\n\nFremgangsmåte:\n${stepLines}`;

  const raw = await callClaudeToolJSON<{ groups?: unknown }>(system, prompt, INGREDIENT_GROUPING_SCHEMA, {
    maxTokens: 1500,
    temperature: 0.2,
  });

  const validIndex = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n < input.ingredients.length;

  const seen = new Set<number>();
  const groups = (Array.isArray(raw.groups) ? raw.groups : [])
    .map((g) => {
      const group = g as Record<string, unknown>;
      const title = toStringValue(group.title).slice(0, 60);
      const itemIndices = (Array.isArray(group.itemIndices) ? group.itemIndices : [])
        .filter(validIndex)
        .filter((i) => !seen.has(i)); // hver indeks kun i FØRSTE gruppe den nevnes i, se filheader ("ingen skal dupliseres")
      itemIndices.forEach((i) => seen.add(i));
      return { title, itemIndices };
    })
    .filter((g) => g.itemIndices.length > 0);

  // Indekser AI-en (mot formodning) ikke plasserte noe sted – f.eks. ved et
  // ufullstendig svar – havner i en siste, tittelløs gruppe i stedet for å
  // stille forsvinne fra skjemaet. Skal i praksis aldri inntreffe (hver
  // ingrediens SKAL havne i nøyaktig én gruppe, se systemprompten), men en
  // tapt ingrediens er alvorlig nok til at det er verdt en eksplisitt
  // sikkerhetsnett-gruppe fremfor å stole blindt på AI-svaret.
  const missing = input.ingredients.map((_, i) => i).filter((i) => !seen.has(i));
  if (missing.length > 0) {
    groups.push({ title: "", itemIndices: missing });
  }

  if (groups.length === 0) {
    throw new Error("Kunne ikke dele ingrediensene inn i grupper. Prøv igjen.");
  }

  return groups;
}
