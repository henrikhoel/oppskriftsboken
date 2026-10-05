/**
 * Selvstendig assertion-script for KJØPSNORMALISERINGEN i
 * lib/utils/shopping-list.ts (05.10.2026, Henrik sin spesifikasjon –
 * "oppskriften viser hvor mye du skal bruke, handlelisten viser hva du skal
 * kjøpe"). Prosjektet har ingen testrammeverk (ingen Jest/Vitest, se
 * package.json) – dette er derfor et vanlig TypeScript-script i samme stil
 * som de andre filene i scripts/ (seed.ts osv.), ikke en "ekte"
 * test-fil-konvensjon (*.test.ts).
 *
 * Kjøres med:
 *   npx tsx scripts/test-purchase-normalization.ts
 *
 * Avslutter med exit-kode 1 dersom noe FEILER, 0 dersom alt stemmer – kan
 * derfor også brukes i en evt. fremtidig CI-sjekk uten endringer.
 *
 * Dekker minimum-testtilfellene fra §12 i spesifikasjonen, pluss noen
 * tilleggstilfeller funnet ved gjennomgang av eksisterende ingrediensdata i
 * prosjektet (sitrus, ferske urter, hvitløk, basisvarer som skal forbli
 * uendret).
 */
import {
  formatShoppingAmount,
  getPurchaseNote,
  mergeIngredientsIntoList,
} from "../lib/utils/shopping-list";
import type { IngredientGroup, ShoppingListEntry } from "../lib/types";

let passed = 0;
let failed = 0;

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
    console.log(`OK   ${label}`);
  } else {
    failed++;
    console.log(`FEIL ${label}`);
    console.log(`     fikk:      ${actualStr}`);
    console.log(`     forventet: ${expectedStr}`);
  }
}

/** Bygger en minimal IngredientGroup[] med én ingrediens – nok til å kalle
 * mergeIngredientsIntoList uten å måtte sette opp en hel oppskrift. */
function single(name: string, amount: string | null, unit: string | null): IngredientGroup[] {
  return [
    {
      id: "g1",
      title: null,
      sortOrder: 0,
      items: [{ id: "i1", amount, unit, name, note: null, sortOrder: 0 }],
    },
  ];
}

function findEntry(entries: ShoppingListEntry[], name: string): ShoppingListEntry | undefined {
  return entries.find((e) => e.name.toLowerCase() === name.toLowerCase());
}

// ---------------------------------------------------------------------------
// §3 SITRUS
// ---------------------------------------------------------------------------

{
  // 1,5 ss limesaft -> 1 lime
  const list = mergeIngredientsIntoList([], single("limesaft", "1,5", "ss"), "Oppskrift A");
  const lime = findEntry(list, "lime");
  assertEqual("1,5 ss limesaft -> 1 lime", lime && formatShoppingAmount(lime), "1");
}

{
  // Flere limesaft-mengder fra ulike oppskrifter (Ukesmeny: sekvensielle
  // addFromRecipe-kall) SUMMERES før kjøpsmengden regnes ut: 1,5 + 2 + 1 = 4,5
  // ss -> 3 lime. IKKE 1+1+1=3 via tre separate avrundinger (som her
  // tilfeldigvis gir samme tall, men av feil grunn – se neste test for et
  // tilfelle der det FAKTISK ville gitt feil svar: 1 ss + 1 ss + 1 ss ville
  // gitt "3 lime" ved individuell avrunding, men riktig svar er "1 lime"
  // siden 3 ss samlet er godt under én hel limes saftmengde).
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("limesaft", "1,5", "ss"), "Mandag");
  list = mergeIngredientsIntoList(list, single("limesaft", "2", "ss"), "Onsdag");
  list = mergeIngredientsIntoList(list, single("limesaft", "1", "ss"), "Fredag");
  const lime = findEntry(list, "lime");
  assertEqual("1,5+2+1 ss limesaft (ukesmeny) -> 3 lime", lime && formatShoppingAmount(lime), "3");
}

