import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
import { parseAmount } from "@/lib/utils/scale";
import { generateId } from "@/lib/utils/id";
import { normalizeUnit as classifyMetricUnit, metricUnitToBaseFactor, type MetricUnitKind } from "@/lib/utils/units";

/**
 * Normaliserer et ingrediensnavn for sammenligning ("Parmesan, revet" og
 * "parmesan" skal kunne gjenkjennes som samme vare), uten å være så
 * aggressiv at ulike ingredienser slås sammen ved en feil.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9æøå\s]/g, "")
    .trim();
}

function normalizeUnit(unit: string | null): string {
  if (!unit) return "";
  // Fjerner et ev. avsluttende punktum ("stk." -> "stk") – samme mønster som
  // lib/utils/units.ts sin egen normalizeUnit. Uten dette ble "stk" og
  // "stk." (begge finnes i reelle oppskrifter, avhengig av om admin/AI-en
  // skrev forkortelsen med eller uten punktum) behandlet som to ULIKE
  // enheter – både her (DISCRETE_COUNT_UNITS-sjekken i formatShoppingAmount
  // traff aldri "stk." – se tilbakemelding 27.08.2026, "0.5 stk. rødløk" ble
  // ikke rundet opp) og i selve sammenslåingen i mergeIngredientsIntoList
  // (to linjer med "stk"/"stk." for samme vare ble aldri slått sammen).
  return unit.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * SAMMENSLÅINGS-NØKKEL (05.10.2026, Henrik: "den må forstå at gulrot og
 * gulrøtter er det samme") – en LØSERE normalisering brukt KUN for å
 * avgjøre om to handlelistelinjer er "samme vare" ved sammenslåing i
 * mergeIngredientsIntoList under. Helt separat fra normalizeName over, som
 * fortsatt brukes direkte andre steder (isPantryStaple,
 * categorizeShoppingItem) – der skal "gulrot" og "gulrøtter" fortsatt
 * kunne gjenkjennes HVER FOR SEG, det er ikke et sammenslåingsspørsmål der.
 * Påvirker ALDRI selve visningsnavnet (`name` settes kun ved FØRSTE
 * tilføyelse av en linje, se mergeIngredientsIntoList) – kun hvilke linjer
 * som regnes som samme vare og dermed telles sammen.
 *
 * To lag:
 *  1) IRREGULAR_PLURAL_ALIASES – en kort, eksplisitt liste over kjente
 *     UREGELMESSIGE norske flertallsformer for vanlige råvarer (flertall
 *     er IKKE en enkel "+er" på stammen – "gulrot" -> "gulrøtter", ikke
 *     "gulroter"). Utvides etter hvert som nye tilfeller dukker opp i
 *     praksis, samme prinsipp som CATEGORY_KEYWORDS/PANTRY_STAPLE_PATTERNS.
 *  2) stripRegularPluralSuffix – dekker det store flertallet av norske
 *     substantiv, der flertall faktisk ER en enkel "+er"/"+ene"-endelse
 *     ("tomat"/"tomater", "potet"/"poteter", "nøtt"/"nøtter").
 */
const IRREGULAR_PLURAL_ALIASES: Record<string, string> = {
  gulrøtter: "gulrot",
};

function stripRegularPluralSuffix(normalized: string): string {
  if (normalized.endsWith("ene") && normalized.length > 5) return normalized.slice(0, -3);
  if (normalized.endsWith("er") && normalized.length > 4) return normalized.slice(0, -2);
  return normalized;
}

function mergeNameKey(name: string): string {
  const normalized = normalizeName(name);
  return IRREGULAR_PLURAL_ALIASES[normalized] ?? stripRegularPluralSuffix(normalized);
}

/**
 * Basisvarer – ting de aller fleste alt har i skapet (salt, pepper, olje,
 * sukker, mel, vann, eddik) og derfor ikke trenger påminnelse om å kjøpe
 * hver eneste gang. Rent deterministisk (ordliste + eksakt normalisert
 * navnematch, se isPantryStaple under) – ingen AI-vurdering trengs for noe
 * så lite tvetydig som "er salt en basisvare", og en fast liste er raskere,
 * gratis og 100 % forutsigbart likt for alle brukere.
 *
 * Matcher hvert ord/hver frase i listen som et HELT, avgrenset ord et sted i
 * navnet (\b…\b) – IKKE et rått "inneholder"-søk (unngår at "salt" feilaktig
 * treffer midt inni et sammensatt ord som "saltsild"), men heller ikke et
 * krav om at HELE navnet skal være identisk med listeoppføringen. Sistnevnte
 * ble faktisk prøvd først, men reelle oppskrifter skriver ofte
 * ingrediensnavn som "matsalt eller kosher salt" (flere alternativer i
 * samme felt) – da matchet aldri et eksakt-likhet-krav, selv om "matsalt"
 * tydelig er en kjent basisvare der. Både norske og engelske varianter er
 * med, siden handlelisten kan bygges fra en engelsk oversatt variant av en
 * oppskrift (se RecipeInteractive.tsx sin baseGroups/useEnglish).
 *
 * Listen er bevisst kort og forsiktig – heller for få enn for mange treff,
 * siden en feilaktig avkrysset vare er verre (brukeren tror den har noe den
 * ikke har) enn én ekstra linje å stryke manuelt.
 */
