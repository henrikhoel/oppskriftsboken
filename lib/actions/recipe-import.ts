"use server";

import { requireAdmin } from "@/lib/auth";
import {
  callClaudeJSON,
  callClaudeMultiImageVisionJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/config";
import {
  extractJsonLdRecipe,
  parseIsoDurationToMinutes,
  parseYieldToServings,
  cleanJsonLdIngredientLines,
  flattenJsonLdInstructions,
  extractFirstImageUrl,
  stripHtmlToText,
  extractMetaContent,
  stripSocialCaptionBoilerplate,
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
 *
 * INSTAGRAM/TIKTOK (26.08.2026): disse har verken JSON-LD Recipe-data eller
 * en vanlig artikkelside å strekke om til fri tekst – oppskriften finnes KUN
 * i selve bildeteksten til innlegget. Samme lenkefelt kjenner igjen disse to
 * plattformene på URL-en (se detectSocialPlatform under) og henter i stedet
 * bildeteksten deterministisk fra sidens og:description-metatagg (se
 * stripSocialCaptionBoilerplate i lib/utils/html-extract.ts), før den tolkes
 * av AI med en egen prompt tilpasset hvordan bildetekster faktisk skrives
 * (emoji som punkttegn, emneknagger/@-nevnelser som skal ignoreres) – se
 * importFromSocialUrl/parseCaptionToDraft under. Begge plattformene
 * blokkerer automatisk henting relativt ofte (krever innlogging for mange
 * innlegg) – da kastes en lesbar feil som ber admin lime inn bildeteksten
 * manuelt i stedet (importRecipeFromCaptionText, samme AI-tolkning, bare
 * uten selve nettsidehentingen), i stedet for å late som noe fungerte.
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

// Hoistet ut av importRecipeFromUrl (som opprinnelig var eneste bruker) slik
// at både den, importFromPlainText OG de nye Instagram/TikTok-veiene
// (importFromSocialUrl/importRecipeFromCaptionText) kan dele nøyaktig samme
// JSON-skjema mot AI-en – ingen risiko for at de driver fra hverandre.
const RECIPE_OUTPUT_SCHEMA =
  '{"title": "streng (norsk)", "description": "streng (norsk, 1-2 setninger)", ' +
  '"servings": tall|null, "prepTimeMinutes": tall|null, "cookTimeMinutes": tall|null, ' +
  '"totalTimeMinutes": tall|null, "difficulty": "enkel"|"middels"|"avansert", ' +
  '"ingredientGroups": [{"title": streng|null, "items": [{"amount": streng, "unit": streng, ' +
  '"name": streng, "note": streng}]}], "steps": [{"groupTitle": streng|null, "text": streng}], ' +
  '"categoryName": streng|null (MÅ være eksakt en av de oppgitte kategoriene, ellers null), ' +
  '"tags": string[] (inntil 5, norske, små bokstaver)}';

type SocialPlatform = "instagram" | "tiktok";

/** Gjenkjenner Instagram/TikTok-lenker (inkl. korte tiktok.com-varianter som
 * vm./vt.tiktok.com, som fanges av .endsWith under) på selve hostnavnet –
 * ren streng-sjekk, ingen tolkning. */
function detectSocialPlatform(url: URL): SocialPlatform | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  return null;
}

const SOCIAL_FETCH_BLOCKED_MESSAGE =
  "Klarte ikke å hente bildeteksten automatisk fra denne lenken – Instagram og TikTok blokkerer ofte automatisk " +
  "henting, eller innlegget krever innlogging for å vises. Lim heller inn selve bildeteksten manuelt under " +
  "(kopier den fra appen/nettsiden), så tolkes den på akkurat samme måte.";

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

  // Instagram/TikTok har ingen JSON-LD-oppskriftsdata og ingen artikkelside
  // å strekke om til fri tekst – egen vei, se filheaderen og
  // importFromSocialUrl under.
  const socialPlatform = detectSocialPlatform(url);
  if (socialPlatform) {
    return await importFromSocialUrl(url, categories);
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
  const outputSchema = RECIPE_OUTPUT_SCHEMA;

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
    source: url.toString(),
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
    source: url.toString(),
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

/** Instagram/TikTok – henter selve HTML-en for innlegget (med en user-agent
 * som gir seg ut for Facebook sin egen "hent lenke-forhåndsvisning"-robot,
 * som i praksis slipper forbi innloggingsveggen for mange offentlige
 * innlegg, se filheaderen), plukker ut bildeteksten fra og:description og
 * forsidebildet fra og:image (begge deterministisk, se
 * lib/utils/html-extract.ts), og sender bildeteksten videre til samme
 * AI-tolkning som den manuelle innlimingsveien (parseCaptionToDraft) bruker.
 * Kaster SOCIAL_FETCH_BLOCKED_MESSAGE (ikke en teknisk feilmelding) for ALLE
 * feil her – fetch-feil, HTTP-feil, manglende/for kort og:description – for
 * å alltid peke admin mot samme, fungerende fallback (lim inn manuelt) i
 * stedet for å gjette på ÅRSAKEN til at plattformen blokkerte oss. */
async function importFromSocialUrl(
  url: URL,
  categories: { id: string; name: string }[],
): Promise<RecipeImportDraft> {
  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "user-agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        accept: "text/html",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(SOCIAL_FETCH_BLOCKED_MESSAGE);
    html = (await res.text()).slice(0, MAX_HTML_CHARS);
  } catch {
    throw new Error(SOCIAL_FETCH_BLOCKED_MESSAGE);
  }

  const rawDescription = extractMetaContent(html, "og:description");
  const caption = rawDescription ? stripSocialCaptionBoilerplate(rawDescription) : null;
  const heroImageUrl = extractMetaContent(html, "og:image");

  // En reell bildetekst med en oppskrift i er alltid mer enn noen få ord –
  // en kort/tom og:description betyr i praksis at vi traff en innloggings-
  // eller feilside i stedet for selve innlegget.
  if (!caption || caption.length < 20) {
    throw new Error(SOCIAL_FETCH_BLOCKED_MESSAGE);
  }

  return await parseCaptionToDraft(caption, url.toString(), categories, heroImageUrl);
}

/** "Last opp skjermbilde(r) av bildeteksten" – enda et hjelpemiddel inn i det
 * samme "lim inn bildetekst manuelt"-feltet under (se RecipeForm.tsx), for
 * når admin har tatt (ett eller flere) skjermbilder av selve Instagram/
 * TikTok-bildeteksten (f.eks. fra telefonen) i stedet for å kopiere teksten.
 * FLERE bilder (`images.length > 1`) dekker den vanlige situasjonen der hele
 * bildeteksten ikke får plass i ett skjermbilde – admin scroller og tar flere
 * skjermbilder, som sendes inn SAMMEN i ett AI-kall (se
 * callClaudeMultiImageVisionJSON) slik at modellen kan sette dem sammen til
 * én sammenhengende tekst og luke ut linjer som er synlige i overlappende
 * skjermbilder, i stedet for at klientkoden bare limer sammen rå tekst fra
 * separate kall (som lett dupliserer de overlappende linjene).
 *
 * Leser AV BILDET/BILDENE og returnerer KUN den rå transkriberte teksten –
 * skriver den IKKE selv inn i skjemaet og tolker den IKKE til en oppskrift.
 * Admin ser/kan rette den transkriberte teksten i tekstfeltet FØR "Hent
 * oppskrift fra tekst" trykkes, akkurat som om de hadde limt den inn selv –
 * samme progressive/gjennomgå-før-du-stoler-på-det-prinsipp som resten av
 * importflyten, og samme grunn til at dette er en egen, liten funksjon i
 * stedet for å slå sammen OCR og oppskrift-tolkning i ett AI-kall: to
 * kortere, mer presise AI-kall (les teksten → tolk teksten) er mer pålitelig
 * enn ett stort kall som skal gjøre begge deler samtidig, og gir admin et
 * sted å rette en feillest linje (f.eks. en feiltolket mengde) før den når
 * selve oppskrift-parseren. */
export async function extractCaptionTextFromImages(
  images: { mediaType: string; base64Data: string }[],
  lang: "no" | "en" = "no",
  // "caption" (default, uendret) = skjermbilde av en Instagram/TikTok-
  // bildetekst, se filheaderen over. "handwritten" (26.08.2026 – ønsket av
  // Henrik: "kan man ta bilde av en håndskrevet oppskrift?") = foto av et
  // håndskrevet oppskriftskort/notatbokside/lapp – HELT ANNEN kontekst for
  // AI-en (ikke en telefonskjerm, ingen app-grensesnitt/emneknagger/reklame
  // å ignorere), og håndskrift er vanskeligere å lese pålitelig enn trykt
  // skjermtekst – derfor egen, forsiktigere prompt under som ber AI-en
  // MERKE usikre ord fremfor å gjette, spesielt for tall/mengder.
  source: "caption" | "handwritten" = "caption",
): Promise<string> {
  await requireAdmin();

  if (images.length === 0) {
    throw new Error(lang === "en" ? "No image was received." : "Mottok ikke noe bilde.");
  }
  for (const image of images) {
    if (!SUPPORTED_IMAGE_MEDIA_TYPES.includes(image.mediaType as SupportedImageMediaType)) {
      throw new Error(
        lang === "en"
          ? "Unsupported image format. Try JPEG or PNG screenshots."
          : "Bildeformatet støttes ikke. Prøv JPEG- eller PNG-skjermbilder.",
      );
    }
    if (!image.base64Data) {
      throw new Error(lang === "en" ? "No image was received." : "Mottok ikke noe bilde.");
    }
  }

  const multiple = images.length > 1;

  const system =
    source === "handwritten"
      ? lang === "en"
        ? "You are shown " +
          (multiple
            ? `${images.length} photos, in order, together making up a handwritten recipe`
            : "a photo of a handwritten recipe") +
          " – e.g. a recipe card, a page from a notebook, or a loose note. Transcribe ALL visible text exactly " +
          "as written: ingredients, amounts, method steps, and any other notes on it, preserving the original " +
          "order and line breaks as closely as the layout allows." +
          (multiple
            ? " The photos may overlap or continue onto the next page – reconstruct ONE single, continuous " +
              "text in the correct reading order, without repeating lines that appear in more than one photo."
            : "") +
          " Do NOT guess or fill in words you cannot read with confidence – mark a genuinely illegible word or " +
          "line with [unclear] instead of inventing something, especially for NUMBERS and AMOUNTS, where a wrong " +
          "guess would make the recipe incorrect. If nothing readable is shown at all, return an empty string.\n\n" +
          'Respond with ONLY JSON in exactly this shape: {"captionText": "the transcribed text, or empty string"}'
        : "Du får se " +
          (multiple
            ? `${images.length} bilder, i rekkefølge, som til sammen utgjør en håndskrevet oppskrift`
            : "et bilde av en håndskrevet oppskrift") +
          " – f.eks. et oppskriftskort, en side i en notatbok, eller en løs lapp. Transkriber ALL synlig tekst " +
          "nøyaktig slik den står: ingredienser, mengder, fremgangsmåte, og eventuelle andre notater på den, og " +
          "behold original rekkefølge og linjeskift så godt du kan ut fra hvordan teksten er plassert." +
          (multiple
            ? " Bildene kan overlappe eller fortsette på neste side – sett dem sammen til ÉN sammenhengende " +
              "tekst i riktig leserekkefølge, uten å gjenta linjer som vises i mer enn ett bilde."
            : "") +
          " IKKE gjett eller fyll inn ord du ikke klarer å lese sikkert – merk et ord eller en linje du er reelt " +
          "usikker på med [uklart] i stedet for å dikte opp noe, spesielt for TALL og MENGDER, der en feilgjetning " +
          "gjør oppskriften feil. Hvis ingenting lesbart vises i det hele tatt, returner en tom streng.\n\n" +
          'Svar KUN med JSON på nøyaktig denne formen: {"captionText": "den transkriberte teksten, eller tom streng"}'
      : lang === "en"
        ? "You are shown " +
          (multiple
            ? `${images.length} screenshots from a phone, in order, together making up`
            : "a screenshot from a phone, most likely") +
          " an Instagram or TikTok post's caption text (may also show surrounding app UI like " +
          "likes/comments/username – ignore that, focus only on the caption text itself, which often contains a " +
          "recipe written out as an ingredient list and steps)." +
          (multiple
            ? " The screenshots may overlap (e.g. taken while scrolling) – reconstruct ONE single, continuous " +
              "caption text in the correct reading order, without repeating lines that appear in more than one " +
              "screenshot."
            : "") +
          " Transcribe the caption text EXACTLY as written: keep the original language, line breaks, emoji, " +
          "measurements, and wording. Do NOT summarize, translate, correct, or add anything. If the caption is " +
          "clearly cut off beyond what's shown, transcribe only what's actually visible. If nothing readable is " +
          "shown at all, return an empty string.\n\n" +
          'Respond with ONLY JSON in exactly this shape: {"captionText": "the transcribed text, or empty string"}'
        : "Du får se " +
          (multiple
            ? `${images.length} skjermbilder fra en telefon, i rekkefølge, som til sammen utgjør`
            : "et skjermbilde fra en telefon, mest sannsynlig av") +
          " bildeteksten på et Instagram- eller TikTok-innlegg (kan også vise omkringliggende app-grensesnitt som " +
          "likes/kommentarer/brukernavn – ignorer det, fokuser kun på selve bildeteksten, som ofte inneholder en " +
          "oppskrift skrevet ut som ingrediensliste og steg)." +
          (multiple
            ? " Skjermbildene kan overlappe (f.eks. tatt mens man scroller) – sett dem sammen til ÉN " +
              "sammenhengende bildetekst i riktig leserekkefølge, uten å gjenta linjer som vises i mer enn ett " +
              "skjermbilde."
            : "") +
          " Transkriber bildeteksten NØYAKTIG slik den står: behold originalspråket, linjeskift, emoji, mål og " +
          "ordlyd. IKKE oppsummer, oversett, rett opp eller legg til noe. Hvis bildeteksten tydelig er avkuttet " +
          "utenfor det som er synlig, transkriber kun det som faktisk vises. Hvis ingenting lesbart vises i det " +
          "hele tatt, returner en tom streng.\n\n" +
          'Svar KUN med JSON på nøyaktig denne formen: {"captionText": "den transkriberte teksten, eller tom streng"}';

  const prompt =
    source === "handwritten"
      ? lang === "en"
        ? multiple
          ? "Transcribe and merge the text visible across these photos of a handwritten recipe into one continuous text."
          : "Transcribe the text visible in this photo of a handwritten recipe."
        : multiple
          ? "Transkriber og sett sammen teksten som er synlig i disse bildene av en håndskrevet oppskrift til én sammenhengende tekst."
          : "Transkriber teksten som er synlig i dette bildet av en håndskrevet oppskrift."
      : lang === "en"
        ? multiple
          ? "Transcribe and merge the caption text visible across these screenshots into one continuous text."
          : "Transcribe the caption text visible in this screenshot."
        : multiple
          ? "Transkriber og sett sammen bildeteksten som er synlig i disse skjermbildene til én sammenhengende tekst."
          : "Transkriber bildeteksten som er synlig i dette skjermbildet.";

  const result = await callClaudeMultiImageVisionJSON<{ captionText: string }>(
    system,
    prompt,
    images.map((image) => ({
      mediaType: image.mediaType as SupportedImageMediaType,
      base64Data: image.base64Data,
    })),
    2000,
  );

  const text = (result.captionText ?? "").trim();
  if (!text) {
    throw new Error(
      source === "handwritten"
        ? lang === "en"
          ? "Couldn't read any text in those photos. Try clearer, better-lit photos, or paste the text manually."
          : "Fant ingen lesbar tekst i de bildene. Prøv tydeligere bilder med bedre lys, eller lim inn teksten manuelt."
        : lang === "en"
          ? "Couldn't read any caption text in those screenshots. Try clearer screenshots, or paste the text manually."
          : "Fant ingen lesbar bildetekst i de skjermbildene. Prøv tydeligere skjermbilder, eller lim inn teksten manuelt.",
    );
  }
  return text;
}

/** "Lim inn bildetekst manuelt" (admin-UI, se RecipeForm.tsx) – fallback for
 * når importFromSocialUrl over ikke får tak i siden i det hele tatt (vanlig
 * nok med Instagram/TikTok at dette er en FØRSTEKLASSES vei inn, ikke bare
 * en nødløsning). Samme tekstfelt gjenbrukes ALTSÅ for en transkribert
 * håndskrevet oppskrift (se extractCaptionTextFromImages sin filheader) –
 * `textKind` styrer hvilken AI-tolkningsprompt som brukes under, siden en
 * håndskrevet oppskrift skrives helt annerledes enn en Instagram-bildetekst.
 * `sourceUrl` er valgfri – admin kan lime inn lenken til innlegget for
 * sporbarhet (samme `source`-felt som de andre importveiene), eller la den
 * stå tom dersom de ikke har den for hånden (ALLTID tom ved håndskrift). */
export async function importRecipeFromCaptionText(
  captionText: string,
  sourceUrl: string,
  categories: { id: string; name: string }[],
  textKind: "caption" | "handwritten" = "caption",
): Promise<RecipeImportDraft> {
  await requireAdmin();

  const trimmedCaption = captionText.trim();
  if (!trimmedCaption) {
    throw new Error(
      textKind === "handwritten" ? "Lim inn den transkriberte teksten først." : "Lim inn bildeteksten først.",
    );
  }

  const trimmedSourceUrl = sourceUrl.trim();
  let source = "";
  if (trimmedSourceUrl) {
    try {
      source = new URL(trimmedSourceUrl).toString();
    } catch {
      throw new Error("Lenken til innlegget ser ikke gyldig ut – la feltet stå tomt dersom du ikke har den.");
    }
  }

  return await parseCaptionToDraft(trimmedCaption.slice(0, MAX_PLAIN_TEXT_CHARS), source, categories, null, textKind);
}

/** Delt AI-tolkning for TRE veier inn: Instagram/TikTok-bildetekst (automatisk
 * hentet og:description, ELLER manuelt limt inn/skjermbilde-transkribert), og
 * (26.08.2026) en transkribert HÅNDSKREVET oppskrift (se filheaderen til
 * importRecipeFromCaptionText over) – `textKind` velger hvilken av de to
 * (ganske ulike) tolkningspromptene som brukes. Egen prompt-familie her,
 * uansett `textKind`, i motsetning til importFromPlainText sin prompt (som
 * er tilpasset ordentlig artikkeltekst fra en oppskriftsside). */
async function parseCaptionToDraft(
  captionText: string,
  source: string,
  categories: { id: string; name: string }[],
  heroImageUrl: string | null,
  textKind: "caption" | "handwritten" = "caption",
): Promise<RecipeImportDraft> {
  const categoryNames = categories.map((c) => c.name);

  const system =
    textKind === "handwritten"
      ? "Du hjelper til med å tolke en oppskrift som er transkribert fra et HÅNDSKREVET notat (f.eks. et " +
        "oppskriftskort, en side i en notatbok, eller en løs lapp), til bruk i en norsk oppskriftsapp. " +
        "Håndskrevne oppskrifter skrives ofte kompakt og stikkordspreget: forkortede måleenheter (ss/ts/dl/g), " +
        "ingredienser uten fullstendige setninger, piler eller streker mellom trinn, kanskje overstrykninger " +
        "eller tillegg i margen – tolk dette naturlig inn i en ryddig ingrediensliste og fremgangsmåte, uten å " +
        "finne på struktur som ikke faktisk er antydet i teksten. Teksten kan inneholde transkripsjonsmerker som " +
        '"[uklart]" der håndskriften ikke lot seg lese sikkert – behold disse merkene i resultatet i stedet for ' +
        "å gjette hva som sto der, SÆRLIG for mengder/tall. Del hver ingrediens inn i mengde/enhet/navn/evt. " +
        "note. Foreslå vanskelighetsgrad, opptil 5 norske emneknagger, og en kategori KUN dersom en av de " +
        `oppgitte passer eksakt. Svar KUN med gyldig JSON i dette skjemaet: ${RECIPE_OUTPUT_SCHEMA}`
      : "Du hjelper til med å tolke en oppskrift skrevet i bildeteksten til et Instagram- eller TikTok-innlegg, til " +
        "bruk i en norsk oppskriftsapp. Bildetekster skrives ofte helt uformelt: emoji brukes ofte som punkttegn " +
        'foran hver ingrediens/hvert steg (f.eks. "🧀 200g ost"), seksjoner kan markeres med store bokstaver ' +
        '("INGREDIENSER:", "FREMGANGSMÅTE:") eller med emoji i stedet for vanlige overskrifter, og teksten ' +
        'inneholder ofte emneknagger (#...), @-nevnelser og reklame-/oppfordringssetninger ("Lagre dette innlegget!", ' +
        '"Følg for mer", "Link i bio") som IKKE hører til selve oppskriften – ignorer alt slikt fullstendig. Finn og ' +
        "strukturer den FAKTISKE oppskriften fra teksten. Oversett til norsk dersom kilden er på et annet språk – MEN " +
        "behold selve tallet/enheten i hver ingrediens EKSAKT som i kilden, også når enheten er amerikansk " +
        "(cup/tbsp/tsp/oz/lb) – IKKE oversett eller konverter enheten selv (kun ingrediensnavnet/noten rundt), det " +
        'gjøres av kode etterpå. Behold på samme måte eventuelle ovnstemperaturer i Fahrenheit (f.eks. "350°F") og ' +
        "amerikanske mål nevnt midt i fremgangsmåte-teksten uendret – det konverteres av kode etterpå. Del hver " +
        "ingrediens inn i mengde/enhet/navn/evt. note. Dersom bildeteksten ikke tydelig skiller ingrediensene fra " +
        "fremgangsmåten (vanlig i korte bildetekster) – bruk beste skjønn til likevel å dele innholdet i en " +
        "ingrediensliste og påfølgende steg, i stedet for å legge alt i én lang klump. Foreslå vanskelighetsgrad, " +
        "opptil 5 norske emneknagger, og en kategori KUN dersom en av de oppgitte passer eksakt. Svar KUN med gyldig " +
        `JSON i dette skjemaet: ${RECIPE_OUTPUT_SCHEMA}`;

  const prompt =
    textKind === "handwritten"
      ? `Transkribert tekst fra håndskrevet oppskrift:\n${captionText}\n\nTilgjengelige kategorier: ${categoryNames.join(", ") || "(ingen)"}`
      : `Bildetekst:\n${captionText}\n\nTilgjengelige kategorier: ${categoryNames.join(", ") || "(ingen)"}`;

  const result = await callAndParse(system, prompt);
  return assembleDraft(result, {
    source,
    categories,
    heroImageUrl,
    knownServings: null,
    knownPrep: null,
    knownCook: null,
    knownTotal: null,
    warning:
      textKind === "handwritten"
        ? "Hentet fra et bilde av en håndskrevet oppskrift – håndskrift kan bli feiltolket, spesielt tall og " +
          'mengder. Se etter "[uklart]"-merker og gå ekstra nøye gjennom ingredienser og fremgangsmåte før du ' +
          "publiserer."
        : "Hentet fra en bildetekst (Instagram/TikTok) – disse er ofte skrevet uformelt og kan mangle presise " +
          "mengder/tider. Gå ekstra nøye gjennom ingredienser og fremgangsmåte før du publiserer.",
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
    source: string;
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
      "Klarte ikke å finne ingredienser og fremgangsmåte. Prøv en annen kilde, eller fyll ut skjemaet manuelt.",
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
    source: opts.source,
    warning: opts.warning,
  };
}
