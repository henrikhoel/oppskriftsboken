"use server";

import { requireAdmin } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/ai/anthropic";
import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/config";
import {
  extractJsonLdRecipe,
  parseIsoDurationToMinutes,
  parseYieldToServings,
  cleanJsonLdIngredientLines,
  flattenJsonLdInstructions,
  extractFirstImageUrl,
  stripHtmlToText,
} from "@/lib/utils/html-extract";
import {
  convertImperialAmount,
  convertFahrenheitInText,
  convertImperialUnitsInText,
} from "@/lib/utils/unit-convert";

/**
 * "Importer fra lenke" (admin, oppretting av ny oppskrift – se
 * components/admin/RecipeForm.tsx) – limer inn en URL til en oppskrift på en
 * annen nettside, henter siden server-side, og fyller ut skjemaet
 * automatisk slik at admin kan gjennomgå/justere i stedet for å skrive alt
 * for hånd. Skriver ALDRI til databasen selv – returnerer kun et
 * "utkast"-objekt som admin fortsatt må trykke "Opprett oppskrift" for å
 * faktisk lagre, akkurat som getMoodRecommendations/getMenuSuggestions i
 * kitchen-intelligence.ts. Derfor følger denne KASTER-konvensjonen (ikke
 * {success,error}) – se filheaderen i lib/actions/kitchen-intelligence.ts
 * for begrunnelsen for det skillet.
 *
 * To trinn, i tråd med prosjektets "del opp deterministisk vs. AI"-prinsipp
 * (se lib/kitchen-intelligence/pantry-match.ts sin filheader for samme
 * prinsipp anvendt et annet sted):
 *   1. DETERMINISTISK: se etter et schema.org Recipe JSON-LD-objekt i
 *      HTML-en (se lib/utils/html-extract.ts) – de aller fleste
 *      oppskriftssider har dette for Google sine "rich results", og det gir
 *      EKSAKTE ingredienslinjer/steg/tider rett fra kilden, ikke noe en AI
 *      har gjettet fra generell sidetekst.
 *   2. AI: løser det som faktisk krever tolkning – dele hver ingredienslinje
 *      inn i mengde/enhet/navn/note, oversette til norsk om kilden er på et
 *      annet språk, foreslå vanskelighetsgrad/kategori/emneknagger, og (kun
 *      når JSON-LD mangler helt) tolke hele siden fra fri tekst.
 * Kjente, presist utledede verdier (porsjoner/tider fra JSON-LD) vinner
 * ALLTID over AI-ens gjetning på samme felt – se sammenstillingen nederst i
 * funksjonen.
 *
 * Et TREDJE deterministisk steg kjøres til slutt, i assembleDraft: dersom
 * kilden brukte amerikanske mål (cups/tbsp/tsp/oz/lb/°F), konverteres disse
 * til norske kjøkkenmål (ss/ts/dl/l/g/kg/°C) – se lib/utils/unit-convert.ts.
 * AI-en er eksplisitt bedt om å IKKE konvertere eller oversette selve
 * mengde/enhet-feltene (kun ingrediensnavnet/steg-teksten rundt), nettopp
 * for at dette regnestykket – som har ett eksakt riktig svar og bør rundes
 * til "naturlige" kjøkkentall (12, ikke 11,67) – alltid gjøres av kode, ikke
 * av en AI som kan regne feil eller runde inkonsekvent.
 */

export interface RecipeImportIngredientItem {
  amount: string;
  unit: string;
  name: string;
  note: string;
}

export interface RecipeImportIngredientGroup {
  title: string | null;
  items: RecipeImportIngredientItem[];
}

export interface RecipeImportStep {
  groupTitle: string | null;
  text: string;
}

export interface RecipeImportDraft {
  title: string;
  description: string;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  difficulty: Difficulty;
  ingredientGroups: RecipeImportIngredientGroup[];
  steps: RecipeImportStep[];
  categoryId: string | null;
  tags: string[];
  heroImageUrl: string | null;
  source: string;
  /** Satt når resultatet er tolket fra fri sidetekst (ingen JSON-LD funnet)
   * – da er treffsikkerheten lavere, og admin-UI-et bør oppfordre til ekstra
   * nøye gjennomgang før publisering. */
  warning: string | null;
}