const PANTRY_STAPLE_PATTERNS = [
    "salt",
    "havsalt",
    "grovsalt",
    "flaksalt",
    "matsalt",
    "kosher salt",
    "table salt",
    "sea salt",
    "flaky sea salt",
    "pepper",
    "sort pepper",
    "svart pepper",
    "hvit pepper",
    "malt pepper",
    "nykvernet pepper",
    "nykvernet sort pepper",
    "black pepper",
    "ground black pepper",
    "white pepper",
    // Bart "olje" (uten kvalifiserende ord, f.eks. "litt olje") lagt til
    // 28.09.2026 (Henrik, med skjermbilde: "det står også 'litt olje' der,
    // det er basisvare") – de mer spesifikke variantene under (olivenolje,
    // matolje osv.) dekket ikke en helt generisk "olje" uten noe foran.
    // Trygt som et HELT, avgrenset ord (\bolje\b) på norsk: kvalifiserte
    // oljer skrives normalt sammensatt/uten mellomrom på norsk
    // ("sesamolje", "trøffelolje", "chiliolje"), så \bolje\b treffer ALDRI
    // midt inni de ordene – kun en reelt bar "olje" fanges opp.
    //
    // Bevisst IKKE lagt til bart "oil" på engelsk-siden – der skrives
    // kvalifiserte oljer ofte MED mellomrom ("sesame oil", "chili oil",
    // "truffle oil"), så et bart \boil\b-ord ville feilaktig markert de
    // spesialoljene som basisvarer også. De engelske variantene under
    // (olive oil, vegetable oil, cooking oil osv.) er derfor fortsatt kun
    // eksplisitte, kvalifiserte fraser.
    "olje",
    "olivenolje",
    "extra virgin olivenolje",
    "matolje",
    "nøytral olje",
    "solsikkeolje",
    "rapsolje",
    "olive oil",
    "extra virgin olive oil",
    "vegetable oil",
    "cooking oil",
    "neutral oil",
    "sunflower oil",
    "canola oil",
    "sukker",
    "hvitt sukker",
    "strøsukker",
    "sugar",
    "white sugar",
    "granulated sugar",
    "hvetemel",
    "mel",
    "flour",
    "all purpose flour",
    "plain flour",
    "vann",
    "kaldt vann",
    "kokende vann",
    "water",
    "eddik",
    "hvitvinseddik",
    "eplecidereddik",
    "vinegar",
    "white wine vinegar",
    "apple cider vinegar",
  ]
    .map(normalizeName)
    // \b fungerer greit her siden alle oppføringene over kun bruker vanlige
    // ASCII-bokstaver/mellomrom – ingen æøå midt i et ord som ville forstyrret
    // grense-beregningen.
    .map((term) => new RegExp(`\\b${term}\\b`));

/** Sant dersom `name` (etter normalisering) INNEHOLDER en kjent basisvare
 * som et helt, avgrenset ord/uttrykk – se PANTRY_STAPLE_PATTERNS over for
 * begrunnelse/omfang. Eksportert slik at ShoppingListView.tsx kan vise en
 * liten "basisvare"-forklaring ved siden av varen mens den fortsatt er i
 * sin automatisk overstrøkne tilstand. */