{
  // Beviser at summering FØR avrunding faktisk er riktig (i motsetning til å
  // avrunde hver for seg): tre separate "1 ss limesaft" ville blitt "1 lime"
  // hver (3 totalt) dersom man (feilaktig) avrundet FØR summering – riktig
  // svar er at 3 ss samlet (~44 ml) fortsatt er under én limes saftmengde
  // (30 ml) + litt, altså fortsatt kun 2 lime, ALDRI 3.
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("limesaft", "1", "ss"), "A");
  list = mergeIngredientsIntoList(list, single("limesaft", "1", "ss"), "B");
  list = mergeIngredientsIntoList(list, single("limesaft", "1", "ss"), "C");
  const lime = findEntry(list, "lime");
  const amount = lime ? Number(formatShoppingAmount(lime)) : null;
  assertEqual("3x 1 ss limesaft summeres FØR avrunding (ikke 3 separate lime)", amount !== null && amount < 3, true);
}

{
  // Hel lime + limesaft aggregeres til ÉN linje, ikke to
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("lime", "1", null), "Oppskrift A");
  list = mergeIngredientsIntoList(list, single("limesaft", "3", "ss"), "Oppskrift B");
  const limeLines = list.filter((e) => e.name.toLowerCase() === "lime");
  assertEqual("1 lime + 3 ss limesaft -> én samlet linje", limeLines.length, 1);
}

{
  // sitronsaft -> sitron
  const list = mergeIngredientsIntoList([], single("sitronsaft", "2", "ss"), "Oppskrift A");
  const sitron = findEntry(list, "sitron");
  assertEqual("sitronsaft -> sitron (kanonisk navn)", sitron?.name, "sitron");
}

{
  // sitronsaft + sitronskall: skallet skal ALDRI la det se ut som om samme
  // frukt dekker begge – total mengde skal være MINST like stor som om
  // skallet alene krevde én hel sitron.
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("sitronsaft", "1", "ss"), "Saus");
  list = mergeIngredientsIntoList(list, single("revet sitronskall", null, null), "Kake");
  const sitron = findEntry(list, "sitron");
  const antall = sitron ? Number(formatShoppingAmount(sitron)) : 0;
  assertEqual("sitronsaft + sitronskall gir minst 1 sitron (ikke for lite)", antall >= 1, true);
}

// ---------------------------------------------------------------------------
// §4 BRØKDELER AV HELE GRØNNSAKER/FRUKT (allerede dekket av eksisterende
// enhetsløs-/stk-avrunding i formatShoppingAmount – verifiseres her for å
// bekrefte at den generelle regelen faktisk dekker alle casene i §4, uten
// at det var nødvendig å skrive en egen, ingrediens-spesifikk liste).
// ---------------------------------------------------------------------------

for (const name of ["rødløk", "agurk", "paprika", "avokado", "fennikel"]) {
  const list = mergeIngredientsIntoList([], single(name, "0,5", null), "Oppskrift A");
  const entry = findEntry(list, name);
  assertEqual(`½ ${name} -> 1 ${name}`, entry && formatShoppingAmount(entry), "1");
}

{
  const list = mergeIngredientsIntoList([], single("rødløk", "1,5", null), "Oppskrift A");
  const entry = findEntry(list, "rødløk");
  assertEqual("1½ rødløk -> 2 rødløk", entry && formatShoppingAmount(entry), "2");
}

// ---------------------------------------------------------------------------
// §5 FERSKE URTER
// ---------------------------------------------------------------------------

{
  const list = mergeIngredientsIntoList([], single("hakket persille", "2", "ss"), "Oppskrift A");
  const persille = findEntry(list, "persille");
  assertEqual("2 ss hakket persille -> 1 bunt persille", persille && formatShoppingAmount(persille), "1 bunt");
}

{
  // Tørket/pulverisert urt skal ALDRI bli "bunt"/"potte" – canonicalizeFreshHerb
  // hopper over den (ser DRIED_HERB_MARKERS i navnet), så ingrediensen
  // beholder sitt ORIGINALE navn ("tørket persille") helt uendret, i stedet
  // for å bli skrevet om til den kanoniske "persille".
  const list = mergeIngredientsIntoList([], single("tørket persille", "1", "ts"), "Oppskrift A");
  const torketPersille = findEntry(list, "tørket persille");
  assertEqual("tørket persille beholder eget navn (kjøps-normaliseres ikke)", torketPersille?.name, "tørket persille");
  assertEqual(
    "tørket persille vises IKKE som bunt",
    torketPersille != null && formatShoppingAmount(torketPersille).includes("bunt"),
    false,
  );
}