const MAX_HTML_CHARS = 600_000;
const MAX_PLAIN_TEXT_CHARS = 12_000;
const MAX_INGREDIENT_LINES = 80;
const MAX_INSTRUCTION_LINES = 60;

interface ParsedRecipeAiResponse {
  title?: string;
  description?: string;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  difficulty?: string;
  ingredientGroups?: Array<{
    title?: string | null;
    items?: Array<{ amount?: string; unit?: string; name?: string; note?: string }>;
  }>;
  steps?: Array<{ groupTitle?: string | null; text?: string }>;
  categoryName?: string | null;
  tags?: string[];
}

function sanitizeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function sanitizeDifficulty(value: unknown): Difficulty {
  return typeof value === "string" && (DIFFICULTY_LEVELS as readonly string[]).includes(value)
    ? (value as Difficulty)
    : "middels";
}

function resolveCategoryId(categoryName: string | null | undefined, categories: { id: string; name: string }[]): string | null {
  if (!categoryName) return null;
  const match = categories.find((c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase());
  return match?.id ?? null;
}

export async function importRecipeFromUrl(
  rawUrl: string,
  categories: { id: string; name: string }[],
): Promise<RecipeImportDraft> {
  await requireAdmin();

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    throw new Error("Lim inn en lenke først.");
  }

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    throw new Error("Dette ser ikke ut som en gyldig lenke.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Lenken må starte med http:// eller https://.");
  }

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ATableRecipeImporter/1.0; +https://atable.no) AppleWebKit/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(
        `Siden svarte med feil ${res.status}. Noen sider blokkerer automatisk henting – prøv en annen kilde, eller fyll ut skjemaet manuelt.`,
      );
    }
    const fullHtml = await res.text();
    html = fullHtml.slice(0, MAX_HTML_CHARS);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Siden svarte")) throw err;
    throw new Error(
      "Klarte ikke å hente siden. Sjekk at lenken er riktig, eller fyll ut skjemaet manuelt.",
    );
  }

  const jsonLd = extractJsonLdRecipe(html);
  const heroImageUrl = jsonLd ? extractFirstImageUrl(jsonLd.image) : null;

  const knownServings = jsonLd ? parseYieldToServings(jsonLd.recipeYield) : null;
  const knownPrep = jsonLd ? parseIsoDurationToMinutes(jsonLd.prepTime) : null;
  const knownCook = jsonLd ? parseIsoDurationToMinutes(jsonLd.cookTime) : null;
  const knownTotal = jsonLd ? parseIsoDurationToMinutes(jsonLd.totalTime) : null;

  const categoryNames = categories.map((c) => c.name);
  const outputSchema =
    '{"title": "streng (norsk)", "description": "streng (norsk, 1-2 setninger)", ' +
    '"servings": tall|null, "prepTimeMinutes": tall|null, "cookTimeMinutes": tall|null, ' +
    '"totalTimeMinutes": tall|null, "difficulty": "enkel"|"middels"|"avansert", ' +
    '"ingredientGroups": [{"title": streng|null, "items": [{"amount": streng, "unit": streng, ' +
    '"name": streng, "note": streng}]}], "steps": [{"groupTitle": streng|null, "text": streng}], ' +
    '"categoryName": streng|null (MÅ være eksakt en av de oppgitte kategoriene, ellers null), ' +
    '"tags": string[] (inntil 5, norske, små bokstaver)}';

  let system: string;
  let prompt: string;

  if (jsonLd) {
    const rawIngredients = cleanJsonLdIngredientLines(jsonLd.recipeIngredient).slice(0, MAX_INGREDIENT_LINES);
    const rawSteps = flattenJsonLdInstructions(jsonLd.recipeInstructions).slice(0, MAX_INSTRUCTION_LINES);
    const rawTitle = typeof jsonLd.name === "string" ? jsonLd.name : "";
    const rawDescription = typeof jsonLd.description === "string" ? jsonLd.description : "";

    if (rawIngredients.length === 0 && rawSteps.length === 0) {
      // JSON-LD fantes, men manglet både ingredienser og fremgangsmåte (skjer
      // av og til – noen sider har ufullstendige Recipe-blokker). Da er den
      // reelt sett ubrukelig som kilde – fall tilbake til fri tekst under.
      return await importFromPlainText(html, url, categories, categoryNames, outputSchema, heroImageUrl);
    }

    system =
      "Du hjelper til med å strukturere en oppskrift som er hentet fra en annen nettside, til bruk i en " +
      "norsk oppskriftsapp. Du får EKSAKTE rådata (tittel, ingredienslinjer, steg) hentet direkte fra " +
      "kildesidens egen strukturerte data – IKKE fri tekst. Din jobb er KUN: " +
      "(1) oversette alt til norsk dersom kilden er på et annet språk (behold norsk uendret), " +
      "(2) dele hver ingredienslinje inn i mengde/enhet/navn/evt. note (f.eks. \"2 dl helmelk, kald\" -> " +
      'amount="2", unit="dl", name="helmelk", note="kald") UTEN å endre selve tallet/enheten – heller IKKE ' +
      "dersom enheten er amerikansk (cup/tbsp/tsp/oz/lb): behold DEN da EKSAKT som i kilden (f.eks. " +
      '"1 cup flour" -> amount="1", unit="cup", name="flour") – IKKE oversett eller konverter enheten selv, ' +
      "det gjøres av kode etterpå. Oversett kun selve ingrediensnavnet/noten til norsk. NOEN linjer oppgir " +
      'BÅDE et metrisk og et amerikansk mål side om side (f.eks. "1.25kg / 2.5 lb chuck beef", "800g / ' +
      '28oz crushed tomatoes") – bruk DA alltid det METRISKE tallet/enheten direkte (med komma som ' +
      'desimalskille, f.eks. amount="1,25", unit="kg"), og se helt bort fra det amerikanske tallet i samme ' +
      "linje. Bruk kun det amerikanske tallet/enheten når det er det ENESTE som er oppgitt for den " +
      "ingrediensen, " +
      "(3) gruppere ingrediensene KUN dersom rådataene tydelig antyder grupper (f.eks. en linje som bare er " +
      '"Til sausen:") – ellers ÉN gruppe med title=null, ' +
      "(4) rydde opp i stegene (fjern overflødig nummerering som \"Step 1:\") uten å slå sammen eller dele opp " +
      "steg, behold rekkefølgen – behold også eventuelle ovnstemperaturer (f.eks. \"350°F\") OG amerikanske " +
      'mål nevnt midt i selve steg-teksten (f.eks. "warm 5 cups ragu", "1/2 cup pasta water") UENDRET, det ' +
      "konverteres av kode etterpå (også her: dersom et steg oppgir BÅDE metrisk og amerikansk mål, behold " +
      "kun det metriske i teksten og fjern det amerikanske), " +
      "(5) foreslå vanskelighetsgrad, opptil 5 norske emneknagger, og en kategori KUN dersom en av de " +
      `oppgitte passer eksakt. Svar KUN med gyldig JSON i dette skjemaet: ${outputSchema}`;

    prompt =
      `Tittel: ${rawTitle}\nBeskrivelse: ${rawDescription}\n\n` +
      `Ingredienslinjer:\n${rawIngredients.join("\n")}\n\n` +
      `Steg:\n${rawSteps.join("\n")}\n\n` +
      `Tilgjengelige kategorier: ${categoryNames.join(", ") || "(ingen)"}`;
  } else {
    return await importFromPlainText(html, url, categories, categoryNames, outputSchema, heroImageUrl);
  }

  const result = await callAndParse(system, prompt);
  return assembleDraft(result, {
    url,
    categories,
    heroImageUrl,
    knownServings,
    knownPrep,
    knownCook,
    knownTotal,
    warning: null,
  });
}