export function isPantryStaple(name: string): boolean {
  const normalized = normalizeName(name);
  return PANTRY_STAPLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Ingredienser der et eventuelt notat er en KJØPS-tips ("en fyldig,
 * rimelig rødvin – f.eks. Chianti"), ikke en tilberedningsinstruks
 * ("finhakket", "romtemperert") – notatet er dermed nyttig å ha med på
 * SELVE handlelista (man trenger å vite hvilken type å se etter i butikken),
 * i motsetning til kutte-/tilberedningsnotater som kun hører hjemme i
 * fremgangsmåten. Foreløpig kun vin (drue-/stilnotater er den klareste,
 * mest etterspurte varianten av dette) – rent deterministisk delstreng-
 * match på normalisert navn, samme prinsipp som PANTRY_STAPLE_NAMES over.
 * Litt bredere enn en eksakt liste med vilje (bruker "inneholder", ikke
 * eksakt likhet) siden vin-ingredienser ofte har kvalifiserende ord foran
 * ("tørr hvitvin", "god rødvin til saus") – risikoen ved et sjeldent
 * falskt treff (et notat vises som ikke strengt tatt var en kjøpstips) er
 * lav sammenlignet med å skjule en tips brukeren faktisk trenger.
 */
const WINE_NAME_FRAGMENTS = ["vin", "wine"].map(normalizeName);

function isBuyingTipWorthKeeping(name: string): boolean {
  const normalized = normalizeName(name);
  return WINE_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Sammenligner to ShoppingListSourceRef på recipeId alene (samme oppskrift
 * regnes som samme kilde uansett om porsjonstallet skulle avvike mellom to
 * bidrag – bør normalt ikke skje, men vi dobbelfører aldri samme
 * oppskrift). */
function hasSameSource(sources: ShoppingListSourceRef[], source: ShoppingListSourceRef): boolean {
  return sources.some((s) => s.recipeId === source.recipeId);
}

/**
 * Regner om en mengde+enhet til "grunnenhet" (gram for vekt, milliliter for
 * volum) – kun for de kompatible, metriske enhetene lib/utils/units.ts sin
 * normalizeUnit kjenner igjen (g/kg, ml/l/dl/ss/ts). Returnerer null for alt
 * annet (stk, boks, fedd, håndfull, ukjente/tomme enheter) – slike enheter
 * har ingen entydig felles grunnenhet å regne om til, og skal ALDRI slås
 * sammen på tvers (se KRYSS-ENHET-SAMMENSLÅING lenger ned).
 */
function toBaseAmount(amount: number, unit: string | null): { base: "g" | "ml"; value: number } | null {
  if (!unit) return null;
  const kind: MetricUnitKind | null = classifyMetricUnit(unit);
  if (!kind) return null;
  const { base, factor } = metricUnitToBaseFactor(kind);
  return { base, value: amount * factor };
}

/** Velger en naturlig norsk visningsenhet for en total volummengde (i ml),
 * samme prinsipp som lib/utils/units.ts sin formatVolumeMl (der for
 * US-mål) – men her i vanlige norske kjøkkenenheter (ts/ss/dl/l) siden
 * dette kun brukes til å vise SUMMEN etter kryss-enhet-sammenslåing i
 * handlelista, ikke til US-konvertering. Grensene følger naturlig når
 * neste enhet blir det mer lesbare valget (14,7868 ml = akkurat 1 ss,
 * 100 ml = 1 dl, 1000 ml = 1 l). */
function pickNiceVolumeUnit(totalMl: number): { amount: number; unit: string } {
  // Faktorene hentes fra samme kilde som selve omregningen (toBaseAmount
  // over/metricUnitToBaseFactor i lib/utils/units.ts) i stedet for å
  // duplisere tallene 14,7868/4,92892 en gang til her.
  const mlPerTbsp = metricUnitToBaseFactor("ss").factor;
  const mlPerTsp = metricUnitToBaseFactor("ts").factor;
  if (totalMl < mlPerTbsp) return { amount: totalMl / mlPerTsp, unit: "ts" };
  if (totalMl < 100) return { amount: totalMl / mlPerTbsp, unit: "ss" };
  if (totalMl < 1000) return { amount: totalMl / 100, unit: "dl" };
  return { amount: totalMl / 1000, unit: "l" };
}

/** Samme prinsipp som pickNiceVolumeUnit over, for vekt (g/kg). */
function pickNiceWeightUnit(totalG: number): { amount: number; unit: string } {
  if (totalG < 1000) return { amount: totalG, unit: "g" };
  return { amount: totalG / 1000, unit: "kg" };
}

/**
 * Enkel "X-Y"-intervall-tolkning (bindestrek ELLER kort tankestrek), KUN
 * brukt her i mergeIngredientsIntoList for å avgjøre om en linje kan
 * summeres med andre (05.10.2026, Henrik: "hvorfor er ikke parmesan samlet
 * til ett punkt?" – rot-årsak: "25-30 g parmesan" kunne ikke slås sammen
 * med "80 g parmesan" siden parseAmount i lib/utils/scale.ts – med god
 * grunn, se der – ikke tolker rene tallintervaller). Bruker midtpunktet som
 * et representativt, summérbart tall – fornuftig for en handleliste (man
 * kjøper uansett i hele pakninger), i motsetning til selve
 * oppskriftsvisningen der det faktiske intervallet er nyttig å vise
 * uendret. Faller tilbake til parseAmount for alt annet (desimaltall,
 * brøker osv.) – rører IKKE den delte parseAmount-funksjonen selv, som
 * også brukes til porsjonsskalering/US-konvertering andre steder i appen.
 */
function parseAmountForMerging(raw: string | null | undefined): number | null {
  const direct = parseAmount(raw);
  if (direct != null) return direct;
  if (!raw) return null;
  const rangeMatch = raw
    .trim()
    .replace(",", ".")
    .match(/^(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const [, lowRaw, highRaw] = rangeMatch;
    const low = Number(lowRaw);
    const high = Number(highRaw);
    if (Number.isFinite(low) && Number.isFinite(high)) return (low + high) / 2;
  }
  return null;
}

/**
 * Legger ingredienser fra en eller flere oppskrifter til en eksisterende
 * handleliste.
 *
 * To linjer slås sammen på to måter:
 *  1) SAMME enhet (etter normalisering) – summeres direkte i den enheten,
 *     akkurat som før (ingen omregning, ingen presisjonstap).
 *  2) ULIK, men KOMPATIBEL enhet (28.09.2026, se KRYSS-ENHET-SAMMENSLÅING
 *     under) – f.eks. "1 ss soyasaus" + "1 ts soyasaus": begge er
 *     volum-enheter, regnes om til ml, summeres, og vises tilbake i en
 *     naturlig enhet (ts/ss/dl/l for volum, g/kg for vekt).
 * Genuint ULIKE/ikke-omregnbare enheter (f.eks. "1 boks" + "400 g", eller
 * "3 fedd" + "10 g") slås ALDRI sammen – for usikkert å gjette riktig
 * omregning, se toBaseAmount over.
 *
 * `source` (valgfri) – strukturert sporbarhet (recipeId/slug/porsjoner), se
 * ShoppingListSourceRef i lib/types.ts. Lagt til for "kombinert
 * handleliste" (Fase 5 – Experience, 5.7); eksisterende kallere som ikke
 * sender den (enkelt-oppskrift-siden, se useShoppingList.ts) fortsetter å
 * fungere UENDRET – fromRecipes (tittel-teksten UI-et viser) settes alltid,
 * uavhengig av om `source` er oppgitt.
 *
 * Kjente basisvarer (salt, pepper, olje osv., se PANTRY_STAPLE_NAMES) legges
 * automatisk til allerede avhuket – vises overstrøket i UI-et med en gang,
 * akkurat som om man alt hadde krysset dem av selv. Helt vanlig
 * avkrysningsboks, så det er bare å klikke bort streken igjen dersom man
 * faktisk trenger å kjøpe akkurat den varen denne gangen. Gjelder kun ved
 * FØRSTE tilføyelse av en linje – slår senere tilføyelser sammen med en
 * eksisterende (uavhukede eller avhukede) linje, røres ikke det avhukede
 * valget brukeren allerede har tatt.
 *
 * Ingrediensnotater ("finhakket", "en fyldig rødvin") følger ALDRI med i
 * selve varenavnet (se merknad ved `name` under), men for vin-lignende
 * ingredienser (isBuyingTipWorthKeeping) beholdes notatet i et eget `note`-
 * felt, siden det da typisk er en kjøpstips – ikke en tilberedningsdetalj.
 */
export function mergeIngredientsIntoList(
  existing: ShoppingListEntry[],
  groups: IngredientGroup[],
  recipeTitle: string,
  servingsMultiplier = 1,
  source?: ShoppingListSourceRef,
): ShoppingListEntry[] {
  const next = [...existing];

  for (const group of groups) {
    for (const item of group.items) {
      const scaledAmount = item.amount
        ? parseAmountForMerging(item.amount) != null
          ? (parseAmountForMerging(item.amount) as number) * servingsMultiplier
          : null
        : null;

      const normalizedName = normalizeName(item.name);
      const normalizedUnit = normalizeUnit(item.unit);
      const mergeKey = mergeNameKey(item.name);
      // MERK: krevde tidligere at item.unit også var satt (f.eks. "g"/"dl"),
      // noe som gjorde at to enhetsløse linjer med samme navn – f.eks.
      // "3 løk" og "1 løk", der "løk" er navnet og ingen enhet er oppgitt –
      // ALDRI ble slått sammen, og ble stående som to forvirrende separate
      // linjer i handlelisten. Enheten trenger ikke være satt for at to
      // linjer skal kunne summeres, kun at de er LIKE (normalizedUnit-
      // sammenligningen under dekker "begge enhetsløse" som gyldig likhet,
      // på samme måte som "begge i g"). Det som fortsatt aldri slås sammen,
      // er ulike enheter (f.eks. "1 boks" + "400 g") – MED MINDRE de er
      // kompatible metriske enheter, se KRYSS-ENHET-SAMMENSLÅING under.
      const canMerge = scaledAmount != null;

      const exactMatch = canMerge
        ? next.find(
            (entry) =>
              mergeNameKey(entry.name) === mergeKey &&
              normalizeUnit(entry.unit) === normalizedUnit &&
              entry.amount != null,
          )
        : undefined;

      if (exactMatch) {
        exactMatch.amount = (exactMatch.amount ?? 0) + (scaledAmount ?? 0);
        if (!exactMatch.fromRecipes.includes(recipeTitle)) {
          exactMatch.fromRecipes.push(recipeTitle);
        }
        if (source) {
          exactMatch.sources = exactMatch.sources ?? [];
          if (!hasSameSource(exactMatch.sources, source)) exactMatch.sources.push(source);
        }
        // Fyller kun inn kjøpstips dersom linjen ikke alt har ett – den
        // FØRSTE oppskriftens tips vinner, i stedet for å overskrives av en
        // senere oppskrift som tilfeldigvis også bruker samme vin uten selv
        // å ha noe notat.
        if (!exactMatch.note && item.note && isBuyingTipWorthKeeping(item.name)) {
          exactMatch.note = item.note;
        }
        continue;
      }

      // KRYSS-ENHET-SAMMENSLÅING (28.09.2026) – Henrik, med skjermbilde av
      // en reell handleliste: "se hvor mange ganger det står lime på
      // forskjellige måter her, og soyasaus og sesamfrø og, handlelista
      // blir jo en mil lang med gjentakelser". Rot-årsaken: "1 ss soyasaus"
      // fra én oppskrift og "1 ts soyasaus" fra en annen har ULIK enhet
      // (ss/ts), så det eksakte matchet over (samme enhet) traff aldri –
      // hver oppskrift fikk sin egen linje, selv om det er nøyaktig samme
      // vare. Løsningen: dersom IKKE noe eksakt-enhet-match ble funnet,
      // prøv å finne en eksisterende linje med samme navn hvis enhet er en
      // ANNEN, men KOMPATIBEL metrisk enhet (begge volum: ml/l/dl/ss/ts,
      // eller begge vekt: g/kg, se toBaseAmount over) – regn begge om til
      // samme grunnenhet, summer, og vis tilbake i en naturlig enhet
      // (pickNiceVolumeUnit/pickNiceWeightUnit). Rene tellbare/ukjente
      // enheter (stk, boks, fedd, håndfull) klassifiseres aldri av
      // toBaseAmount, så de faller alltid videre til NY linje under –
      // akkurat som "ulike varenavn" (lime/limebåter/limejuice) fortsatt
      // bevisst IKKE slås sammen, siden det ville krevd å gjette en
      // omregning vi ikke kan vite er riktig.
      if (canMerge) {
        const itemBase = toBaseAmount(scaledAmount as number, item.unit);
        if (itemBase) {
          const compatMatch = next.find((entry) => {
            if (mergeNameKey(entry.name) !== mergeKey || entry.amount == null) return false;
            const entryBase = toBaseAmount(entry.amount, entry.unit);
            return entryBase != null && entryBase.base === itemBase.base;
          });

          if (compatMatch) {
            const compatMatchBase = toBaseAmount(compatMatch.amount as number, compatMatch.unit) as {
              base: "g" | "ml";
              value: number;
            };
            const totalBase = compatMatchBase.value + itemBase.value;
            const nice =
              itemBase.base === "ml" ? pickNiceVolumeUnit(totalBase) : pickNiceWeightUnit(totalBase);
            compatMatch.amount = nice.amount;
            compatMatch.unit = nice.unit;
            if (!compatMatch.fromRecipes.includes(recipeTitle)) {
              compatMatch.fromRecipes.push(recipeTitle);
            }
            if (source) {
              compatMatch.sources = compatMatch.sources ?? [];
              if (!hasSameSource(compatMatch.sources, source)) compatMatch.sources.push(source);
            }
            if (!compatMatch.note && item.note && isBuyingTipWorthKeeping(item.name)) {
              compatMatch.note = item.note;
            }
            continue;
          }
        }
      }

      // RENE, TOMME DUPLIKATER (28.09.2026) – ingredienser uten en
      // tallbar mengde (f.eks. "sesamfrø" helt uten "1 ts" foran, eller
      // "etter smak") kunne tidligere ALDRI slås sammen i det hele tatt,
      // siden canMerge da alltid er false. To linjer som er 100 % IDENTISKE
      // (samme navn, samme enhet, og samme opprinnelige fritekst-mengde –
      // f.eks. to helt like "sesamfrø"-oppføringer uten mengde) er en ren
      // duplikat, ikke to ulike behov, og slås derfor sammen her. MERK:
      // dette slår bevisst IKKE sammen en tom "sesamfrø" (f.eks. "til
      // servering") med en tallfestet "1 ts sesamfrø" (til marinaden) –
      // ulik enhet/mengde betyr et reelt, ULIKT behov (nok til marinaden
      // OG litt ekstra til pynt), og skal fortsatt vises som to linjer.
      if (!canMerge) {
        const blankDuplicate = next.find(
          (entry) =>
            entry.amount == null &&
            mergeNameKey(entry.name) === mergeKey &&
            normalizeUnit(entry.unit) === normalizedUnit &&
            (entry.displayAmount ?? "").trim().toLowerCase() === (item.amount ?? "").trim().toLowerCase(),
        );
        if (blankDuplicate) {
          if (!blankDuplicate.fromRecipes.includes(recipeTitle)) {
            blankDuplicate.fromRecipes.push(recipeTitle);
          }
          if (source) {
            blankDuplicate.sources = blankDuplicate.sources ?? [];
            if (!hasSameSource(blankDuplicate.sources, source)) blankDuplicate.sources.push(source);
          }
          if (!blankDuplicate.note && item.note && isBuyingTipWorthKeeping(item.name)) {
            blankDuplicate.note = item.note;
          }
          continue;
        }

        // UKVANTIFISERT VARE SOM ALLEREDE FINNES MED MENGDE ANDRE STEDER
        // (05.10.2026, Henrik: "hvorfor er ikke parmesan samlet til ett
        // punkt?") – en ingrediens oppgitt UTEN mengde i én oppskrift
        // (f.eks. "Parmesan, til servering") endte tidligere alltid opp som
        // sin egen, forvirrende ekstra linje, selv om en annen oppskrift
        // alt hadde lagt til akkurat samme vare MED en tallfestet mengde
        // ("80 g parmesan"). Finner derfor – kun når ingen blank-duplikat
        // ble funnet over – en HVILKEN SOM HELST eksisterende linje med
        // samme vare (uavhengig av om den har en mengde), og henger kun
        // kilden/oppskrift-tittelen på den i stedet for å opprette en ny
        // linje. Selve mengden/enheten på den eksisterende linjen RØRES
        // ALDRI (vi gjetter aldri en mengde vi ikke har) – brukeren mister
        // dermed ingen informasjon, kun en overflødig ekstra "bar" linje
        // for samme vare.
        const anyNameMatch = next.find((entry) => mergeNameKey(entry.name) === mergeKey);
        if (anyNameMatch) {
          if (!anyNameMatch.fromRecipes.includes(recipeTitle)) {
            anyNameMatch.fromRecipes.push(recipeTitle);
          }
          if (source) {
            anyNameMatch.sources = anyNameMatch.sources ?? [];
            if (!hasSameSource(anyNameMatch.sources, source)) anyNameMatch.sources.push(source);
          }
          if (!anyNameMatch.note && item.note && isBuyingTipWorthKeeping(item.name)) {
            anyNameMatch.note = item.note;
          }
          continue;
        }
      }

      next.push({
        id: generateId(), // se lib/utils/id.ts – crypto.randomUUID() alene kan mangle i nettleseren
        amount: canMerge ? scaledAmount : null,
        displayAmount: canMerge ? null : item.amount,
        unit: item.unit,
        // MERK: brukte tidligere å henge på item.note her (f.eks.
        // "løk (finhakket)") – ikke bare unødvendig detalj i en handleliste
        // (man trenger ikke vite HVORDAN man skjærer noe før man er på
        // kjøkkenet), men det ødela også sammenslåingen over: "løk
        // (finhakket)" og "løk (finrevet)" normaliserer til to ULIKE navn,
        // så "1 løk" to steder i samme oppskrift ble aldri gjenkjent som
        // samme vare. Notatet henges derfor ALDRI på selve navnet lenger –
        // se `note`-feltet under for de få tilfellene notatet faktisk skal
        // med (kjøpstips, ikke tilberedning).
        name: item.name,
        // Basisvarer (salt, pepper, olje osv., se PANTRY_STAPLE_NAMES over)
        // legges automatisk til som avhuket/overstrøket – de aller fleste
        // har dette fra før, og slipper da å måtte fjerne den samme varen
        // manuelt hver gang. Helt vanlig avkrysningsboks, så det er bare å
        // klikke den bort igjen dersom man faktisk trenger å kjøpe akkurat
        // denne gangen (f.eks. gått tom for salt).
        checked: isPantryStaple(item.name),
        fromRecipes: [recipeTitle],
        sources: source ? [source] : undefined,
        // Se isBuyingTipWorthKeeping over – kun vin-lignende ingredienser
        // tar med notatet sitt til handlelista (f.eks. "en fyldig rødvin,
        // Chianti eller lignende"), alt annet notat (kuttemåte,
        // romtemperert osv.) forblir kun i fremgangsmåten.
        note: item.note && isBuyingTipWorthKeeping(item.name) ? item.note : undefined,
      });
    }
  }

  return next;
}

/**
 * Enheter som beskriver en DEL av en hel vare, ikke noe man kjøper i akkurat
 * det antallet – man kjøper ikke "4 blader" i butikken, man kjøper ett
 * hjertesalat; man kjøper ikke "2 fedd", man kjøper en hel hvitløk. Når en
 * handlelistelinje har en av disse enhetene, gir det ingen mening å vise det
 * bokstavelige oppskrift-tallet – linjen kollapses i stedet til "1 <navn>",
 * uten enhet, siden ett eksemplar av varen normalt dekker det oppskriften(e)
 * trenger. Se tilbakemelding 27.08.2026 ("4 blader hjertesalat, da holder
 * det med 1 hjertesalat").
 *
 * Bevisst kort/konservativ liste – kun de klareste "del av en helhet"-
 * enhetene (blader, fedd, kvist, båt). Mer tvetydige enheter som "skiver"
 * (brød/bacon selges ofte i pakker med et bestemt skivetall, ikke som "1
 * stykke") er bevisst utelatt – en feilaktig kollaps er verre enn å la et
 * fåtall tilfeller vise det rå tallet.
 */
const WHOLE_ITEM_PART_UNITS = new Set(
  ["blad", "blader", "leaf", "leaves", "fedd", "clove", "cloves", "kvist", "kvister", "sprig", "sprigs", "båt", "båter", "wedge", "wedges"].map(
    (u) => u.toLowerCase(),
  ),
);

/**
 * Enheter som selv BETYR "tellbare, hele eksemplarer" – "stk" er den vanlige
 * norske forkortelsen for "stykk(er)" og brukes akkurat som ingen enhet i det
 * hele tatt (se f.eks. "0,5 stk. rødløk" – helt likeverdig med "0,5 løk" uten
 * enhet, bare skrevet med et eksplisitt "stk" av admin/AI-en som opprettet
 * oppskriften). Må derfor behandles helt likt som enhetsløse mengder under –
 * uten dette rundes f.eks. "0,5 stk. rødløk" IKKE opp, siden `!entry.unit`
 * alene ikke fanger opp at "stk" faktisk ER et enhetsløst antall. Se
 * tilbakemelding 27.08.2026 (screenshot: "0.5 stk. rødløk" og "0.5 stk.
 * sitron" viste seg fortsatt, siden begge har unit="stk", ikke unit=null).
 */
const DISCRETE_COUNT_UNITS = new Set(["stk", "stykk", "stykker", "pcs", "piece", "pieces"]);

export function formatShoppingAmount(entry: ShoppingListEntry): string {
  if (entry.amount != null) {
    const normalizedUnit = normalizeUnit(entry.unit);

    if (normalizedUnit && WHOLE_ITEM_PART_UNITS.has(normalizedUnit)) {
      return "1";
    }

    // Enhetsløse mengder ("3 løk", "0,5 løk") og eksplisitte "stk"-mengder
    // ("0,5 stk. rødløk") representerer begge et antall HELE, tellbare
    // eksemplarer – man kan ikke kjøpe en halv løk i butikken, så et
    // ikke-heltall rundes alltid opp til nærmeste hele tall, minimum 1. Se
    // tilbakemelding 27.08.2026 ("0,5 løk" ble vist bokstavelig, "det er
    // unaturlig, da må det legges minimum 1 løk"). Gjelder kun disse to
    // tilfellene – ekte målenheter ("0,5 dl", "0,5 kg") er upåvirket.
    if ((!entry.unit || DISCRETE_COUNT_UNITS.has(normalizedUnit)) && entry.amount % 1 !== 0) {
      return String(Math.max(1, Math.ceil(entry.amount)));
    }

    const rounded =
      entry.amount % 1 === 0 ? entry.amount : Math.round(entry.amount * 100) / 100;
    return [rounded, entry.unit].filter(Boolean).join(" ");
  }
  if (entry.displayAmount) {
    return [entry.displayAmount, entry.unit].filter(Boolean).join(" ");
  }
  return entry.unit ?? "";
}

/**
 * BUTIKKATEGORIER (05.10.2026, redesign av Handleliste-siden – "Grupper
 * handlelisten etter butikkategori i stedet for én lang liste") – samme
 * prinsipp som PANTRY_STAPLE_PATTERNS over: en fast, deterministisk
 * ordliste per kategori (ingen AI – rask, gratis, 100 % forutsigbart likt
 * for alle), matchet som HELE, avgrensede ord/fraser (\b…\b) på et
 * normalisert navn. Bevisst en EKSTRA, uavhengig klassifisering (ikke
 * samme liste som PANTRY_STAPLE_PATTERNS) – "basisvare" (har du antakelig
 * fra før) og "butikkategori" (hvor i butikken den står) er to helt ulike
 * spørsmål; et avhuket basisvare-eple ville likevel trengt en kategori
 * dersom det en dag dukket opp uavhuket.
 *
 * Rekkefølgen under (SHOPPING_CATEGORY_ORDER) følger en vanlig norsk
 * dagligvarebutikks naturlige gangretning – frukt/grønt og ferskvarer først
 * (slik de fleste butikker er lagt opp), tørrvarer/krydder i midten, drikke
 * og "annet" sist. Katalogen er bevisst ikke uttømmende – nye/sjeldne
 * ingrediensnavn som ikke matcher noe havner i "annet" (catch-all) i stedet
 * for å krasje eller gjette feil; listene kan utvides etter hvert som nye
 * "annet"-tilfeller dukker opp i praksis.
 *
 * Sjekkes i en FAST rekkefølge (CATEGORY_CHECK_ORDER) – ikke samme som
 * visningsrekkefølgen – fra mest spesifikke/trange ordforråd (meieri, kjøtt/
 * fisk) til bredest/mest generelle (tørrvarer er en svært bred kategori og
 * sjekkes derfor nest sist, rett før catch-all "annet"), slik at f.eks.
 * "kyllingbuljong" (inneholder både "kylling" og "buljong") havner i
 * tørrvarer (buljongterninger er hylle-/tørrvare) og ikke i kjøtt/fisk.
 */
export type ShoppingCategoryKey =
  | "produce"
  | "meatFish"
  | "dairy"
  | "frozen"
  | "bakery"
  | "pantry"
  | "spicesSauces"
  | "drinks"
  | "other";

/** Visningsrekkefølge – følger butikkens gangretning, se filheaderen over. */
export const SHOPPING_CATEGORY_ORDER: ShoppingCategoryKey[] = [
  "produce",
  "meatFish",
  "dairy",
  "frozen",
  "bakery",
  "pantry",
  "spicesSauces",
  "drinks",
  "other",
];

type MatchableCategory = Exclude<ShoppingCategoryKey, "other">;

const CATEGORY_KEYWORDS: Record<MatchableCategory, string[]> = {
  dairy: [
    "melk",
    "helmelk",
    "lettmelk",
    "skummet melk",
    "fløte",
    "kremfløte",
    "matfløte",
    "rømme",
    "yoghurt",
    "gresk yoghurt",
    "naturell yoghurt",
    "smør",
    "ost",
    "parmesan",
    "parmesanost",
    "mozzarella",
    "burrata",
    "fetaost",
    "feta",
    "cheddar",
    "brie",
    "gauda",
    "norvegia",
    "jarlsberg",
    "kremost",
    "cottage cheese",
    "kesam",
    "egg",
    "eggehvite",
    "eggeplomme",
    "creme fraiche",
    "crème fraîche",
    "kefir",
    "skyr",
    "gulost",
    "blåmuggost",
    "geitost",
    "ricotta",
    "milk",
    "cream",
    "heavy cream",
    "sour cream",
    "yogurt",
    "yoghurt",
    "butter",
    "cheese",
    "cream cheese",
    "cottage cheese",
    "eggs",
    "egg white",
    "egg yolk",
  ],
  meatFish: [
    "kylling",
    "kyllingfilet",
    "kyllinglår",
    "kyllingbryst",
    "biff",
    "storfekjøtt",
    "svinekjøtt",
    "svinefilet",
    "lammekjøtt",
    "lammekoteletter",
    "bacon",
    "pølse",
    "pølser",
    "wienerpølse",
    "karbonade",
    "karbonadedeig",
    "kjøttdeig",
    "laks",
    "røkelaks",
    "gravlaks",
    "torsk",
    "ørret",
    "reker",
    "blåskjell",
    "makrell",
    "breiflabb",
    "lysing",
    "fisk",
    "fiskefilet",
    "skalldyr",
    "krabbe",
    "hummer",
    "skinke",
    "parmaskinke",
    "entrecôte",
    "mørbrad",
    "indrefilet",
    "ytrefilet",
    "kalkun",
    "andebryst",
    "lever",
    "nduja",
    "salami",
    "chorizo",
    "pepperoni",
    "kjøttboller",
    "chicken",
    "chicken breast",
    "chicken thigh",
    "beef",
    "pork",
    "lamb",
    "bacon",
    "sausage",
    "sausages",
    "ground beef",
    "ground pork",
    "mince",
    "minced meat",
    "salmon",
    "smoked salmon",
    "cod",
    "trout",
    "shrimp",
    "prawns",
    "mussels",
    "mackerel",
    "fish fillet",
    "seafood",
    "crab",
    "lobster",
    "ham",
    "prosciutto",
    "turkey",
    "duck",
    "liver",
    "meatballs",
  ],
  produce: [
    "løk",
    "rødløk",
    "sjalottløk",
    "hvitløk",
    // (05.10.2026, Henrik: "hvitløk blir lagt i frukt og grønt, men
    // hvitløksfedd ligger i annet") – "hvitløksfedd" er et norsk
    // SAMMENSATT ord (hvitløk + s + fedd, uten mellomrom), så \bhvitløk\b
    // traff aldri midt inni det (ingen ordgrense mellom "hvitløk" og
    // "sfedd"). Lagt til som egen, eksplisitt oppføring i stedet for en
    // generell prefiks-match-regel for alle nøkkelord – en slik generell
    // regel ville gitt ekte risiko for FEILAKTIGE kategorier andre steder
    // (f.eks. "kylling" som prefiks midt i en annen sammensatt tørrvare),
    // og katalogens egen filosofi (se filheaderen) er at et ukjent navn
    // heller skal havne trygt i "annet" enn gjette feil. Legg til flere
    // sammensatte former her etter hvert som de dukker opp i praksis.
    "hvitløksfedd",
    "vårløk",
    "purre",
    "gulrot",
    "gulrøtter",
    "potet",
    "poteter",
    "nypotet",
    "søtpotet",
    "tomat",
    "tomater",
    "cherrytomat",
    "agurk",
    "paprika",
    "salat",
    "hjertesalat",
    "romanosalat",
    "ruccola",
    "spinat",
    "brokkoli",
    "blomkål",
    "kål",
    "rødkål",
    "hvitkål",
    "grønnkål",
    "savoykål",
    "rosenkål",
    "selleri",
    "fennikel",
    "squash",
    "courgette",
    "aubergine",
    "champignon",
    "sopp",
    "kantarell",
    "steinsopp",
    "sitron",
    "lime",
    "appelsin",
    "mandarin",
    "grapefrukt",
    "eple",
    "pære",
    "banan",
    "avokado",
    "chili",
    "ingefær",
    "persille",
    "bladpersille",
    "basilikum",
    "koriander",
    "dill",
    "timian",
    "rosmarin",
    "mynte",
    "salvie",
    "estragon",
    "gressløk",
    "reddik",
    "asparges",
    "grønne erter",
    "mais",
    "grønne bønner",
    "brekkbønner",
    "jordbær",
    "bringebær",
    "blåbær",
    "rips",
    "solbær",
    "bjørnebær",
    "drue",
    "druer",
    "fersken",
    "aprikos",
    "plomme",
    "mango",
    "ananas",
    "granateple",
    "rabarbra",
    "ramsløk",
    "rødbet",
    "kålrot",
    "onion",
    "red onion",
    "shallot",
    "garlic",
    "spring onion",
    "scallion",
    "leek",
    "carrot",
    "carrots",
    "potato",
    "potatoes",
    "new potatoes",
    "sweet potato",
    "tomato",
    "tomatoes",
    "cherry tomatoes",
    "cucumber",
    "bell pepper",
    "lettuce",
    "arugula",
    "rocket",
    "spinach",
    "broccoli",
    "cauliflower",
    "cabbage",
    "red cabbage",
    "kale",
    "brussels sprouts",
    "celery",
    "fennel",
    "zucchini",
    "eggplant",
    "aubergine",
    "mushroom",
    "mushrooms",
    "chanterelle",
    "lemon",
    "orange",
    "mandarin",
    "grapefruit",
    "apple",
    "pear",
    "banana",
    "avocado",
    "chilli",
    "ginger",
    "parsley",
    "basil",
    "cilantro",
    "coriander",
    "thyme",
    "rosemary",
    "mint",
    "sage",
    "tarragon",
    "chives",
    "radish",
    "asparagus",
    "peas",
    "corn",
    "green beans",
    "strawberry",
    "raspberry",
    "blueberry",
    "grape",
    "grapes",
    "peach",
    "apricot",
    "plum",
    "pineapple",
    "pomegranate",
    "rhubarb",
    "beetroot",
    "swede",
  ],
  bakery: [
    "brød",
    "loff",
    "rundstykker",
    "rundstykke",
    "baguette",
    "lefse",
    "pita",
    "focaccia",
    "ciabatta",
    "knekkebrød",
    "gjær",
    "bakepulver",
    "natron",
    "boller",
    "grovbrød",
    "bread",
    "baguette",
    "tortilla",
    "focaccia",
    "ciabatta",
    "crispbread",
    "yeast",
    "baking powder",
    "baking soda",
    "buns",
    "rolls",
  ],
  frozen: ["frossen", "fryst", "iskrem", "frosne bær", "frosne erter", "frozen", "ice cream", "frozen peas", "frozen berries"],
  drinks: [
    "rødvin",
    "hvitvin",
    "musserende vin",
    "champagne",
    "prosecco",
    "øl",
    "brus",
    "cola",
    "juice",
    "eplejuice",
    "appelsinjuice",
    "kaffe",
    "te",
    "mineralvann",
    "red wine",
    "white wine",
    "sparkling wine",
    "champagne",
    "prosecco",
    "beer",
    "soda",
    "cola",
    "juice",
    "coffee",
    "sparkling water",
  ],
  spicesSauces: [
    "krydder",
    "spisskummen",
    "karve",
    "karripulver",
    "karri",
    "paprikapulver",
    "chiliflak",
    "chilipulver",
    "cayennepepper",
    "muskat",
    "kanel",
    "kardemomme",
    "nellik",
    "vaniljesukker",
    "vaniljestang",
    "soyasaus",
    "fiskesaus",
    "østerssaus",
    "sesamolje",
    "sennep",
    "dijonsennep",
    "ketchup",
    "majones",
    "pesto",
    "tabasco",
    "worcestersaus",
    "harissa",
    "sambal oelek",
    "sriracha",
    "tahini",
    "honning",
    "lønnesirup",
    "sirup",
    "kapers",
    "oliven",
    "sylteagurk",
    "tomatpuré",
    "spice",
    "spices",
    "cumin",
    "caraway",
    "curry powder",
    "chili flakes",
    "cayenne pepper",
    "nutmeg",
    "cinnamon",
    "cardamom",
    "cloves",
    "vanilla sugar",
    "vanilla pod",
    "soy sauce",
    "fish sauce",
    "oyster sauce",
    "sesame oil",
    "mustard",
    "dijon mustard",
    "ketchup",
    "mayo",
    "mayonnaise",
    "pesto",
    "worcestershire",
    "harissa",
    "sriracha",
    "tahini",
    "honey",
    "maple syrup",
    "syrup",
    "capers",
    "olives",
    "pickles",
    "tomato paste",
    "tomato puree",
  ],
  pantry: [
    "ris",
    "basmatiris",
    "jasminris",
    "pasta",
    "spaghetti",
    "rigatoni",
    "penne",
    "fusilli",
    "tagliatelle",
    "lasagneplater",
    "couscous",
    "bulgur",
    "linser",
    "røde linser",
    "kikerter",
    "hermetiske tomater",
    "hermetisk tomat",
    "hermetikk",
    "hermetiske bønner",
    "hvite bønner",
    "svarte bønner",
    "kidneybønner",
    "havregryn",
    "quinoa",
    "nøtter",
    "mandler",
    "valnøtter",
    "peanøtter",
    "cashewnøtter",
    "pinjekjerner",
    "hasselnøtter",
    "tørket frukt",
    "rosiner",
    "buljong",
    "buljongterning",
    "kraft",
    "kyllingkraft",
    "grønnsakskraft",
    "polenta",
    "panko",
    "brødsmuler",
    "sprøstekt løk",
    "rice",
    "pasta",
    "spaghetti",
    "rigatoni",
    "penne",
    "fusilli",
    "couscous",
    "bulgur",
    "lentils",
    "chickpeas",
    "canned tomatoes",
    "canned beans",
    "white beans",
    "black beans",
    "kidney beans",
    "oats",
    "quinoa",
    "nuts",
    "almonds",
    "walnuts",
    "peanuts",
    "cashews",
    "pine nuts",
    "hazelnuts",
    "dried fruit",
    "raisins",
    "stock",
    "stock cube",
    "broth",
    "chicken stock",
    "vegetable stock",
    "polenta",
    "panko",
    "breadcrumbs",
  ],
};

/** Rekkefølgen de ulike kategoriene SJEKKES i – smalest/mest spesifikt
 * ordforråd først, se filheaderen over. */
const CATEGORY_CHECK_ORDER: MatchableCategory[] = [
  "dairy",
  "meatFish",
  "produce",
  "bakery",
  "frozen",
  "drinks",
  "spicesSauces",
  "pantry",
];

type CategoryMatcher = { pattern: RegExp; termLength: number; category: MatchableCategory };

/** Flat liste av alle (kategori, nokkelord)-par, i CATEGORY_CHECK_ORDER. Brukt
 * av categorizeShoppingItem under til a finne det mest SPESIFIKKE treffet pa
 * tvers av ALLE kategorier - ikke bare forste kategori i sjekkerekkefolgen,
 * se neste kommentar. */
const CATEGORY_MATCHERS: CategoryMatcher[] = CATEGORY_CHECK_ORDER.flatMap((category) =>
  CATEGORY_KEYWORDS[category].map(normalizeName).map((term) => ({
    pattern: new RegExp(`\\b${term}\\b`),
    termLength: term.length,
    category,
  })),
);

/** Klassifiserer et handlelistenavn til en butikkategori (se filheaderen
 * over) – "other" (ANNET) er alltid et trygt fallback for navn som ikke
 * matcher noe kjent.
 *
 * Matcher mot ALLE kategorier og velger den mest SPESIFIKKE (lengste)
 * nokkelordfrasen som treffer, fremfor bare forste kategori i
 * CATEGORY_CHECK_ORDER. Dette trengs fordi flere kategorier kan treffe
 * samtidig pa ulikt presisjonsniva - f.eks. inneholder "400 g hermetiske
 * tomater" bade pantry sin flerords-frase "hermetiske tomater" (19 tegn) OG
 * produce sitt enkeltstaende, generiske ord "tomater" (7 tegn). Uten denne
 * lengde-regelen ville produce (som sjekkes for pantry i CATEGORY_CHECK_ORDER)
 * vunnet feilaktig over den mer presise hermetikk-frasen. Ved likt antall
 * tegn brukes CATEGORY_CHECK_ORDER som tiebreak (forste i rekkefolgen
 * vinner). */
export function categorizeShoppingItem(name: string): ShoppingCategoryKey {
  const normalized = normalizeName(name);
  let best: CategoryMatcher | null = null;
  for (const matcher of CATEGORY_MATCHERS) {
    if (!matcher.pattern.test(normalized)) continue;
    if (!best || matcher.termLength > best.termLength) {
      best = matcher;
    }
  }
  return best?.category ?? "other";
}
