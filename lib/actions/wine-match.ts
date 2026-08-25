"use server";

import {
  callClaudeJSON,
  callClaudeVisionJSON,
  SUPPORTED_IMAGE_MEDIA_TYPES,
  type SupportedImageMediaType,
} from "@/lib/ai/anthropic";
import { getPublishedRecipeSummaries } from "@/lib/data/recipes";
import type { RecipeSummary } from "@/lib/types";
import type { Lang } from "@/lib/i18n/lang";

/**
 * "Sjekk vinen min"-retningen på forsidens Mat & vin-seksjon: gjesten
 * beskriver EN VIN DE HAR (som tekst, eller nå også som et FOTO av flasken/
 * etiketten – samme bilde-gjenkjenningsmønster som checkWineMatchFromImage i
 * lib/actions/ai.ts bruker for enkeltoppskrifter), og vi finner de beste
 * matchene blant de FAKTISKE publiserte oppskriftene i katalogen – motsatt
 * retning av lib/actions/vinmonopolet.ts (som går fra rett -> ekte vinflaske).
 *
 * Ingen hardkodede/tilfeldige prosenter: AI-en vurderer hver kandidat og
 * gir en 0-100 matchscore + kort begrunnelse i ÉN samlet forespørsel (i
 * stedet for ett AI-kall per oppskrift, som ville vært tregt og dyrt).
 * Scorene er en AI-vurdering, ikke en objektiv fasit – det sier vi også
 * rett ut i UI-et (se home.wine.disclaimer).
 *
 * Tekst- og bilde-varianten deler kandidat-henting og svar-parsing (under)
 * – kun selve AI-kallet (callClaudeJSON vs. callClaudeVisionJSON) og
 * system-prompten skiller dem.
 *
 * MATCH_TEMPERATURE: dette er en vurderings-/rangeringsoppgave over ekte
 * data, ikke fri tekstgenerering – vi vil ha mest mulig konsistente svar
 * fra kall til kall (samme vin bør typisk gi samme topptreff), ikke
 * kreativ variasjon. Anthropic sin standardtemperatur (rundt 1) gir merkbar
 * sprik mellom identiske forespørsler; en lav temperatur her demper det
 * betydelig. Helt identisk svar hver gang er likevel ikke garantert – det
 * er iboende i hvordan språkmodeller virker – men resultatene bør bli langt
 * mer stabile, og for en "vanlig" vin med flere gode retter i katalogen er
 * det også naturlig at rekkefølgen blant de nærmeste konkurrentene kan
 * variere noe.
 */
const MATCH_TEMPERATURE = 0.2;

/** Maks antall kandidat-oppskrifter vi sender til modellen i én forespørsel
 * – nok til et representativt utvalg uten at prompten blir enorm. Nyeste
 * først, samme rekkefølge som resten av siden bruker som standard. */
const MAX_CANDIDATES = 60;

export interface WineRecipeMatch {
  recipe: RecipeSummary;
  score: number;
  reasoning: string;
}

export interface WineToRecipesResult {
  wineNameParsed: string;
  matches: WineRecipeMatch[];
}

async function getCandidates(lang: Lang): Promise<RecipeSummary[]> {
  const allRecipes = await getPublishedRecipeSummaries();
  if (allRecipes.length === 0) {
    throw new Error(
      lang === "en"
        ? "No published recipes to match against yet."
        : "Ingen publiserte oppskrifter å matche mot ennå.",
    );
  }
  return allRecipes.slice(0, MAX_CANDIDATES);
}

/** Nummererte kandidater (1-basert) – se parseMatchesResponse for hvorfor:
 * modellen ber om NUMMERET tilbake i stedet for å skrive av tittelen, som
 * er en langt mer pålitelig oppgave for en språkmodell enn eksakt
 * tegn-for-tegn gjengivelse av tekst (spesielt med norske tegn som æøå,
 * anførselstegn eller lange titler – én bokstav feil ga full bom før). */
function formatCandidateList(candidates: RecipeSummary[]): string {
  return candidates
    .map((c, i) => `${i + 1}. ${c.title}${c.category ? ` (${c.category.name})` : ""}: ${c.description.slice(0, 140)}`)
    .join("\n");
}

/** Delt av begge varianter: tolker AI-svaret tilbake til ekte oppskrifter
 * via NUMMERET modellen oppga (se formatCandidateList), klemmer score til
 * 0-100, sorterer og kutter til topp 3. Kaster en lokalisert feil hvis
 * svaret er ubrukelig/tomt. */