async function importFromPlainText(
  html: string,
  url: URL,
  categories: { id: string; name: string }[],
  categoryNames: string[],
  outputSchema: string,
  heroImageUrl: string | null,
): Promise<RecipeImportDraft> {
  const text = stripHtmlToText(html).slice(0, MAX_PLAIN_TEXT_CHARS);
  if (!text) {
    throw new Error(
      "Fant ikke noe lesbart innhold på siden. Prøv en annen lenke, eller fyll ut skjemaet manuelt.",
    );
  }

  const system =
    "Du hjelper til med å tolke en oppskrift fra fri sidetekst (kopiert fra en nettside, kan inneholde " +
    "menyer/reklame/kommentarer som IKKE hører til oppskriften – ignorer alt som ikke er tittel, " +
    "beskrivelse, ingredienser, fremgangsmåte, porsjoner eller tid). Finn og strukturer den FAKTISKE " +
    "oppskriften. Oversett til norsk dersom kilden er på et annet språk – MEN behold selve tallet/enheten i " +
    "hver ingrediens EKSAKT som i kilden, også når enheten er amerikansk (cup/tbsp/tsp/oz/lb) – IKKE " +
    "oversett eller konverter enheten selv (kun ingrediensnavnet/noten rundt), det gjøres av kode etterpå. " +
    'NOEN linjer oppgir BÅDE et metrisk og et amerikansk mål side om side (f.eks. "1.25kg / 2.5 lb", ' +
    '"800g / 28oz") – bruk DA alltid det METRISKE tallet/enheten direkte (komma som desimalskille, f.eks. ' +
    'amount="1,25", unit="kg"), og se helt bort fra det amerikanske tallet i samme linje. Bruk kun det ' +
    "amerikanske tallet/enheten når det er det ENESTE som er oppgitt. Behold på samme måte eventuelle " +
    'ovnstemperaturer i Fahrenheit (f.eks. "350°F") OG amerikanske mål nevnt midt i fremgangsmåte-teksten ' +
    '(f.eks. "warm 5 cups ragu") uendret i teksten – det konverteres av kode etterpå. ' +
    "Del hver ingrediens inn i mengde/enhet/navn/evt. note. Foreslå vanskelighetsgrad, opptil 5 norske " +
    "emneknagger, og en kategori " +
    `KUN dersom en av de oppgitte passer eksakt. Svar KUN med gyldig JSON i dette skjemaet: ${outputSchema}`;

  const prompt = `Sidetekst:\n${text}\n\nTilgjengelige kategorier: ${categoryNames.join(", ") || "(ingen)"}`;

  const result = await callAndParse(system, prompt);
  return assembleDraft(result, {
    url,
    categories,
    heroImageUrl,
    knownServings: null,
    knownPrep: null,
    knownCook: null,
    knownTotal: null,
    warning:
      "Fant ingen strukturert oppskriftsdata på siden – innholdet er tolket fra fri sidetekst av AI. " +
      "Gå ekstra nøye gjennom ingredienser og fremgangsmåte før du publiserer.",
  });
}

