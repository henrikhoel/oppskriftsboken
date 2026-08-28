/**
 * DETERMINISTISKE hjelpefunksjoner for å lese strukturert oppskriftsdata ut
 * av rå HTML fra en ekstern nettside – brukt av "Importer fra lenke"
 * (lib/actions/recipe-import.ts). Ingen AI her: dette er ren tekst-/
 * JSON-parsing, akkurat som pantry-match.ts sin filheader beskriver samme
 * prinsipp for "Hva kan jeg lage?" – AI skal kun brukes der oppgaven faktisk
 * er tvetydig (f.eks. å dele en rå ingredienslinje som "2 dl melk" inn i
 * mengde/enhet/navn, eller å tolke en side som IKKE har strukturert data).
 *
 * De aller fleste oppskriftssider (for SEO/"rich results" i Google) legger
 * inn et <script type="application/ld+json">-blokk med schema.org sitt
 * Recipe-format. Når den finnes er den svært pålitelig – ingrediensene og
 * fremgangsmåten er nøyaktig det oppskriftsforfatteren skrev, ikke noe en AI
 * har gjettet seg til fra generell sidetekst. Derfor prøver vi alltid dette
 * FØRST, og faller kun tilbake til fri tekst (stripHtmlToText) når det ikke
 * finnes.
 */

export interface JsonLdRecipe {
  name?: unknown;
  description?: unknown;
  image?: unknown;
  recipeIngredient?: unknown;
  recipeInstructions?: unknown;
  recipeYield?: unknown;
  prepTime?: unknown;
  cookTime?: unknown;
  totalTime?: unknown;
  recipeCategory?: unknown;
  recipeCuisine?: unknown;
  keywords?: unknown;
  [key: string]: unknown;
}

/** Sjekker om et vilkårlig JSON-LD-objekt sin @type er (eller inkluderer)
 * "Recipe" – @type kan være en enkelt streng eller et array av strenger. */
function isRecipeType(node: unknown): node is JsonLdRecipe {
  if (!node || typeof node !== "object") return false;
  const type = (node as { "@type"?: unknown })["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  return false;
}

/** Leter rekursivt gjennom et parset JSON-LD-tre etter et Recipe-objekt.
 * Håndterer de tre vanlige formene sider bruker: et enkelt Recipe-objekt
 * direkte, et array av objekter (typisk sammen med f.eks. BreadcrumbList),
 * og en @graph-wrapper (vanlig med Yoast/WordPress-SEO-plugins). */
function findRecipeNode(node: unknown, depth = 0): JsonLdRecipe | null {
  if (depth > 4 || !node) return null;
  if (isRecipeType(node)) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const graph = (node as { "@graph"?: unknown })["@graph"];
    if (graph) {
      const found = findRecipeNode(graph, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Finner og parser det første Recipe-objektet blant alle
 * <script type="application/ld+json">-blokkene på siden. Returnerer null
 * (aldri en feil) dersom siden ikke har noen, eller ingen av dem er gyldig
 * JSON – dette er en "best effort"-funksjon, kalleren har alltid en
 * AI-basert fallback tilgjengelig. */
export function extractJsonLdRecipe(html: string): JsonLdRecipe | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of blocks) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const recipe = findRecipeNode(parsed);
      if (recipe) return recipe;
    } catch {
      // Ugyldig/uferdig JSON i denne blokken – prøv neste, ikke gi opp helt.
      continue;
    }
  }
  return null;
}

/** Parser en ISO 8601-varighet ("PT1H30M", "PT45M", "PT2H") til antall
 * minutter. Returnerer null for tomme/ugyldige/manglende verdier, ALDRI 0 –
 * 0 minutter ville sett ut som en bevisst oppgitt verdi i skjemaet, mens
 * null riktig blir stående som et tomt felt admin selv kan fylle inn. */
export function parseIsoDurationToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 60 + minutes + Math.round(seconds / 60);
  return total > 0 ? total : null;
}

/** schema.org sin recipeYield kan være et tall, en tallstreng ("4"), en
 * beskrivende streng ("4 porsjoner"/"Serves 4-6"), eller et array av disse.
 * Plukker ut det FØRSTE hele tallet som finnes – dekker alle variantene
 * over uten å prøve å tolke tekst som "4-6" til noe mer presist enn "4". */
export function parseYieldToServings(value: unknown): number | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      return Math.round(candidate);
    }
    if (typeof candidate === "string") {
      const match = candidate.match(/\d+/);
      if (match) return Number(match[0]);
    }
  }
  return null;
}

/** schema.org sin recipeIngredient er nesten alltid et array av rene
 * tekstlinjer allerede ("2 dl melk") – denne funksjonen rydder kun bort
 * HTML-entiteter/whitespace, den DELER IKKE linjen i mengde/enhet/navn
 * (det krever tolkning av frie, varierte formater og gjøres derfor av AI-en
 * i lib/actions/recipe-import.ts, ikke her). */
export function cleanJsonLdIngredientLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((line) => decodeHtmlEntities(line).trim())
    .filter(Boolean);
}

/** schema.org sin recipeInstructions kan være: én enkelt fritekststreng
 * (evt. med linjeskift mellom hvert steg), et array av strenger, eller et
 * array av HowToStep-/HowToSection-objekter (der HowToSection igjen har et
 * eget itemListElement-array med steg – vanlig for oppskrifter delt inn i
 * "Deig"/"Fyll"/"Glasur" osv.). Flater ALLTID ut til en enkel liste med
 * rene tekststeg, uavhengig av hvilken variant siden brukte. */
export function flattenJsonLdInstructions(value: unknown): string[] {
  const steps: string[] = [];

  function visit(node: unknown) {
    if (!node) return;
    if (typeof node === "string") {
      // Noen sider oppgir HELE fremgangsmåten som én streng med linjeskift
      // mellom hvert steg, i stedet for et array – del opp på linjeskift her
      // slik at hvert steg likevel blir en egen oppføring i resultatet.
      const lines = decodeHtmlEntities(node)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      steps.push(...lines);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object") {
      const obj = node as { text?: unknown; name?: unknown; itemListElement?: unknown };
      if (obj.itemListElement) {
        visit(obj.itemListElement);
        return;
      }
      const text = typeof obj.text === "string" ? obj.text : typeof obj.name === "string" ? obj.name : null;
      if (text) {
        const cleaned = decodeHtmlEntities(text).trim();
        if (cleaned) steps.push(cleaned);
      }
    }
  }

  visit(value);
  return steps;
}

/** Plukker ut en enkelt bilde-URL fra schema.org sitt image-felt, som kan
 * være en ren streng, et array av strenger, eller et (eller flere)
 * ImageObject-objekt(er) med en url-egenskap. Tar alltid det første. */
export function extractFirstImageUrl(value: unknown): string | null {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (candidate && typeof candidate === "object") {
      const url = (candidate as { url?: unknown }).url;
      if (typeof url === "string" && url.trim()) return url.trim();
    }
  }
  return null;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

/** Plukker ut innholdet i en <meta>-tagg ved property ELLER name (f.eks.
 * property="og:description" eller name="description") – rekkefølgen på
 * attributtene i selve taggen kan variere fra side til side, så alle fire
 * kombinasjoner forsøkes. Brukes for Instagram/TikTok-innlegg (se
 * stripSocialCaptionBoilerplate under), som ikke har schema.org Recipe
 * JSON-LD, men som ALLTID setter disse metataggene – plattformen er selv
 * avhengig av at Facebook/Slack/Twitter sine egne "hent lenke-forhåndsvisning"-
 * roboter kan lese dem, og bruker derfor ikke innloggingsveggen mot disse
 * spesifikt (se user-agenten importFromSocialUrl bruker i recipe-import.ts). */
export function extractMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]).trim();
  }
  return null;
}

/** Instagram/TikTok sin og:description er ALDRI bare bildeteksten alene –
 * plattformen legger alltid til en maskinlesbar prefiks foran den ("1 234
 * likes, 56 comments - brukernavn on Instagram: ", "12K Likes, 340 Comments.
 * TikTok video from brukernavn (@brukernavn): ") og pakker selve
 * bildeteksten inn i anførselstegn til slutt i strengen. Strippes bort
 * deterministisk (samme "kjent, fast mønster"-prinsipp som resten av denne
 * fila – ingen AI her) slik at AI-tolkningen i recipe-import.ts kun ser den
 * FAKTISKE bildeteksten, ikke plattformens boilerplate rundt den. Returnerer
 * originalteksten uendret dersom ingen av de to mønstrene kjennes igjen
 * (nytt/endret format hos plattformen) – bedre å sende med litt boilerplate
 * enn å risikere å kutte bort ekte innhold ved en feilaktig antakelse. */
export function stripSocialCaptionBoilerplate(ogDescription: string): string {
  const trimmed = ogDescription.trim();
  const igMatch = trimmed.match(/on Instagram:\s*"([\s\S]*)"\s*$/i);
  if (igMatch?.[1]) return igMatch[1].trim();
  const ttMatch = trimmed.match(/TikTok video from[^:]*:\s*"([\s\S]*)"\s*$/i);
  if (ttMatch?.[1]) return ttMatch[1].trim();
  return trimmed;
}

/** Fallback for sider UTEN JSON-LD-oppskriftsdata: strekker rå HTML om til
 * lesbar ren tekst en AI kan tolke – fjerner script/style/nav/footer-
 * innhold (rent støy for en oppskrift), alle resterende tagger, og
 * normaliserer whitespace. Ikke en fullverdig HTML-parser (ingen
 * DOM-avhengighet i prosjektet, se filheaderen i recipe-import.ts), men mer
 * enn godt nok som råmateriale for AI-tolkning. */
export function stripHtmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withBreaks = withoutNoise
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withBreaks)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
