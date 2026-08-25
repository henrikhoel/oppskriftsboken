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
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mangler i .env.local. Denne funksjonen krever en Anthropic API-nøkkel.",
    );
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
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
            },
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
