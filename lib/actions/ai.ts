"use server";

import {
  callClaude,
  callClaudeJSON,
  callClaudeVisionJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { generateDishImageBase64 } from "@/lib/ai/openai";
import { uploadGeneratedRecipeImage } from "@/lib/actions/upload";
import { requireAdmin } from "@/lib/auth";
import type { VegetarianIngredientGroup, VegetarianStep } from "@/lib/types";
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
}

interface EnglishVariantResult {
  title: string;
  description: string;
  ingredientGroups: VegetarianIngredientGroup[];
  steps: VegetarianStep[];
  notes: string | null;
  tips: string | null;
}

/** Oversetter tittel, beskrivelse, ingredienser, steg, notater og tips til engelsk –
 * generert på forespørsel av en besøkende, samme mønster som getVegetarianVariant
 * (lagres ikke i databasen). Selve UI-et rundt (knapper, feilmeldinger osv.) forblir
 * norsk – det er kun oppskriftsinnholdet som byttes til engelsk. */
export async function getEnglishVariant(input: EnglishVariantInput): Promise<EnglishVariantResult> {
  const system =
    "You are a professional culinary translator. You translate Norwegian recipes into natural, fluent English " +
    "for home cooks abroad. Translate the title, description, ingredient names/notes/group titles, step text " +
    "(and step group titles), and any notes/tips. Keep numeric amounts UNCHANGED. Translate Norwegian unit " +
    "abbreviations to their common English equivalents (ss → tbsp, ts → tsp, stk → drop the unit and rely on the " +
    "name, boks → can, pk/pakke → package/pkg; dl/g/kg/l/ml can stay as their normal English abbreviation). Do not " +
    "add, remove, or reorder ingredients or steps, and do not change quantities or the meaning of the instructions.\n\n" +
    'Respond with ONLY JSON in exactly this shape, where "amount", "unit", "note", "title", "groupTitle", "notes" and ' +
    '"tips" are ALWAYS strings or null (never numbers): {"title": string, "description": string, ' +
    '"ingredientGroups": [{"title": string|null, "items": [{"amount": string|null, "unit": string|null, "name": string, "note": string|null}]}], ' +
    '"steps": [{"groupTitle": string|null, "text": string}], "notes": string|null, "tips": string|null}';

  const prompt =
    `Title: ${input.title}\nDescription: ${input.description || "(none)"}\n\n` +
    `Ingredient groups:\n${JSON.stringify(input.ingredientGroups, null, 2)}\n\n` +
    `Steps:\n${JSON.stringify(input.steps, null, 2)}\n\n` +
    `Notes: ${input.notes || "(none)"}\nTips: ${input.tips || "(none)"}`;

  const raw = await callClaudeJSON<{
    title?: unknown;
    description?: unknown;
    ingredientGroups?: unknown;
    steps?: unknown;
    notes?: unknown;
    tips?: unknown;
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
}

interface UsMeasurementsResult {
  steps: VegetarianStep[];
  notes: string | null;
  tips: string | null;
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
    "punctuation and casing. If a step/note/tip has no relevant measurement, return it completely unchanged. Keep " +
    "the exact same number of steps in the exact same order.\n\n" +
    'Respond with ONLY JSON in exactly this shape: {"steps": [{"groupTitle": string|null, "text": string}], ' +
    '"notes": string|null, "tips": string|null}';

  const prompt =
    `Steps:\n${JSON.stringify(input.steps, null, 2)}\n\n` +
    `Notes: ${input.notes || "(none)"}\nTips: ${input.tips || "(none)"}`;

  const raw = await callClaudeJSON<{
    steps?: unknown;
    notes?: unknown;
    tips?: unknown;
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
  };
}

/** Foreslå en vegetarvariant (erstattede ingredienser + justerte steg) – generert på forespørsel av en besøkende. */
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
