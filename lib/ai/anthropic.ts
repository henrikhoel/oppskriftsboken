/**
 * Tynn wrapper rundt Anthropics Messages API via fetch – ingen ekstra
 * npm-avhengighet nødvendig. Brukes av lib/actions/ai.ts for
 * vinanbefaling, vin-match-sjekk og vegetarvariant.
 *
 * Krever ANTHROPIC_API_KEY i .env.local. Kalles ALDRI fra klientkode
 * (kun fra "use server"-actions), så nøkkelen eksponeres aldri til
 * nettleseren.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// Rimelig, rask modell – mer enn nok for korte vin-/vegetarforslag.
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicContentBlock {
  type: string;
  text?: string;
  // Kun satt på "web_search_tool_result"-blokker – selve de EKTE treffene
  // web-søk-verktøyet fant (se callClaudeWebSearchJSON under). Strukturert
  // data fra API-et, IKKE noe modellen skrev selv – derfor pålitelig på en
  // måte fritekst aldri kan være.
  content?: { type: string; url?: string; title?: string }[];
  // Kun satt på "tool_use"-blokker – navnet på verktøyet modellen kalte
  // (se submit_result-verktøyet i callClaudeWebSearchJSON) og de allerede
  // TOLKEDE, strukturerte argumentene den kalte det med. Anthropic
  // GARANTERER at input matcher input_schema (validert på protokollnivå),
  // så dette trenger ALDRI en egen JSON.parse slik fritekst-svar gjør.
  name?: string;
  input?: unknown;
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
}

/** Ett faktisk, verifisert søketreff – hentet direkte fra Anthropic sin
 * strukturerte web_search_tool_result-data, ikke fra modellens egen
 * tekstgjengivelse av det (se callClaudeWebSearchJSON). */
export interface WebSearchResultItem {
  url: string;
  title: string;
}

/** Kaller Claude med en systemprompt + brukerprompt, returnerer rå tekst.
 * `temperature` er valgfri – utelates den bruker Anthropic sin standard
 * (rundt 1, altså ganske "kreativ"/variabel fra kall til kall). Sett den
 * lavt (f.eks. 0.2-0.3) for oppgaver der vi vil ha mest mulig konsistente,
 * gjentakbare svar – som å rangere/matche ekte data – i stedet for
 * kreativ variasjon (se matchWineToRecipes/-FromImage). */
