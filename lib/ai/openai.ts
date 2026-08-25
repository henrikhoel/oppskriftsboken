/**
 * Tynn wrapper rundt OpenAI sitt bilde-API (Images API) via fetch – ingen
 * ekstra npm-avhengighet, samme mønster som lib/ai/anthropic.ts. Brukes av
 * lib/actions/ai.ts til å generere et midlertidig AI-bilde av retten i
 * admin, frem til et ekte foto legges inn.
 *
 * Krever OPENAI_API_KEY i .env.local (i tillegg til ANTHROPIC_API_KEY –
 * dette er en helt separat tjeneste/nøkkel). Kalles ALDRI fra klientkode
 * (kun fra "use server"-actions), så nøkkelen eksponeres aldri til
 * nettleseren.
 */

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-1";

interface OpenAiImageResponse {
  data?: { b64_json?: string }[];
  error?: { message?: string };
}

export interface DishImageContext {
  title: string;
  description: string;
  ingredientNames: string[];
}

function buildPrompt({ title, description, ingredientNames }: DishImageContext): string {
  const ingredientsText = ingredientNames.slice(0, 12).join(", ");
  const descText = description.trim();
  return (
    `Moody, elegant restaurant food photography of the dish "${title}"` +
    (descText ? ` — ${descText}.` : ".") +
    (ingredientsText ? ` Key ingredients visible: ${ingredientsText}.` : "") +
    " Plated beautifully on a dark ceramic or stone plate, shot from a close, dramatic angle with " +
    "warm, low, cinematic lighting — deep shadows, a soft golden highlight on the food, shallow depth " +
    "of field, rich dark background fading to near-black at the edges. A hint of dark wood or stone " +
    "table surface, perhaps an out-of-focus wine glass or cutlery nearby. No text, no watermarks, no " +
    "people, no hands, no visible brand logos. Photorealistic, high-end editorial restaurant-magazine " +
    "style — matches a dark, gold-accented, upscale dining aesthetic, not a bright rustic kitchen look."
  );
}

/** Delt hjelpefunksjon som faktisk kaller OpenAI sitt bilde-API, brukt av
 * både generateDishImageBase64 (admin, per oppskrift) og
 * generateHeroImageBase64 (forsidens hero-bakgrunn, se scripts/generate-
 * hero-image.ts). */
async function generateImageBase64(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY mangler i .env.local. AI-bildegenerering krever en egen OpenAI API-nøkkel.",
    );
  }

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Bildegenerering feilet (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = (await res.json()) as OpenAiImageResponse;
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(data.error?.message || "Fikk ikke noe bilde tilbake fra AI-en. Prøv igjen.");
  }
  return b64;
}

/**
 * Genererer ett bilde av retten og returnerer det som base64 (PNG, uten
 * data-URL-prefiks). Kaster en lesbar feil ved manglende nøkkel, feil fra
 * OpenAI, eller et uventet svarformat.
 */
export async function generateDishImageBase64(context: DishImageContext): Promise<string> {
  return generateImageBase64(buildPrompt(context));
}

/** Prompten for forsidens hero-bakgrunnsbilde – bevisst IKKE knyttet til
 * noen bestemt rett, siden dette er et generelt stemningsbilde bak À
 * TABLE-ordmerket, ikke et produktbilde av mat. Matcher den mørke,
 * gull-aksenterte "elegant restaurant"-paletten fra app/globals.css. */
const HERO_IMAGE_PROMPT =
  "A moody, elegant fine-dining scene shot in cinematic low light. A dark ceramic or stone plate " +
  "with a beautifully plated dish sits on a dark wooden or stone table, softly lit by warm candlelight " +
  "and gentle golden highlights against a deep near-black background. Shallow depth of field, rich " +
  "shadows, warm amber and gold tones, a few out-of-focus wine glasses or cutlery nearby. Wide " +
  "landscape composition suitable for a website hero banner, with darker, emptier space toward the " +
  "edges so text can be overlaid on top. No text, no watermarks, no logos, no people, no hands. " +
  "Photorealistic, high-end editorial restaurant photography style.";

/**
 * Genererer forsidens hero-bakgrunnsbilde og returnerer det som base64
 * (PNG, uten data-URL-prefiks). Kalles fra scripts/generate-hero-image.ts,
 * IKKE fra en server action – dette er et bevisst engangs-verktøy man
 * kjører lokalt for å (re)generere public/images/hero.png, ikke noe som
 * genereres på nytt for hver besøkende.
 */
export async function generateHeroImageBase64(): Promise<string> {
  return generateImageBase64(HERO_IMAGE_PROMPT);
}
