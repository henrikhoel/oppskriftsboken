import type { IngredientGroup, ShoppingListEntry, ShoppingListSourceRef } from "@/lib/types";
import { parseAmount } from "@/lib/utils/scale";
import { generateId } from "@/lib/utils/id";

/**
 * Normaliserer et ingrediensnavn for sammenligning ("Parmesan, revet" og
 * "parmesan" skal kunne gjenkjennes som samme vare), uten å være så
 * aggressiv at ulike ingredienser slås sammen ved en feil.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
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
 * Legger ingredienser fra en eller flere oppskrifter til en eksisterende
 * handleliste. To linjer slås KUN sammen dersom navn og enhet er identiske
 * (etter normalisering) og begge mengder er tallbare – ellers legges de til
 * som separate linjer, for å unngå å gjette feil (f.eks. "1 boks" + "400 g"
 * slås aldri sammen).
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
        ? parseAmount(item.amount) != null
          ? (parseAmount(item.amount) as number) * servingsMultiplier
          : null
        : null;

      const normalizedName = normalizeName(item.name);
      const normalizedUnit = normalizeUnit(item.unit);
      // MERK: krevde tidligere at item.unit også var satt (f.eks. "g"/"dl"),
      // noe som gjorde at to enhetsløse linjer med samme navn – f.eks.
      // "3 løk" og "1 løk", der "løk" er navnet og ingen enhet er oppgitt –
      // ALDRI ble slått sammen, og ble stående som to forvirrende separate
      // linjer i handlelisten. Enheten trenger ikke være satt for at to
      // linjer skal kunne summeres, kun at de er LIKE (normalizedUnit-
      // sammenligningen under dekker "begge enhetsløse" som gyldig likhet,
      // på samme måte som "begge i g"). Det som fortsatt aldri slås sammen,
      // er ulike enheter (f.eks. "1 boks" + "400 g").
      const canMerge = scaledAmount != null;

      const match = canMerge
        ? next.find(
            (entry) =>
              normalizeName(entry.name) === normalizedName &&
              normalizeUnit(entry.unit) === normalizedUnit &&
              entry.amount != null,
          )
        : undefined;

      if (match && canMerge) {
        match.amount = (match.amount ?? 0) + (scaledAmount ?? 0);
        if (!match.fromRecipes.includes(recipeTitle)) {
          match.fromRecipes.push(recipeTitle);
        }
        if (source) {
          match.sources = match.sources ?? [];
          if (!hasSameSource(match.sources, source)) match.sources.push(source);
        }
        // Fyller kun inn kjøpstips dersom linjen ikke alt har ett – den
        // FØRSTE oppskriftens tips vinner, i stedet for å overskrives av en
        // senere oppskrift som tilfeldigvis også bruker samme vin uten selv
        // å ha noe notat.
        if (!match.note && item.note && isBuyingTipWorthKeeping(item.name)) {
          match.note = item.note;
        }
        continue;
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