export async function callClaude(
  system: string,
  userPrompt: string,
  maxTokens = 500,
  temperature?: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mangler i .env.local. Denne funksjonen krever en Anthropic API-nøkkel.",
    );
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`AI-forespørselen feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as AnthropicMessageResponse;
  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("Fikk ikke noe tekstsvar fra AI-en. Prøv igjen.");
  }
  return textBlock.text;
}

/**
 * Som callClaude, men ber modellen svare med JSON og parser resultatet.
 * Kaster en lesbar feil dersom svaret ikke er gyldig JSON, slik at
 * kallende kode kan vise en "prøv igjen"-melding i stedet for å krasje.
 */
export async function callClaudeJSON<T>(
  system: string,
  userPrompt: string,
  maxTokens = 800,
  temperature?: number,
): Promise<T> {
  const fullSystem = `${system}\n\nSvar KUN med gyldig JSON – ingen markdown-kodeblokk, ingen forklaringstekst før eller etter.`;
  const raw = await callClaude(fullSystem, userPrompt, maxTokens, temperature);
  return parseJsonResponse<T>(raw);
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Redningsplanke (lagt til 27.08.2026 etter at Henrik fikk "Klarte ikke
    // å tolke svaret" gjentatte ganger på web-søk-baserte kall): modellen
    // legger av og til til tekst UTENFOR selve JSON-en likevel, til tross
    // for instruksen om å ikke gjøre det – særlig ved web-søk, der
    // callClaudeWebSearchJSON slår sammen flere tekstblokker og en av dem
    // kan inneholde en avsluttende kommentar. Prøv å hente ut kun den
    // FØRSTE balanserte {...}/[...]-blokken i teksten før vi gir opp helt.
    const extracted = extractBalancedJson(cleaned);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch {
        // Falt gjennom til feilmeldingen under.
      }
    }

    // Svar som verken slutter på "}" eller "]" er nesten alltid kuttet av
    // fordi maxTokens ble for lav for et stort/detaljert svar (f.eks. en
    // lang oppskrift), IKKE et reelt formateringsproblem – gi da en
    // mer treffende feilmelding enn den generiske under, slik at kalleren
    // vet å prøve med en høyere maxTokens i stedet for å bare prøve på nytt.
    const looksTruncated = !/[}\]]\s*$/.test(cleaned);
    throw new Error(
      looksTruncated
        ? "Svaret fra AI-en ble kuttet av før det var ferdig (trolig for stort/detaljert til å få plass). Prøv igjen, eller forenkle det du ber om."
        : "Klarte ikke å tolke svaret fra AI-en. Prøv igjen.",
    );
  }
}

/** Finner den FØRSTE balanserte {...}- eller [...]-blokken i en tekst – se
 * bruken i parseJsonResponse over. Teller klammer/hakeparenteser naivt
 * (hopper over strenger, ikke en fullverdig JSON-tokenizer) – trenger bare
 * å finne riktig SLUTT-posisjon, selve valideringen skjer i JSON.parse rett
 * etterpå uansett. */
function extractBalancedJson(text: string): string | null {
  const startMatch = text.match(/[{[]/);
  if (!startMatch || startMatch.index === undefined) return null;
  const start = startMatch.index;
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === openChar) {
      depth++;
    } else if (c === closeChar) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export interface WebSearchToolOptions {
  /** Kuratert liste bare-domener (uten https://, f.eks. "matprat.no") –
   * begrenser søket til kjente, pålitelige nettsteder i stedet for å la
   * modellen søke (og sitere) hele det åpne nettet. */
  allowedDomains?: string[];
  /** Maks antall faktiske søk modellen får gjøre i ÉN forespørsel. */
  maxUses?: number;
}

/**
 * Som callClaudeJSON, men gir modellen tilgang til Anthropics EKTE, hostede
 * web-søk-verktøy før den svarer. Dette er et SERVER-SIDE verktøy – ett
 * enkelt API-kall utfører hele søk-og-svar-runden internt (Anthropic
 * håndterer selve søke-løkken), så det er ingen egen løkke å implementere
 * her, i motsetning til f.eks. et vanlig "tool use"-oppsett.
 *
 * Brukes KUN der vi faktisk trenger EKTE, verifiserbare lenker (se
 * findExternalRecipeMatches i lib/actions/ai.ts) – ALDRI der modellen bare
 * skal dikte opp innhold selv (den slags bruker vanlig callClaudeJSON, uten
 * søk, for å unngå unødvendig kostnad/latens per kall).
 *
 * Plukker alle tekstblokkene som kommer ETTER siste søk-relaterte blokk
 * (ikke bare den aller siste, slik et tidligere forsøk gjorde – se
 * feilrettingen 27.08.2026 under). Modellen kan skrive korte mellomstegs-
 * setninger mens den søker, men det VIKTIGSTE er: når svaret siterer
 * søketreff (citations), deler Anthropic selve sluttsvaret opp i FLERE
 * separate tekstblokker (én per siterte del) i stedet for én sammenhengende
 * blokk – å kun plukke den siste ga da bare den AVSLUTTENDE biten av
 * JSON-en (f.eks. bare "]}"), som feilet i JSON.parse med "Klarte ikke å
 * tolke svaret fra AI-en" (rapportert av Henrik 27.08.2026, "Finn
 * oppskrifter andre steder"-knappen). Riktig fiks: slå sammen ALLE
 * tekstblokker etter siste tool_use/tool_result-blokk til én streng, ikke
 * bare den siste.
 *
 * Returnerer OGSÅ searchResults – de EKTE url/tittel-parene hentet direkte
 * fra web_search_tool_result-blokkene (strukturert API-data), IKKE
 * modellens egen tekstgjengivelse av dem. Lagt til 27.08.2026 etter at
 * Henrik meldte om en lenke med skrivefeil (én bokstav for mye) på et
 * Tine-treff – modellen fant riktig side, men "skrev av" URL-en feil i
 * JSON-svaret sitt. Kalleren (findExternalRecipeMatches i
 * lib/actions/ai.ts) skal bruke DENNE listen som fasit for selve URL-en,
 * aldri url-feltet i modellens JSON-svar direkte.
 *
 * ANDRE FEILRETTING 27.08.2026, samme dag: Henrik fikk FORTSATT "Klarte
 * ikke å tolke svaret" på "Finn oppskrifter andre steder" etter fiksen
 * over (tekstblokk-sammenslåingen) – trolig fordi selve JSON-TEKSTEN
 * modellen skrev var ugyldig i seg selv (f.eks. et anførselstegn inni en
 * oppskrifts-tittel/note som ikke ble escapet riktig), ikke bare
 * feilplassert. Fritekst-JSON fra en modell er ALDRI 100 % robust mot
 * dette, uansett hvor godt den blir bedt om å escape riktig. Løsningen:
 * be modellen levere svaret som et STRUKTURERT VERKTØYKALL
 * ("submit_result", definert med et JSON Schema under) i stedet for
 * fritekst – Anthropic validerer og parser argumentene på PROTOKOLL-nivå
 * (garantert gyldig JSON, ingen escape-feil mulig), så resultatet trenger
 * aldri en egen JSON.parse i det hele tatt. Dette er den robuste,
 * riktige løsningen – tekstbasert JSON-parsing (parseJsonResponse)
 * beholdes KUN som en fallback for det (usannsynlige) tilfellet at
 * modellen ikke kaller verktøyet.
 */
export async function callClaudeWebSearchJSON<T>(
  system: string,
  userPrompt: string,
  resultSchema: Record<string, unknown>,
  options: WebSearchToolOptions & { maxTokens?: number } = {},
): Promise<{ data: T; searchResults: WebSearchResultItem[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mangler i .env.local. Denne funksjonen krever en Anthropic API-nøkkel.",
    );
  }

  const fullSystem = `${system}\n\nNår du er ferdig med eventuelle søk, kall "submit_result"-verktøyet med det endelige, strukturerte resultatet – ikke skriv resultatet som vanlig tekst.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens ?? 1500,
      system: fullSystem,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: options.maxUses ?? 5,
          ...(options.allowedDomains ? { allowed_domains: options.allowedDomains } : {}),
        },
        {
          name: "submit_result",
          description: "Send inn det endelige, strukturerte resultatet etter at eventuelle søk er utført.",
          input_schema: resultSchema,
        },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`AI-søket feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as AnthropicMessageResponse;
  const content = data.content ?? [];

  // Samler EKTE url/tittel-par fra web_search_tool_result-blokkene – se
  // filheaderen over for hvorfor dette er fasiten, ikke JSON-teksten.
  const searchResults: WebSearchResultItem[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const item of block.content) {
      if (item.type === "web_search_result" && item.url && item.title) {
        searchResults.push({ url: item.url, title: item.title });
      }
    }
  }

  // Primærvei: strukturert verktøykall (se filheaderen for hvorfor dette
  // er den robuste veien) – input er allerede tolket av Anthropic selv.
  const toolUseBlock = content.find((block) => block.type === "tool_use" && block.name === "submit_result");
  if (toolUseBlock && toolUseBlock.input !== undefined) {
    return { data: toolUseBlock.input as T, searchResults };
  }

  // Fallback (bør sjelden inntreffe): modellen svarte med fritekst i
  // stedet for å kalle verktøyet – prøv å tolke den som JSON på gamlemåten.
  let lastToolIndex = -1;
  content.forEach((block, i) => {
    if (block.type === "server_tool_use" || block.type === "web_search_tool_result") lastToolIndex = i;
  });
  const lastText = content
    .slice(lastToolIndex + 1)
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("");
  if (!lastText) {
    throw new Error("Fikk ikke noe strukturert svar fra AI-søket. Prøv igjen.");
  }

  return { data: parseJsonResponse<T>(lastText), searchResults };
}

/**
 * Som callClaudeJSON, men ber modellen levere svaret som et STRUKTURERT
 * VERKTØYKALL (samme "submit_result"-mønster som callClaudeWebSearchJSON,
 * se filheaderen der for hele begrunnelsen) i stedet for fritekst-JSON –
 * Anthropic validerer og parser argumentene på PROTOKOLL-nivå, så
 * resultatet er garantert gyldig JSON uansett hvor mye fri tekst (lange
 * setninger, anførselstegn, spesialtegn) selve INNHOLDET i feltene
 * inneholder. INGEN web-søk her (ren tool_choice-tvunget variant) – brukes
 * for kall der svaret er for fritekst-tungt (f.eks. hele stegtekster) til
 * at vanlig callClaudeJSON sin escape-avhengige tilnærming er trygg nok,
 * se integrateStepsWithImprovements i lib/actions/ai.ts.
 *
 * `tool_choice` tvinger modellen til alltid å kalle "submit_result" (mulig
 * her fordi det ikke er noe web-søk-verktøy å veksle med i tillegg, i
 * motsetning til callClaudeWebSearchJSON) – enda litt mer robust enn der,
 * siden fallback-veien under i praksis aldri skal trenge å brukes.
 */
export async function callClaudeToolJSON<T>(
  system: string,
  userPrompt: string,
  resultSchema: Record<string, unknown>,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mangler i .env.local. Denne funksjonen krever en Anthropic API-nøkkel.",
    );
  }

  const fullSystem = `${system}\n\nKall "submit_result"-verktøyet med det endelige, strukturerte resultatet – ikke skriv resultatet som vanlig tekst.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens ?? 1500,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      system: fullSystem,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: "submit_result",
          description: "Send inn det endelige, strukturerte resultatet.",
          input_schema: resultSchema,
        },
      ],
      tool_choice: { type: "tool", name: "submit_result" },
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`AI-forespørselen feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as AnthropicMessageResponse;
  const content = data.content ?? [];

  const toolUseBlock = content.find((block) => block.type === "tool_use" && block.name === "submit_result");
  if (toolUseBlock && toolUseBlock.input !== undefined) {
    return toolUseBlock.input as T;
  }

  // Fallback (bør i praksis aldri inntreffe med tool_choice tvunget over) –
  // samme forsiktighetsprinsipp som callClaudeWebSearchJSON.
  const text = content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("");
  if (!text) {
    throw new Error("Fikk ikke noe strukturert svar fra AI-en. Prøv igjen.");
  }
  return parseJsonResponse<T>(text);
}

export type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Godtatte bilde-typer for Anthropic sitt vision-API. */
export const SUPPORTED_IMAGE_MEDIA_TYPES: readonly SupportedImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Som callClaudeJSON, men legger ved ett bilde (base64, uten data-URL-
 * prefikset) i tillegg til tekstprompten – brukt til å kjenne igjen
 * vinen på et bilde av etiketten (se getWineRecommendationFromImage /
 * checkWineMatchFromImage i lib/actions/ai.ts).
 */
export async function callClaudeVisionJSON<T>(
  system: string,
  userPrompt: string,
  image: { mediaType: SupportedImageMediaType; base64Data: string },
  maxTokens = 800,
  temperature?: number,
): Promise<T> {
  return callClaudeMultiImageVisionJSON<T>(system, userPrompt, [image], maxTokens, temperature);
}

/**
 * Som callClaudeVisionJSON, men legger ved FLERE bilder i samme kall (i
 * rekkefølge, før tekstprompten) – brukt når ett bilde ikke er nok til å
 * dekke alt innholdet, f.eks. flere skjermbilder av en lang Instagram/
 * TikTok-bildetekst som ikke fikk plass i ett skjermbilde (se
 * extractCaptionTextFromImages i lib/actions/recipe-import.ts). Å sende alle
 * bildene i ÉTT kall (fremfor ett kall per bilde, satt sammen etterpå i
 * klientkoden) lar modellen selv gjenkjenne og luke ut linjer som er synlige
 * i overlappende skjermbilder (vanlig ved skjermbilder tatt mens man
 * scroller), i stedet for å risikere dupliserte linjer i den sammensatte
 * teksten.
 */
export async function callClaudeMultiImageVisionJSON<T>(
  system: string,
  userPrompt: string,
  images: { mediaType: SupportedImageMediaType; base64Data: string }[],
  maxTokens = 800,
  temperature?: number,
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mangler i .env.local. Denne funksjonen krever en Anthropic API-nøkkel.",
    );
  }
  if (images.length === 0) {
    throw new Error("Ingen bilder å sende.");
  }

  const fullSystem = `${system}\n\nSvar KUN med gyldig JSON – ingen markdown-kodeblokk, ingen forklaringstekst før eller etter.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      system: fullSystem,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
            })),
            { type: "text", text: userPrompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`AI-forespørselen feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as AnthropicMessageResponse;
  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("Fikk ikke noe tekstsvar fra AI-en. Prøv igjen.");
  }
  return parseJsonResponse<T>(textBlock.text);
}