async function callAndParse(system: string, prompt: string): Promise<ParsedRecipeAiResponse> {
  try {
    // 2000 tokens viste seg for lavt i praksis – en detaljert oppskrift med
    // mange ingredienser/steg (typisk amerikanske sider, som ofte er mer
    // pratsomme per steg enn norske) kuttes da av midt i JSON-svaret, som gir
    // "Klarte ikke å tolke svaret fra AI-en" (se feilmelding 25.08.2026,
    // rettet ved å både heve denne grensen OG gjøre feilmeldingen i
    // lib/ai/anthropic.ts sin parseJsonResponse mer treffende for akkurat
    // dette tilfellet).
    return await callClaudeJSON<ParsedRecipeAiResponse>(system, prompt, 6000, 0.2);
  } catch (err) {
    // Gjenbruker feilmeldingen fra lib/ai/anthropic.ts direkte (allerede
    // norsk og lesbar – f.eks. "ANTHROPIC_API_KEY mangler …" eller "Klarte
    // ikke å tolke svaret fra AI-en") i stedet for å maskere den bak en
    // generisk melding.
    throw new Error(
      err instanceof Error ? err.message : "Klarte ikke å tolke oppskriften med AI. Prøv igjen.",
    );
  }
}

function assembleDraft(
  result: ParsedRecipeAiResponse,
  opts: {
    url: URL;
    categories: { id: string; name: string }[];
    heroImageUrl: string | null;
    knownServings: number | null;
    knownPrep: number | null;
    knownCook: number | null;
    knownTotal: number | null;
    warning: string | null;
  },
): RecipeImportDraft {
  const ingredientGroups: RecipeImportIngredientGroup[] = (result.ingredientGroups ?? [])
    .map((g) => ({
      title: typeof g.title === "string" && g.title.trim() ? g.title.trim() : null,
      items: (g.items ?? [])
        .map((i) => ({
          amount: typeof i.amount === "string" ? i.amount.trim() : "",
          unit: typeof i.unit === "string" ? i.unit.trim() : "",
          name: typeof i.name === "string" ? i.name.trim() : "",
          note: typeof i.note === "string" ? i.note.trim() : "",
        }))
        .filter((i) => i.name !== "")
        // Amerikanske mål (cup/tbsp/tsp/oz/lb) -> norske kjøkkenmål (ss/ts/
        // dl/l/g/kg), avrundet til naturlige tall – se filheaderen øverst
        // for hvorfor dette gjøres her (deterministisk kode), ikke av AI-en
        // over. Enheter som allerede er metriske (eller ukjente) returnerer
        // null fra convertImperialAmount og står helt urørt.
        .map((i) => {
          const converted = convertImperialAmount(i.amount, i.unit);
          return converted ? { ...i, amount: converted.amount, unit: converted.unit } : i;
        }),
    }))
    .filter((g) => g.items.length > 0);

  const steps: RecipeImportStep[] = (result.steps ?? [])
    .map((s) => ({
      groupTitle: typeof s.groupTitle === "string" && s.groupTitle.trim() ? s.groupTitle.trim() : null,
      // Samme resonnement som over, for ovnstemperaturer OG amerikanske mål
      // nevnt midt i selve fremgangsmåteteksten ("350°F" -> "175°C", "5 cups
      // ragu" -> "1 l ragu") – ren tekstsubstitusjon, resten av steget står
      // uendret.
      text:
        typeof s.text === "string"
          ? convertImperialUnitsInText(convertFahrenheitInText(s.text.trim()))
          : "",
    }))
    .filter((s) => s.text !== "");

  if (ingredientGroups.length === 0 || steps.length === 0) {
    throw new Error(
      "Klarte ikke å finne ingredienser og fremgangsmåte på siden. Prøv en annen lenke, eller fyll ut skjemaet manuelt.",
    );
  }

  return {
    title: (result.title ?? "").trim().slice(0, 200),
    description: (result.description ?? "").trim().slice(0, 500),
    servings: opts.knownServings ?? sanitizeNumber(result.servings),
    prepTimeMinutes: opts.knownPrep ?? sanitizeNumber(result.prepTimeMinutes),
    cookTimeMinutes: opts.knownCook ?? sanitizeNumber(result.cookTimeMinutes),
    totalTimeMinutes: opts.knownTotal ?? sanitizeNumber(result.totalTimeMinutes),
    difficulty: sanitizeDifficulty(result.difficulty),
    ingredientGroups,
    steps,
    categoryId: resolveCategoryId(result.categoryName, opts.categories),
    tags: Array.isArray(result.tags) ? result.tags.filter((t): t is string => typeof t === "string").slice(0, 5) : [],
    heroImageUrl: opts.heroImageUrl,
    source: opts.url.toString(),
    warning: opts.warning,
  };
}