function parseMatchesResponse(
  raw: { wineNameParsed?: unknown; matches?: unknown },
  candidates: RecipeSummary[],
  lang: Lang,
  wineNameFallback: string,
): WineToRecipesResult {
  if (!Array.isArray(raw.matches)) {
    throw new Error(
      lang === "en" ? "Got an unexpected response from the AI. Please try again." : "Fikk et uventet svar fra AI-en. Prøv igjen.",
    );
  }

  const matches: WineRecipeMatch[] = raw.matches
    .map((m) => {
      const entry = m as Record<string, unknown>;
      const indexNum = Number(entry.index);
      const recipe = Number.isInteger(indexNum) ? candidates[indexNum - 1] : undefined;
      if (!recipe) return null;
      const scoreNum = Number(entry.score);
      const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : 0;
      const reasoning = typeof entry.reasoning === "string" ? entry.reasoning.slice(0, 300) : "";
      return { recipe, score, reasoning };
    })
    .filter((m): m is WineRecipeMatch => m !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (matches.length === 0) {
    throw new Error(
      lang === "en"
        ? "Couldn't match any dishes to that wine. Please try again."
        : "Klarte ikke å finne treff blant rettene for den vinen. Prøv igjen.",
    );
  }

  const wineNameParsed =
    typeof raw.wineNameParsed === "string" && raw.wineNameParsed.trim()
      ? raw.wineNameParsed.trim().slice(0, 120)
      : wineNameFallback;

  return { wineNameParsed, matches };
}

export async function matchWineToRecipes(
  wineDescriptionRaw: string,
  lang: Lang = "no",
): Promise<WineToRecipesResult> {
  const wineDescription = wineDescriptionRaw.trim().slice(0, 200);
  if (!wineDescription) {
    throw new Error(lang === "en" ? "Describe a wine first." : "Beskriv en vin først.");
  }

  const candidates = await getCandidates(lang);

  const system =
    lang === "en"
      ? "You are a knowledgeable sommelier. A guest describes a wine they have (may be a grape, region, style, or " +
        "just a vague description). You are given a NUMBERED list of REAL dishes from a digital cookbook's " +
        "catalog, each with a title and short description. First, interpret which wine is meant in a short, " +
        "clean label. Then pick the 3 dishes from the list that pair best with that wine, each with a genuinely " +
        "discriminating 0-100 match score (do not cluster every score near the same number – a poor match should " +
        "score well below a great one) and a short reason focused on flavor/texture pairing. Refer to each dish " +
        "ONLY by its number from the list – never write out its title.\n\n" +
        'Respond with ONLY JSON in exactly this shape: {"wineNameParsed": "short clean label for the wine", ' +
        '"matches": [{"index": 4, "score": 0-100, "reasoning": "max 1-2 sentences"}, ...]} where "index" is the ' +
        "dish's number from the list, ordered best match first."
      : "Du er en kunnskapsrik sommelier. En gjest beskriver en vin de har (kan være en drue, region, stil, eller " +
        "bare en vag beskrivelse). Du får en NUMMERERT liste med EKTE retter fra en digital kokebok, hver med " +
        "tittel og kort beskrivelse. Tolk først hvilken vin det er snakk om, i en kort, ryddig betegnelse. Velg " +
        "deretter de 3 rettene fra listen som passer best til den vinen, hver med en reelt differensiert " +
        "matchscore fra 0-100 (ikke klump alle score rundt samme tall – en dårlig match skal score klart lavere " +
        "enn en god) og en kort begrunnelse med fokus på smak/tekstur-match. Referer til hver rett KUN med " +
        "nummeret fra listen – ikke skriv ut tittelen.\n\n" +
        'Svar KUN med JSON på nøyaktig denne formen: {"wineNameParsed": "kort, ryddig betegnelse på vinen", ' +
        '"matches": [{"index": 4, "score": 0-100, "reasoning": "maks 1-2 setninger"}, ...]} der "index" er ' +
        "rettens nummer fra listen, sortert med beste match først.";

  const prompt =
    `${lang === "en" ? "Wine described by guest" : "Vin oppgitt av gjest"}: "${wineDescription}"\n\n` +
    `${lang === "en" ? "Candidate dishes" : "Kandidatretter"}:\n` +
    formatCandidateList(candidates);

  const raw = await callClaudeJSON<{
    wineNameParsed?: unknown;
    matches?: unknown;
  }>(system, prompt, 700, MATCH_TEMPERATURE);

  return parseMatchesResponse(raw, candidates, lang, wineDescription);
}

/** Bilde-varianten av matchWineToRecipes over – gjesten fotograferer flasken/
 * etiketten sin i stedet for å skrive. Samme to-i-ett-tanke som
 * checkWineMatchFromImage (lib/actions/ai.ts): AI-en identifiserer vinen OG
 * matcher mot katalogen i samme kall, i stedet for to separate kall. Bildet
 * lastes aldri opp noe sted permanent – sendes direkte til Anthropic sitt
 * API og kastes etterpå (samme prinsipp som den enkeltoppskrift-varianten). */
export async function matchWineToRecipesFromImage(
  image: { mediaType: string; base64Data: string },
  lang: Lang = "no",
): Promise<WineToRecipesResult> {
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

  const candidates = await getCandidates(lang);

  const system =
    lang === "en"
      ? "You are a knowledgeable sommelier. A guest shows you a photo of a wine bottle or label (it may be angled, " +
        "blurry, or partially visible). Read the label as best you can to identify the wine (producer, grape/wine " +
        "type, and vintage if visible) in a short, clean label. If you can't read the name clearly, describe the " +
        "wine style/color you can see instead. If the photo clearly doesn't show a wine bottle or label at all, " +
        'set wineNameParsed to "Not recognized as wine" and return an empty matches array. Otherwise, you are ' +
        "given a NUMBERED list of REAL dishes from a digital cookbook's catalog, each with a title and short " +
        "description – pick the 3 dishes from the list that pair best with the identified wine, each with a " +
        "genuinely discriminating 0-100 match score (do not cluster every score near the same number) and a " +
        "short reason focused on flavor/texture pairing. Refer to each dish ONLY by its number from the list – " +
        "never write out its title.\n\n" +
        'Respond with ONLY JSON in exactly this shape: {"wineNameParsed": "short clean label for the wine", ' +
        '"matches": [{"index": 4, "score": 0-100, "reasoning": "max 1-2 sentences"}, ...]} where "index" is the ' +
        "dish's number from the list, ordered best match first."
      : "Du er en kunnskapsrik sommelier. En gjest viser deg et bilde av en vinflaske eller etikett (den kan være " +
        "vinklet, uskarp eller delvis skjult). Les etiketten så godt du kan for å identifisere vinen (produsent, " +
        "drue-/vintype, og gjerne årgang hvis synlig) i en kort, ryddig betegnelse. Hvis du ikke klarer å lese " +
        "navnet tydelig, beskriv i stedet vinstilen/fargen du kan se. Hvis bildet tydelig ikke viser en vinflaske " +
        'eller etikett i det hele tatt, sett wineNameParsed til "Ikke gjenkjent som vin" og returner en tom ' +
        "matches-liste. Ellers får du en NUMMERERT liste med EKTE retter fra en digital kokebok, hver med tittel " +
        "og kort beskrivelse – velg de 3 rettene fra listen som passer best til vinen du identifiserte, hver med " +
        "en reelt differensiert matchscore fra 0-100 (ikke klump alle score rundt samme tall) og en kort " +
        "begrunnelse med fokus på smak/tekstur-match. Referer til hver rett KUN med nummeret fra listen – ikke " +
        "skriv ut tittelen.\n\n" +
        'Svar KUN med JSON på nøyaktig denne formen: {"wineNameParsed": "kort, ryddig betegnelse på vinen", ' +
        '"matches": [{"index": 4, "score": 0-100, "reasoning": "maks 1-2 setninger"}, ...]} der "index" er ' +
        "rettens nummer fra listen, sortert med beste match først.";

  const prompt = `${lang === "en" ? "Candidate dishes" : "Kandidatretter"}:\n${formatCandidateList(candidates)}`;

  const raw = await callClaudeVisionJSON<{
    wineNameParsed?: unknown;
    matches?: unknown;
  }>(
    system,
    prompt,
    { mediaType: image.mediaType as SupportedImageMediaType, base64Data: image.base64Data },
    700,
    MATCH_TEMPERATURE,
  );

  return parseMatchesResponse(raw, candidates, lang, lang === "en" ? "The photographed wine" : "Vinen på bildet");
}