{
  // Aggregering over flere oppskrifter (Ukesmeny), samme prinsipp som sitrus
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("basilikum", "1", "dl"), "Mandag");
  list = mergeIngredientsIntoList(list, single("basilikum", "1", "dl"), "Onsdag");
  const basilikum = findEntry(list, "basilikum");
  // 2 dl à 20 g/dl = 40 g, / 15 g per potte = 3 potter
  assertEqual("2x 1 dl basilikum (ukesmeny) -> flere potter", basilikum && formatShoppingAmount(basilikum), "3 potter");
}

// ---------------------------------------------------------------------------
// §6 HVITLØK
// ---------------------------------------------------------------------------

{
  // Få fedd – uendret "1 hvitløk"-oppførsel, ingen notat
  const list = mergeIngredientsIntoList([], single("hvitløk", "2", "fedd"), "Oppskrift A");
  const hvitlok = findEntry(list, "hvitløk");
  assertEqual("2 fedd hvitløk -> 1 hvitløk", hvitlok && formatShoppingAmount(hvitlok), "1");
  assertEqual("2 fedd hvitløk -> ingen (ca. N fedd)-notat", hvitlok && getPurchaseNote(hvitlok), null);
}

{
  // Mange fedd aggregert over flere oppskrifter -> flere hele hvitløk + notat
  let list: ShoppingListEntry[] = [];
  list = mergeIngredientsIntoList(list, single("hvitløk", "2", "fedd"), "Mandag");
  list = mergeIngredientsIntoList(list, single("hvitløk", "3", "fedd"), "Onsdag");
  list = mergeIngredientsIntoList(list, single("hvitløksfedd", "2", null), "Fredag");
  const hvitlok = findEntry(list, "hvitløk") ?? findEntry(list, "hvitløksfedd");
  assertEqual("2+3+2 fedd (ukesmeny, inkl. hvitløksfedd-navneform) -> 1 hvitløk", hvitlok && formatShoppingAmount(hvitlok), "1");
  assertEqual("2+3+2 fedd -> notat (ca. 7 fedd)", hvitlok && getPurchaseNote(hvitlok), "ca. 7 fedd");
}

// ---------------------------------------------------------------------------
// §10 SIKKERHETSPRINSIPP – ukjente/ikke-opt-in-ingredienser forblir uendret
// ---------------------------------------------------------------------------

{
  const list = mergeIngredientsIntoList([], single("rigatoni", "250", "g"), "Oppskrift A");
  const entry = findEntry(list, "rigatoni");
  assertEqual("250 g rigatoni forblir 250 g rigatoni", entry && formatShoppingAmount(entry), "250 g");
}

{
  const list = mergeIngredientsIntoList([], single("hermetiske tomater", "400", "g"), "Oppskrift A");
  const entry = findEntry(list, "hermetiske tomater");
  assertEqual("400 g hermetiske tomater forblir 400 g", entry && formatShoppingAmount(entry), "400 g");
}

{
  const list = mergeIngredientsIntoList([], single("kremfløte", "2", "dl"), "Oppskrift A");
  const entry = findEntry(list, "kremfløte");
  assertEqual("2 dl kremfløte forblir 2 dl", entry && formatShoppingAmount(entry), "2 dl");
}

{
  const list = mergeIngredientsIntoList([], single("en helt ukjent vare", "3", "boks"), "Oppskrift A");
  const entry = findEntry(list, "en helt ukjent vare");
  assertEqual("ukjent ingrediens forblir uendret", entry && formatShoppingAmount(entry), "3 boks");
}

// ---------------------------------------------------------------------------

console.log(`\n${passed} OK, ${failed} FEIL`);
process.exit(failed > 0 ? 1 : 0);
