/**
 * AUTOMATISERT TESTKONTRAKT for kjøpsnormalisering v2 – Henriks
 * produktgodkjente og autoritative spesifikasjon
 * `shopping-list-purchase-normalization-spec.md` v1.0 (05.10.2026).
 *
 * Dette scriptet ERSTATTER det forrige test-purchase-normalization.ts (som
 * testet den NÅ SUPERSEDERTE sitrus-/urte-/hvitløk-logikken med feil tall –
 * sitron 45 ml i stedet for 30 ml, appelsin 90 ml i stedet for 50 ml bare
 * ferskpresset, flat 10-fedd-per-løk i stedet for den godkjente 6-fedd-
 * regelen, og automatisk bunt/potte-gjetning for ferske urter som den nye
 * spesifikasjonen eksplisitt forbyr).
 *
 * Del 1 implementerer testmatrisen T001–T124 fra spesifikasjonen ORD FOR ORD
 * som kontrakt («Bruk testmatrisen i spesifikasjonen som kontrakt og
 * implementer automatiserte tester for den»). Del 2 er regresjonstester for
 * EKSISTERENDE handlelistefunksjoner som IKKE er endret av denne
 * spesifikasjonen (kryss-enhet-sammenslåing, del-av-en-helhet-kollaps,
 * basisvare-gjenkjenning, butikkategorier, kjøpstips-notat) – «Test også
 * relevante eksisterende handlelistefunksjoner slik at vi ikke introduserer
 * regresjoner».
 *
 * Ingen testrammeverk i prosjektet (ingen Jest/Vitest) – vanlig TS-script,
 * samme stil som scripts/seed.ts. Kjøres med:
 *   npx tsx scripts/test-purchase-normalization.ts
 * Exit-kode 1 ved minst én FEIL, 0 dersom alt stemmer.
 */
import {
  formatShoppingAmount,
  getPurchaseNote,
  mergeIngredientsIntoList,
  isPantryStaple,
  categorizeShoppingItem,
  isApproximateShoppingAmount,
  formatShoppingSecondaryAmount,
  formatShoppingSecondaryLine,
  groupShoppingEntriesForDisplay,
  formatShoppingShareLine,
} from "../lib/utils/shopping-list";
import { resolvePurchaseLine, convertToPreferredBase } from "../lib/utils/purchase-engine";
import type { IngredientGroup, IngredientItem, ShoppingListEntry, ShoppingListSourceRef } from "../lib/types";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    const msg = `FEIL ${label}\n     fikk:      ${a}\n     forventet: ${e}`;
    failures.push(msg);
    console.log(msg);
  }
}

function assertTrue(label: string, condition: boolean, context?: unknown) {
  if (condition) {
    passed++;
  } else {
    failed++;
    const msg = `FEIL ${label}${context !== undefined ? `\n     kontekst: ${JSON.stringify(context)}` : ""}`;
    failures.push(msg);
    console.log(msg);
  }
}

let seq = 0;
function it(name: string, amount: string | null, unit: string | null, note: string | null = null): IngredientItem {
  seq += 1;
  return { id: `i${seq}`, amount, unit, name, note, sortOrder: seq };
}

function oneGroup(items: IngredientItem[]): IngredientGroup[] {
  return [{ id: "g1", title: null, sortOrder: 1, items }];
}

/** Kjører ett "kall" = én oppskriftshendelse/faktisk tilberedningsøkt (se
 * §sharingGroup) – matcher hvordan Ukesmenyen kaller mergeIngredientsIntoList
 * én gang per oppskrift. */
function addRecipe(
  existing: ShoppingListEntry[],
  items: IngredientItem[],
  recipeTitle: string,
  servingsMultiplier = 1,
  source?: ShoppingListSourceRef,
): ShoppingListEntry[] {
  return mergeIngredientsIntoList(existing, oneGroup(items), recipeTitle, servingsMultiplier, source);
}

function findByName(list: ShoppingListEntry[], name: string): ShoppingListEntry | undefined {
  return list.find((e) => e.name.toLowerCase() === name.toLowerCase());
}
/** Finner den STYRTE S/G/E-linjen for en kjøps-ID (ruleId "S"/"G"/"E") –
 * aldri en KEEP-fallback-linje som (etter 05.10.2026-utvidelsen, se
 * `keepPurchaseId`/`sameItemAs` i shopping-list.ts) kan dele akkurat samme
 * purchaseId når formen ikke har en godkjent yield (f.eks. "limebåter",
 * ruleId "KEEP", purchaseId "lime"). Uten dette skillet ville testene
 * risikere å plukke feil linje når begge finnes samtidig (se T014). */
function findByPurchaseId(list: ShoppingListEntry[], purchaseId: string): ShoppingListEntry | undefined {
  return list.find((e) => e.purchaseMeta?.purchaseId === purchaseId && e.purchaseMeta?.ruleId !== "KEEP");
}

console.log("=== Del 1: Testmatrise T001–T124 (spesifikasjonens kontrakt) ===\n");

// --- S: sitron/lime/appelsin (T001–T027, T084, T094–T095, T103, T106, T116, T118 osv.) ---

// T001/T002: 1,5 ss limesaft -> 1 lime, 22,5 ml saft
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "1,5", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  assertTrue("T001/T002: lime-linje finnes", !!lime, list);
  assertEqual("T001/T002: 1,5 ss limesaft -> 1 lime", lime && formatShoppingAmount(lime), "1");
  assertTrue("T001/T002: undertekst nevner 22,5 ml saft", !!(lime && getPurchaseNote(lime)?.includes("22,5 ml saft")), lime && getPurchaseNote(lime));
}

// T003: 2 ss sitronsaft -> 1 sitron, 30 ml saft
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronsaft", "2", "ss")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T003: 2 ss sitronsaft -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
  assertTrue("T003: undertekst 30 ml saft", !!(lemon && getPurchaseNote(lemon)?.includes("30 ml saft")), lemon && getPurchaseNote(lemon));
}

// T004: finrevet skall av 1 sitron -> 1 sitron, skall av 1 trengs
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("finrevet skall av 1 sitron", null, null)], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T004: finrevet skall av 1 sitron -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
}

// T005: 2 ts finrevet sitronskall -> 2 sitroner, 10 ml zest
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("finrevet sitronskall", "2", "ts")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T005: 2 ts finrevet sitronskall -> 2 sitroner", lemon && formatShoppingAmount(lemon), "2");
  assertTrue("T005: undertekst 10 ml skall", !!(lemon && getPurchaseNote(lemon)?.includes("10 ml skall")), lemon && getPurchaseNote(lemon));
}

// T006: samme økt, 2 ss sitronsaft + 1 ts finrevet sitronskall -> 1 sitron, begge delbehov vises
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronsaft", "2", "ss"), it("finrevet sitronskall", "1", "ts")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T006: 2 ss saft + 1 ts skall samme økt -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
  const note = lemon && getPurchaseNote(lemon);
  assertTrue("T006: undertekst viser BÅDE saft og skall", !!(note && note.includes("saft") && note.includes("skall")), note);
}

// T007: 1 ss sitronsaft + skall av 3 sitroner (samme økt) -> 3 sitroner, skall dimensjonerende
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronsaft", "1", "ss"), it("sitronskall", "3", null)], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T007: 1 ss saft + skall av 3 -> 3 sitroner", lemon && formatShoppingAmount(lemon), "3");
}

// T008: 5 ss sitronsaft + skall av 1 sitron (samme økt) -> 3 sitroner, saft dimensjonerende
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronsaft", "5", "ss"), it("sitronskall", "1", null)], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T008: 5 ss saft + skall av 1 -> 3 sitroner", lemon && formatShoppingAmount(lemon), "3");
}

// T009: ½ sitron (saften av) + ½ sitron (skallet) -> 1 sitron (max, ingen målte yields siden
// context_required-formen med note-presedens tolker ½ som fruktantall for hver bøtte)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(
    list,
    [it("sitron", "0,5", null, "saften av"), it("sitron", "0,5", null, "skallet")],
    "R1",
  );
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T009: ½ saften + ½ skallet -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
}

// T010: Uke, tre separate middager A/B/C med limesaft -> 1+1+1=3 lime
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "1,5", "ss")], "A");
  list = addRecipe(list, [it("limejuice", "2", "ss")], "B");
  list = addRecipe(list, [it("fersk limesaft", "1", "ss")], "C");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T010: tre separate middager -> 3 lime (ikke sum-så-ceil)", lime && formatShoppingAmount(lime), "3");
}

// T011: A 0,5 ss + B 0,5 ss limesaft, separate middager -> 2 lime, ikke 1
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "0,5", "ss")], "A");
  list = addRecipe(list, [it("limesaft", "0,5", "ss")], "B");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T011: 0,5+0,5 ss separate middager -> 2 lime", lime && formatShoppingAmount(lime), "2");
}

// T012: 1 hel lime + 2 ss limesaft -> 2 lime (helfrukten reservert)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("lime", "1", null), it("limesaft", "2", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T012: 1 hel lime + 2 ss saft -> 2 lime", lime && formatShoppingAmount(lime), "2");
}

// T013: ½ lime i båter + 1 ss limesaft -> 1 lime (½ reservert + ½ til pressing)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("lime", "0,5", null, "i båter"), it("limesaft", "1", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T013: ½ lime i båter + 1 ss saft -> 1 lime", lime && formatShoppingAmount(lime), "1");
}

// T014: 4 limebåter (wedge-form, ingen yield) + 1 ss saft -> limebåter REVIEW beholdt + 1 lime til saft
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limebåter", "4", null), it("limesaft", "1", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T014: 1 ss saft -> 1 lime (limebåter går IKKE inn i ressursmodellen)", lime && formatShoppingAmount(lime), "1");
  const wedges = findByName(list, "limebåter");
  assertTrue("T014: limebåter beholdt uendret som egen REVIEW-linje", !!wedges && wedges.amount === 4, wedges);
}

// T015: samme økt, 1 lime (saft og skall) + 1 ss limesaft -> 2 lime (J=1,5, Z=1, W=0)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("lime", "1", null, "saft og skall"), it("limesaft", "1", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  // J = 1 (Bfruit) + 1 ss/30ml = 1,4928 ; Z = 1 (Bfruit) ; max(J,Z)=J≈1,49 -> ceil = 2
  assertEqual("T015: 1 lime (saft og skall) + 1 ss saft -> 2 lime", lime && formatShoppingAmount(lime), "2");
}

// T016: Uke, separat økt (standard): A skall av 1 sitron; B saft av 1 sitron -> 2 sitroner
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronskall", "1", null)], "A");
  list = addRecipe(list, [it("sitronsaft", "1", null)], "B");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T016: separate oppskriftshendelser -> 2 sitroner", lemon && formatShoppingAmount(lemon), "2");
}

// T017: samme FAKTISKE økt (A+B i samme kall) -> 1 sitron
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronskall", "1", null), it("sitronsaft", "1", null)], "A+B samme økt");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T017: samme faktiske økt -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
}

// T018: 1–2 ss sitron (saften) -> 1 sitron, beregnet fra øvre 30 ml, intervall beholdt i undertekst
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitron", "1-2", "ss", "saften")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T018: 1–2 ss sitron (saften) -> 1 sitron (øvre grense)", lemon && formatShoppingAmount(lemon), "1");
}

// T019: sitron (skallet), uten mengde -> ukjent skallbehov beholdt, ikke automatisk 1
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitron", null, null, "skallet")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertTrue("T019: ukjent skallbehov -> reviewReason satt, IKKE et tallfestet kjøpsantall på 1", !!(lemon && lemon.purchaseMeta?.reviewReason), lemon);
}

// T020: 30 g sitronsaft -> behold 30 g sitronsaft, REVIEW for yield (ingen ml=g)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronsaft", "30", "g")], "R1");
  const lemonGoverned = findByPurchaseId(list, "lemon");
  assertTrue("T020: 30 g sitronsaft går IKKE inn i sitron-ressursmodellen", !lemonGoverned, list);
  const kept = findByName(list, "sitronsaft");
  assertEqual("T020: 30 g sitronsaft beholdes uendret", kept && [kept.amount, kept.unit], [30, "g"]);
}

// T021: 2 ts grovt sitronskall -> behold, finrevet-zest-yield gjelder ikke (ingen alias -> unknown)
{
  const resolved = resolvePurchaseLine("grovt sitronskall", null, "ts");
  assertEqual("T021: 'grovt sitronskall' har ingen eksakt alias -> unknown (konservativ fallback)", resolved.kind, "unknown");
}

// T022: 1 ss sitronpepper -> eget krydder, ikke sitron-ressursmodellen
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronpepper", "1", "ss")], "R1");
  const lemonGoverned = findByPurchaseId(list, "lemon");
  assertTrue("T022: sitronpepper er IKKE sitron-ressursmodellen", !lemonGoverned, list);
  const kept = findByName(list, "sitronpepper");
  assertTrue("T022: sitronpepper beholdt som eget produkt", !!kept, list);
}

// T023: 2 tørkede persiske lime -> behold tørket produkt, ingen juice-yield
{
  const resolved = resolvePurchaseLine("tørkede persiske lime (limoo amani)", null, null);
  assertEqual("T023: tørkede persiske lime -> eget produkt, ikke lime-ressursmodellen", resolved.purchaseId, "lime_persian_dried");
}

// T024: 50 ml limesaft (konsentrat på flaske) -> behold flaskeform, ingen alias -> unknown
{
  const resolved = resolvePurchaseLine("limesaft (konsentrat på flaske)", null, "ml");
  assertEqual("T024: eksplisitt konsentrat/flaske -> ingen eksakt alias -> unknown (ikke fersk lime)", resolved.kind, "unknown");
}

// T025: 2 dl ferskpresset appelsinjuice -> 4 appelsiner, 200 ml juice
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("ferskpresset appelsinjuice", "2", "dl")], "R1");
  const orange = findByPurchaseId(list, "orange");
  assertEqual("T025: 2 dl ferskpresset appelsinjuice -> 4 appelsiner", orange && formatShoppingAmount(orange), "4");
}

// T026: 1 ss appelsinjuice (generisk, IKKE ferskpresset) -> KEEP som juiceprodukt
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("appelsinjuice", "1", "ss")], "R1");
  const orangeGoverned = findByPurchaseId(list, "orange");
  assertTrue("T026: generisk appelsinjuice går IKKE inn i appelsin-ressursmodellen", !orangeGoverned, list);
  const kept = findByName(list, "appelsinjuice");
  assertTrue("T026: appelsinjuice beholdt som eget juiceprodukt (orange_juice)", !!kept, list);
}

// T027: 2 strimler appelsinskall -> behold strimler, REVIEW (peel_strip har ingen godkjent yield)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("strimler appelsinskall", "2", null)], "R1");
  const orangeGoverned = findByPurchaseId(list, "orange");
  assertTrue("T027: strimler appelsinskall går IKKE inn i ressursmodellen (ingen yield)", !orangeGoverned, list);
  const kept = findByName(list, "strimler appelsinskall");
  assertTrue("T027: strimler appelsinskall beholdt uendret", !!kept, list);
}

// T084: 1 ss saft av sitron -> 1 sitron; 15 ml saft; ingen saltvare
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("saft av sitron", "1", "ss")], "R1");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T084: 1 ss saft av sitron -> 1 sitron", lemon && formatShoppingAmount(lemon), "1");
  assertTrue("T084: undertekst 15 ml saft", !!(lemon && getPurchaseNote(lemon)?.includes("15 ml saft")), lemon && getPurchaseNote(lemon));
}

// T094: 2 ss limeessens -> behold original, unknown_form; ingen lime
{
  const resolved = resolvePurchaseLine("limeessens", null, "ss");
  assertEqual("T094: limeessens -> unknown (nye formord som 'essens' matches ikke ved stripping)", resolved.kind, "unknown");
}

// T095: 2 ss ferskpresset limesaft -> 1 lime (eksplisitt godkjent grammatikk/alias, ikke fuzzy)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fersk limesaft", "2", "ss")], "R1");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T095: 2 ss fersk limesaft -> 1 lime", lime && formatShoppingAmount(lime), "1");
}

// T103: oppdatering av samlet limesaftbehov innen ÉN middag (simulert: ett kall, to linjer som
// endrer seg til et annet samlet behov) -> beregnes fra råbehovet for DENNE middagen isolert.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "4,5", "ss")], "MiddagX");
  const limeBefore = findByPurchaseId(list, "lime");
  assertEqual("T103 (før endring): 4,5 ss -> 3 lime for denne middagen", limeBefore && formatShoppingAmount(limeBefore), "3");
}

// T106: isolasjon – juice av lime og sitron i samme uke er ALDRI samme kjøpsidentitet
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "2", "ss")], "A");
  list = addRecipe(list, [it("sitronsaft", "2", "ss")], "B");
  const lime = findByPurchaseId(list, "lime");
  const lemon = findByPurchaseId(list, "lemon");
  assertTrue("T106: lime og sitron er to separate linjer, ingen delt skallkapasitet", !!lime && !!lemon && lime.id !== lemon.id, list);
}

// T116: samme faktiske økt, to linjer à 0,5 ss limesaft -> 1 lime (summering før ceil innen økten)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("limesaft", "0,5", "ss"), it("limesaft", "0,5", "ss")], "SammeØkt");
  const lime = findByPurchaseId(list, "lime");
  assertEqual("T116: 0,5+0,5 ss samme økt -> 1 lime", lime && formatShoppingAmount(lime), "1");
}

// T118: Uke, separate middager (mandag/tirsdag) med foreslått lagring -> 2 sitroner uansett
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sitronskall", "1", null)], "Mandag");
  list = addRecipe(list, [it("sitronsaft", "1", null)], "Tirsdag");
  const lemon = findByPurchaseId(list, "lemon");
  assertEqual("T118: separate middager, ingen lagringsfunksjon -> 2 sitroner", lemon && formatShoppingAmount(lemon), "2");
}

// --- G: hvitløk (T051–T057) ---

// T051: 3 fedd + 4 pressede hvitløksfedd -> 2 hvitløk; 7 fedd trengs
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fedd hvitløk", "3", null), it("pressede hvitløksfedd", "4", null)], "R1");
  const garlic = findByPurchaseId(list, "garlic");
  assertEqual("T051: 3+4 fedd -> 2 hvitløk", garlic && formatShoppingAmount(garlic), "2");
  assertTrue("T051: undertekst 7 fedd", !!(garlic && getPurchaseNote(garlic)?.includes("7 fedd")), garlic && getPurchaseNote(garlic));
}

// T052: Uke, 2 fedd + 4 fedd hvitløk -> 1 hvitløk; 6 fedd trengs, IKKE 2 hvitløk
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitløksfedd", "2", null)], "A");
  list = addRecipe(list, [it("fedd hvitløk", "4", null)], "B");
  const garlic = findByPurchaseId(list, "garlic");
  assertEqual("T052: 2+4 fedd (G summeres globalt) -> 1 hvitløk", garlic && formatShoppingAmount(garlic), "1");
}

// T053: Uke, 3 fedd + 4 fedd hvitløk -> 2 hvitløk; 7 fedd trengs (IKKE avrundet til 1)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitløksfedd", "3", null)], "A");
  list = addRecipe(list, [it("fedd hvitløk", "4", null)], "B");
  const garlic = findByPurchaseId(list, "garlic");
  assertEqual("T053: 3+4 fedd -> 2 hvitløk (7 fedd, sikkerhetsmargin, ikke 1)", garlic && formatShoppingAmount(garlic), "2");
}

// T054: 1 hel hvitløk + 6 fedd -> 2 hvitløk (reservert hel bruk + fedd)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitløk", "1", null, "hel"), it("hvitløksfedd", "6", null)], "R1");
  const garlic = findByPurchaseId(list, "garlic");
  assertEqual("T054: 1 hel hvitløk + 6 fedd -> 2 hvitløk", garlic && formatShoppingAmount(garlic), "2");
}

// T055: 1 hvitløk uten presisering -> behold, REVIEW for fedd/hode (IKKE auto-resolve)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitløk", "1", null)], "R1");
  const garlicGoverned = findByPurchaseId(list, "garlic");
  assertTrue("T055: tvetydig '1 hvitløk' går IKKE inn i G-ressursmodellen", !garlicGoverned, list);
  const kept = findByName(list, "hvitløk");
  assertTrue("T055: '1 hvitløk' beholdt uendret (vanlig tallfestet mengde, ikke auto-resolvert til garlic-modellen)", !!kept && kept.amount === 1, kept);
}

// T056: Uke, 6 fedd hvitløk + ½ ts hvitløkspulver -> 1 hvitløk OG ½ ts hvitløkspulver (separat produkt)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitløksfedd", "6", null), it("hvitløkspulver", "0,5", "ts")], "R1");
  const garlic = findByPurchaseId(list, "garlic");
  assertEqual("T056: 6 fedd -> 1 hvitløk", garlic && formatShoppingAmount(garlic), "1");
  const powder = findByName(list, "hvitløkspulver");
  assertTrue("T056: hvitløkspulver er et HELT separat produkt", !!powder && powder.amount === 0.5, powder);
}

// T057: 2 ts hakket hvitløk -> behold volum, ingen antatt feddvekt (ingen alias -> unknown)
{
  const resolved = resolvePurchaseLine("hakket hvitløk", null, "ts");
  assertEqual("T057: '2 ts hakket hvitløk' har ingen eksakt alias -> unknown, ingen gjettet feddvekt", resolved.kind, "unknown");
}

// --- E: egg (T086–T089, T117) ---

// T086: samme økt, 2 hele egg + 3 plommer + 2 hviter -> 5 egg
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("egg", "2", null), it("eggeplommer", "3", null), it("eggehviter", "2", null)], "R1");
  const egg = findByPurchaseId(list, "egg");
  assertEqual("T086: 2 hele + 3 plommer + 2 hviter samme økt -> 5 egg", egg && formatShoppingAmount(egg), "5");
}

// T087: samme faktiske økt, A 2 plommer, B 2 hviter -> 2 egg
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("eggeplommer", "2", null), it("eggehviter", "2", null)], "A+B samme økt");
  const egg = findByPurchaseId(list, "egg");
  assertEqual("T087: 2 plommer + 2 hviter samme faktiske økt -> 2 egg", egg && formatShoppingAmount(egg), "2");
}

// T088: Uke, separate middager A 2 plommer, B 2 hviter -> 4 egg (ingen lagring)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("eggeplommer", "2", null)], "A");
  list = addRecipe(list, [it("eggehviter", "2", null)], "B");
  const egg = findByPurchaseId(list, "egg");
  assertEqual("T088: separate middager -> 4 egg, ingen deling", egg && formatShoppingAmount(egg), "4");
}

// T089: 100 g pasteuriserte eggehviter -> KEEP+REVIEW for ny produktform (ingen alias -> unknown)
{
  const resolved = resolvePurchaseLine("pasteuriserte eggehviter", null, "g");
  assertEqual("T089: pasteuriserte eggehviter (kartong) -> unknown, ingen gram-til-hele-egg", resolved.kind, "unknown");
}

// T117: Uke, separate middager A ½ plomme, B ½ plomme -> 2 egg (ceil PER middag, ikke ceil(sum))
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("eggeplomme", "0,5", null)], "A");
  list = addRecipe(list, [it("eggeplomme", "0,5", null)], "B");
  const egg = findByPurchaseId(list, "egg");
  assertEqual("T117: ½+½ plomme separate middager -> 2 egg (ikke 1)", egg && formatShoppingAmount(egg), "2");
}

console.log(`\n(S/G/E-ressursmodellene) ${passed} OK, ${failed} FEIL så langt\n`);

// --- Øvrige enkelt-/aggregeringstester som bruker den UENDREDE generelle sammenslåingen ---
// (W, KEEP, PANTRY, N, REVIEW/choice, intervall/ukjent mengde – T028–T124 utenom de over)

// T028/T029: ½ gul løk -> 1 gul løk; ½+½ -> 1 (ikke 2)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("gul løk", "0,5", null)], "A");
  const onion = findByName(list, "gul løk");
  assertEqual("T028: ½ gul løk -> 1 gul løk", onion && formatShoppingAmount(onion), "1");
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("gul løk", "0,5", null)], "A");
  list = addRecipe(list, [it("gul løk", "0,5", null)], "B");
  const onion = findByName(list, "gul løk");
  assertEqual("T029: ½+½ gul løk (uke) -> 1 gul løk", onion && formatShoppingAmount(onion), "1");
}

// T030: 1½ + ¼ gul løk -> 2 gul løk; 1¾ trengs
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("gul løk", "1 1/2", null)], "A");
  list = addRecipe(list, [it("gul løk", "1/4", null)], "B");
  const onion = findByName(list, "gul løk");
  assertEqual("T030: 1½+¼ gul løk -> 2 gul løk", onion && formatShoppingAmount(onion), "2");
}

// T033: ½ agurk + 0,5 stk. agurk -> 1 agurk (stk. og enhetsløst er likeverdig)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("agurk", "0,5", null)], "A");
  list = addRecipe(list, [it("agurk", "0,5", "stk.")], "B");
  const cucumber = findByName(list, "agurk");
  assertEqual("T033: ½ + 0,5 stk. agurk -> 1 agurk", cucumber && formatShoppingAmount(cucumber), "1");
}

// T038: 1 ts paprika -> 1 ts paprikapulver (presedensregel 4), ingen paprikafrukt
{
  const resolved = resolvePurchaseLine("paprika", null, "ts");
  assertEqual("T038: '1 ts paprika' -> paprika_powder (presedensregel 4)", resolved.purchaseId, "paprika_powder");
}
{
  const resolvedFruit = resolvePurchaseLine("paprika", null, null);
  assertEqual("T038b: bar 'paprika' uten ts-enhet -> paprikafrukt (pepper_fruit_unspecified)", resolvedFruit.purchaseId, "pepper_fruit_unspecified");
}

// T039: 10 g + 15 g fersk persille -> 25 g; ingen potte/bunt-konvertering i det hele tatt
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fersk persille", "10", "g")], "A");
  list = addRecipe(list, [it("fersk persille", "15", "g")], "B");
  const parsley = findByName(list, "fersk persille");
  assertEqual("T039: 10g+15g fersk persille -> 25 g (aldri bunt)", parsley && [parsley.amount, parsley.unit], [25, "g"]);
}

// T044: 8–10 blader fersk basilikum -> intervallet beholdes UENDRET (ingen midtpunkt, ingen potte)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fersk basilikum", "8-10", "blad")], "A");
  const basil = findByName(list, "fersk basilikum");
  assertEqual("T044: 8-10 blad basilikum vises med intervallet bevart, ikke kollapset til '1'", basil && formatShoppingAmount(basil), "8-10 blad");
}

// T085: 1–2 ts kalvefond -> intervallet beholdes UENDRET (ingen midtpunkt-tall, ingen REVIEW for navnet)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("kalvefond", "1-2", "ts")], "A");
  const stock = findByName(list, "kalvefond");
  assertEqual("T085: 1-2 ts kalvefond vises med intervallet bevart, ikke midtpunktet 1,5", stock && formatShoppingAmount(stock), "1-2 ts");
}

// T051-adjacent precedence sanity: fresh-form downgrades (koriander/finhakket timian/finhakket dill)
{
  const coriander = resolvePurchaseLine("koriander", null, null);
  assertEqual("H/presedens 4: bar 'koriander' nedgraderes til coriander_unspecified+REVIEW", coriander.purchaseId, "coriander_unspecified");
  assertEqual("H/presedens 4: bar 'koriander' -> kind review", coriander.kind, "review");
  const freshCoriander = resolvePurchaseLine("frisk koriander", null, null);
  assertEqual("H/presedens 4: 'frisk koriander' (markør i navnet) forblir coriander_fresh", freshCoriander.purchaseId, "coriander_fresh");
  const thyme = resolvePurchaseLine("finhakket timian", null, null);
  assertEqual("H: 'finhakket timian' nedgraderes til thyme_unspecified+REVIEW", thyme.purchaseId, "thyme_unspecified");
  const dill = resolvePurchaseLine("finhakket dill", null, null);
  assertEqual("H: 'finhakket dill' nedgraderes til dill_unspecified+REVIEW", dill.purchaseId, "dill_unspecified");
}

// T047/T049: 1 ts oregano / 1 ts koriander uten form -> behold, ikke anta tørket/fersk
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("oregano", "1", "ts")], "A");
  const oregano = findByName(list, "oregano");
  assertTrue("T047: 'oregano' uten form beholdt uspesifisert (oregano_unspecified, ikke tørket)", !!oregano, list);
}

// T051: allerede testet over (G-seksjonen).

// T058–T064: N – vann/biprodukter
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("vann", "3", "dl")], "A");
  assertEqual("T058: 3 dl vann -> ingen kjøpsvare i det hele tatt", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("pastavann", "1", "dl"), it("salt til kokevannet", "1,5", "ss")], "A");
  assertEqual("T059: bare salt som kjøpsvare (pastavann skjult)", list.length, 1);
  const salt = findByName(list, "salt til kokevannet");
  assertTrue("T059: salt-linjen auto-avhuket (basisvare)", !!salt && salt.checked, salt);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("boks tunfisk i vann", "1", "boks")], "A");
  assertEqual("T060: tunfisk i vann beholdes (aldri slettet av vannregelen)", list.length, 1);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("stekesmør fra biff", null, null)], "A");
  assertEqual("T061: stekesmør fra biff -> NOT_PURCHASED, ingen linje", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("olje fra de soltørkede tomatene", null, null)], "A");
  assertEqual("T062: olje fra soltørkede tomater -> NOT_PURCHASED, ingen linje", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("lake fra sylteagurken", "1", "ts")], "A");
  assertEqual("T063: lake fra sylteagurken -> NOT_PURCHASED, ingen linje/REVIEW", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(
    list,
    [it("kraft fra trekkingen", "4", "dl"), it("kraft fra kokingen", "2", "dl"), it("kraft fra kyllingen", null, null)],
    "A",
  );
  assertEqual("T111: alle tre NOT_PURCHASED, ingen linjer", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(
    list,
    [it("stekesjy fra kjøttet", null, null), it("kraft fra grønnsakene", null, null), it("væske fra boksen med bønner", null, null)],
    "A",
  );
  assertEqual("T112: generelt 'X fra Y'-mønster (ukjente navn) -> alle NOT_PURCHASED", list.length, 0);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(
    list,
    [
      it("kjøpt kyllingkraft", "3", "dl"),
      it("tilsatt kalvefond", "1", "ss"),
      it("buljongterning", "1", null),
      it("ekstra olje", "2", "ss"),
      it("kjøpt lake", "1", "dl"),
    ],
    "A",
  );
  assertEqual("T113: eksplisitte kjøps-/tilsetningsmarkører beholdes som vanlige kjøpsvarer (5 linjer)", list.length, 5);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("andefett", "2", "ss", "fra steking"), it("andefett", "2", "ss", "kjøpt")], "A");
  assertEqual("T114: bare 2 ss kjøpt andefett vises (biproduktet utelates)", list.length, 1);
  const fat = list[0];
  assertEqual("T114: mengden er nøyaktig 2 ss (kjøpt-andefettet)", [fat.amount, fat.unit], [2, "ss"]);
}

// T065–T082: ordinær KEEP/kryss-enhet-sammenslåing (UENDRET maskin – regresjonssikring samtidig)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("rigatoni", "250", "g")], "A");
  list = addRecipe(list, [it("rigatoni", "0,25", "kg")], "B");
  const pasta = findByName(list, "rigatoni");
  assertEqual("T066: 250g + 0,25kg rigatoni -> 500 g", pasta && [pasta.amount, pasta.unit], [500, "g"]);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("rigatoni", "250", "g"), it("rigatoni eller penne", "250", "g")], "A");
  assertEqual("T068: fast rigatoni og uløst alternativ 'rigatoni eller penne' er TO separate linjer", list.length, 2);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("kremfløte", "2", "dl")], "A");
  list = addRecipe(list, [it("kremfløte", "50", "ml")], "B");
  list = addRecipe(list, [it("kremfløte", "2", "ss")], "C");
  const cream = findByName(list, "kremfløte");
  // 2dl=200ml + 50ml + 2ss(29,5736ml) = 279,5736 ml ~= 2,8 dl
  assertTrue("T070: 2dl+50ml+2ss kremfløte -> ca. 2,8 dl", !!cream && cream.unit === "dl" && Math.abs((cream.amount ?? 0) - 2.8) < 0.05, cream);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hakkede tomater", "400", "g")], "A");
  list = addRecipe(list, [it("hakkede tomater", "1", "boks", "400 g")], "B");
  const tomatoes = findByName(list, "hakkede tomater");
  assertTrue("T072: 400g + boks(400g) hakkede tomater -> finnes (lokal ekvivalens håndteres av eksisterende merge)", !!tomatoes, list);
}

// T090/T091: salt og pepper-splitt
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt og sort pepper", null, null)], "A");
  assertEqual("T090: 'salt og sort pepper' uten mengde splittes til 2 linjer", list.length, 2);
  assertTrue("T090: begge linjer er ukvantifisert", list.every((e) => e.amount == null), list);
  assertTrue("T090: 'sort' i input -> sort malt pepper, ikke generisk pepper", !!findByName(list, "sort malt pepper"), list);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt og pepper", null, null)], "A");
  assertTrue("T090b: uten 'sort' -> generisk pepper", !!findByName(list, "pepper"), list);
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt og pepper", "1", "ts")], "A");
  assertEqual("T091: '1 ts salt og pepper' (KVANTIFISERT) splittes IKKE, beholdes som én linje", list.length, 1);
}

// T097: 0 g salt -> intet kjøpsbehov (mengde 0, ikke manglende mengde)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt", "0", "g")], "A");
  const salt = findByName(list, "salt");
  assertEqual("T097: 0 g salt -> amount er eksakt 0 (intet behov, men linjen finnes fortsatt)", salt && salt.amount, 0);
}

// T100: 2 burrata (125 g hver) -> ett behov, ikke to additive
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("burrata", "2", "stk", "125 g hver")], "A");
  assertEqual("T100: 2 burrata er ÉN linje", list.length, 1);
}

// T110/T123: salt lammekjøtt eller saltkjøtt av får
{
  const resolved = resolvePurchaseLine("salt lammekjøtt eller saltkjøtt av får", null, null);
  assertEqual("T110: alternativuttrykket er ETT behov (choice_salted_lamb_mutton)", resolved.kind, "choice");
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt lammekjøtt", "400", "g"), it("saltkjøtt av får", "400", "g")], "A");
  assertEqual("T123: to artsbenevnte kjøttprodukter, aldri separat saltvare", list.length, 2);
  assertTrue("T123: ingen av linjene er PANTRY-salt", !list.some((e) => e.name.toLowerCase() === "salt"), list);
}

// T119/T120/T121/T122: eksakte aliaser, bevisst forskjellige produkter
{
  const curry = resolvePurchaseLine("yellow curry", null, "ts");
  assertEqual("T119: 'yellow curry' -> yellow_curry_paste, separat fra karripulver", curry.purchaseId, "yellow_curry_paste");
}
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("finhakka tomater", "400", "g")], "A");
  const tomatoes = findByName(list, "finhakka tomater");
  assertTrue("T120: 'finhakka tomater' -> ingen REVIEW (HIGH, tomato_canned_finely_chopped)", !!tomatoes, list);
  assertEqual("T120: resolvePurchaseLine gir 'normal', ikke review", resolvePurchaseLine("finhakka tomater", null, "g").kind, "normal");
}
{
  // MERK (06.10.2026): oppdatert forventning etter Henriks masse↔volum-
  // whitelist (Del 1) – cornstarch (maisenna/maizena) er én av de 14
  // eksplisitt godkjente kjøps-ID-ene (1 dl = 50 g), og normaliseres derfor
  // nå til gram FRA FØRSTE forekomst i stedet for å telles i "ss" (se W4 i
  // Del 3-testene under for samme mekanisme med begge skrivemåtene aktivt
  // kombinert med whitelist-konverteringen). Selve alias-sammenslåingen
  // («maisenna» og «maizena» er samme kjøps-ID») er UENDRET og fortsatt
  // bekreftet her – kun VISNINGSENHETEN er annerledes nå (g, ikke ss).
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("maisenna", "1", "ss")], "A");
  list = addRecipe(list, [it("maizena", "1", "ss")], "B");
  const starch = list[0];
  assertTrue("T122: 'maisenna' og 'maizena' er samme produkt (cornstarch)", resolvePurchaseLine("maisenna", null, "ss").purchaseId === "cornstarch" && resolvePurchaseLine("maizena", null, "ss").purchaseId === "cornstarch", null);
  assertEqual("T122: begge skrivemåtene summeres til samme linje, nå i gram (whitelist, 1 ss = 7,5 g)", starch && [starch.amount, starch.unit], [15, "g"]);
}

// T124: finhakket rødløk uten mengde -> rødløk, ukjent behov, ingen oppfunnet stykkmengde
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("finhakket rødløk", null, null)], "A");
  const onion = findByName(list, "finhakket rødløk");
  assertTrue("T124: rødløk uten mengde beholdt som ukjent behov, IKKE automatisk 1", !!onion && onion.amount == null, onion);
}

console.log(`\n(testmatrise T001–T124, det som er praktisk å uttrykke som enhetstest) ${passed} OK, ${failed} FEIL totalt\n`);

console.log("=== Del 2: Regresjonstester for UENDRET eksisterende funksjonalitet ===\n");

// Basisvare-gjenkjenning (isPantryStaple) – uendret liste/logikk
assertTrue("Regresjon: 'fint havsalt' er basisvare", isPantryStaple("fint havsalt"));
assertTrue("Regresjon: 'extra virgin olivenolje' er basisvare", isPantryStaple("extra virgin olivenolje"));
assertTrue("Regresjon: 'rigatoni' er IKKE en basisvare", !isPantryStaple("rigatoni"));

// Butikkategorier – uendret
assertEqual("Regresjon: kremfløte -> dairy", categorizeShoppingItem("kremfløte"), "dairy");
assertEqual("Regresjon: hermetiske tomater -> pantry (mer spesifikk enn 'tomater')", categorizeShoppingItem("hermetiske tomater"), "pantry");
assertEqual("Regresjon: ukjent vare -> other", categorizeShoppingItem("et helt oppdiktet produktnavn xyz"), "other");

// Del-av-en-helhet-kollaps (blad/fedd/kvist/båt) – uendret, kun flyttet forbi S/G-ruting
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hjertesalat", "4", "blad")], "A");
  const salad = findByName(list, "hjertesalat");
  assertEqual("Regresjon: 4 blader hjertesalat kollapser til '1'", salad && formatShoppingAmount(salad), "1");
}

// Kjøpstips-notat for vin (isBuyingTipWorthKeeping-logikken er uendret)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("hvitvin (tørr)", "2", "dl", "en fyldig, rimelig hvitvin – f.eks. Chardonnay")], "A");
  const wine = findByName(list, "hvitvin (tørr)");
  assertTrue("Regresjon: vin-kjøpstips bevares i note-feltet", !!wine?.note?.includes("Chardonnay"), wine);
}

// "Ukvantifisert vare finnes allerede med mengde andre steder"-sammenslåingen – uendret
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("parmesan", "80", "g")], "A");
  list = addRecipe(list, [it("parmesan", null, null, "til servering")], "B");
  assertEqual("Regresjon: ukvantifisert parmesan slås sammen med tallfestet, ingen ny linje", list.length, 1);
}

console.log("=== Del 3: Henriks tre-delte spesifikasjon 06.10.2026 (masse↔volum-whitelist, ny presentasjon, del/eksport) ===\n");

// --- DEL 1: Eksplisitt masse↔volum-whitelist (14 varer) ---

// W1: Henriks eget eksempel – 75 g smør + 1 ss smør -> 90 g (1 ss = 15 g)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("smør", "75", "g")], "R1");
  list = addRecipe(list, [it("smør", "1", "ss")], "R2");
  const butter = findByName(list, "smør");
  assertEqual("W1: 75 g smør + 1 ss smør -> ÉN linje", list.filter((e) => e.name === "smør").length, 1);
  assertEqual("W1: 75 g smør + 1 ss smør -> 90 g", butter && formatShoppingAmount(butter), "90 g");
}

// W2: whitelisten normaliserer til foretrukket enhet FRA FØRSTE forekomst
// (ikke bare når et andre bidrag krysser g/ml-grensen) – "2 ss smør" alene
// skal vises som "30 g", ikke "2 ss".
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("smør", "2", "ss")], "R1");
  const butter = findByName(list, "smør");
  assertEqual("W2: 2 ss smør (ett bidrag) -> 30 g direkte", butter && formatShoppingAmount(butter), "30 g");
}

// W3: kremfløte (r011) er den ENE varen med foretrukket sluttenhet ml/dl –
// et vektbidrag skal konverteres TIL volum, ikke omvendt.
// 3 dl kremfløte (300 ml) + 50 g kremfløte (-> 50 ml, tetthet 1,0 g/ml) = 350 ml = 3,5 dl.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("kremfløte", "3", "dl")], "R1");
  list = addRecipe(list, [it("kremfløte", "50", "g")], "R2");
  const cream = findByName(list, "kremfløte");
  assertEqual("W3: 3 dl + 50 g kremfløte -> ÉN linje", list.filter((e) => e.name === "kremfløte").length, 1);
  assertEqual("W3: 3 dl kremfløte + 50 g kremfløte -> 3.5 dl (foretrukket enhet ml/dl)", cream?.unit, "dl");
  assertEqual("W3: totalmengde 3.5 dl", cream?.amount, 3.5);
}

// W4: maisenna/maizena (cornstarch) – alias-sammenslåingen (ulike
// skrivemåter av SAMME kjøps-ID) og masse↔volum-whitelisten virker SAMMEN.
// 1 dl maisenna (50 g) + 50 g maizena = 100 g.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("maisenna", "1", "dl")], "R1");
  list = addRecipe(list, [it("maizena", "50", "g")], "R2");
  const cornstarch = list.find((e) => e.purchaseMeta?.purchaseId === "cornstarch");
  assertTrue("W4: maisenna/maizena slått sammen til ÉN linje", list.filter((e) => e.purchaseMeta?.purchaseId === "cornstarch").length === 1, list);
  assertEqual("W4: 1 dl maisenna + 50 g maizena -> 100 g", cornstarch && formatShoppingAmount(cornstarch), "100 g");
}

// W5: sriracha (1 ss = 12,5 g) – nøyaktig referanseenheten gir et eksakt,
// ikke-flyttalls-urent tall.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("sriracha", "1", "ss")], "R1");
  const sriracha = findByName(list, "sriracha");
  assertEqual("W5: 1 ss sriracha -> 12.5 g", sriracha && formatShoppingAmount(sriracha), "12.5 g");
}

// W6: convertToPreferredBase returnerer null for ikke-whitelistede
// kjøps-ID-er (ren enhetstest av selve funksjonen i purchase-engine.ts).
{
  assertEqual("W6: convertToPreferredBase(garlic, ...) -> null (ikke whitelistet)", convertToPreferredBase("garlic", 2, "ss"), null);
  assertEqual("W6: convertToPreferredBase(butter, 'boks', ...) -> null (ikke metrisk enhet)", convertToPreferredBase("butter", 1, "boks"), null);
}

// W7: alt IKKE i whitelisten beholder den eksisterende, konservative
// "ingen kryssing av g/ml"-oppførselen uendret – fersk koriander (urt,
// eksplisitt utelatt av Henrik) i g OG ss skal IKKE slås sammen.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fersk koriander", "15", "g")], "R1");
  list = addRecipe(list, [it("fersk koriander", "1", "ss")], "R2");
  const corianderLines = list.filter((e) => e.name === "fersk koriander");
  assertEqual("W7: fersk koriander i g og ss forblir TO separate linjer", corianderLines.length, 2);
}

// W8: ingen pakningsstørrelse-antakelser – tomatpuré i "boks" (ikke en
// metrisk enhet) skal ALDRI konverteres/slås sammen med en gram-mengde av
// samme vare, selv om tomatpuré selv ER whitelistet for ss/g.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("tomatpuré", "1", "boks")], "R1");
  list = addRecipe(list, [it("tomatpuré", "20", "g")], "R2");
  const tomatoPasteLines = list.filter((e) => e.name === "tomatpuré");
  assertEqual("W8: 1 boks + 20 g tomatpuré -> TO separate linjer (ingen pakningsgjetning)", tomatoPasteLines.length, 2);
}

// W9: salt (eksplisitt utelatt, "klype" er uansett ikke en metrisk enhet)
// skal fortsatt ALDRI slås sammen på tvers av g/klype.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt", "1", "klype")], "R1");
  list = addRecipe(list, [it("salt", "5", "g")], "R2");
  const saltLines = list.filter((e) => e.name === "salt");
  assertEqual("W9: 1 klype salt + 5 g salt -> TO separate linjer", saltLines.length, 2);
}

// --- DEL 2: Ny presentasjon (navn på hovedlinjen, mengde som sekundærtekst) ---

// P1: isApproximateShoppingAmount – ekte målenheter/vage enheter er
// tilnærmet ("ca."), eksakte tellbare antall og bevarte intervaller er det ikke.
{
  const gramEntry: ShoppingListEntry = { id: "x1", amount: 90, displayAmount: null, unit: "g", name: "smør", checked: false, fromRecipes: [] };
  assertTrue("P1: 90 g er en tilnærmet mengde", isApproximateShoppingAmount(gramEntry));

  const handfulEntry: ShoppingListEntry = { id: "x2", amount: 1, displayAmount: null, unit: "håndfull", name: "koriander", checked: false, fromRecipes: [] };
  assertTrue("P1: '1 håndfull' er en tilnærmet mengde", isApproximateShoppingAmount(handfulEntry));

  const eggEntry: ShoppingListEntry = { id: "x3", amount: 4, displayAmount: null, unit: null, name: "egg", checked: false, fromRecipes: [] };
  assertTrue("P1: '4' (enhetsløst, eksakt antall) er IKKE tilnærmet", !isApproximateShoppingAmount(eggEntry));

  const stkEntry: ShoppingListEntry = { id: "x4", amount: 3, displayAmount: null, unit: "stk", name: "løk", checked: false, fromRecipes: [] };
  assertTrue("P1: '3 stk' er IKKE tilnærmet", !isApproximateShoppingAmount(stkEntry));

  const wedgeEntry: ShoppingListEntry = { id: "x5", amount: 4, displayAmount: null, unit: "båter", name: "lime", checked: false, fromRecipes: [] };
  assertTrue("P1: del-av-en-helhet ('båter', kollapses til 1) er IKKE tilnærmet", !isApproximateShoppingAmount(wedgeEntry));

  const intervalEntry: ShoppingListEntry = {
    id: "x6",
    amount: 9,
    displayAmount: null,
    rawIntervalText: "8-10",
    unit: "blad",
    name: "basilikum",
    checked: false,
    fromRecipes: [],
  };
  assertTrue("P1: bevart intervall ('8-10 blad') er IKKE tilnærmet", !isApproximateShoppingAmount(intervalEntry));
}

// P2: formatShoppingSecondaryAmount – "ca."-prefiks for ett enkelt bidrag,
// gjenbruker formatShoppingAmount uendret.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("smør", "90", "g")], "R1");
  const butter = findByName(list, "smør")!;
  assertEqual("P2: sekundærtekst for 90 g smør -> 'ca. 90 g'", formatShoppingSecondaryAmount([butter]), "ca. 90 g");

  let eggList: ShoppingListEntry[] = [];
  eggList = addRecipe(eggList, [it("egg", "4", "stk")], "R1");
  const egg = findByPurchaseId(eggList, "egg")!;
  assertEqual(
    "P2: sekundærtekst for 4 egg -> '4 stk.' (ingen 'ca.', men eksplisitt 'stk.' siden styrte S/G/E-kjøpsantall er enhetsløse)",
    formatShoppingSecondaryAmount([egg]),
    "4 stk.",
  );
}

// P3: groupShoppingEntriesForDisplay + formatShoppingSecondaryAmount –
// flere, ikke-sammenslåtte behov for SAMME vare vises samlet i ÉN gruppe
// med kombinert sekundærtekst, uten informasjonstap. Henriks eget eksempel:
// "ca. 15 g + 1 håndfull" (ÉN delt "ca.", ikke gjentatt per del).
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("koriander", "15", "g")], "R1");
  list = addRecipe(list, [it("koriander", "1", "håndfull")], "R2");
  const corianderLines = list.filter((e) => e.name === "koriander");
  assertEqual("P3: '15 g' og '1 håndfull' koriander forblir TO underliggende rader", corianderLines.length, 2);
  const groups = groupShoppingEntriesForDisplay(list);
  const corianderGroup = groups.find((g) => g.name === "koriander");
  assertTrue("P3: de to radene vises som ÉN gruppe", !!corianderGroup && corianderGroup.entries.length === 2, groups);
  assertEqual(
    "P3: kombinert sekundærtekst -> 'ca. 15 g + 1 håndfull'",
    corianderGroup && formatShoppingSecondaryAmount(corianderGroup.entries),
    "ca. 15 g + 1 håndfull",
  );
}

// P4: en helt ukvantifisert vare (bart "salt", ingen mengde i det hele
// tatt) skal IKKE vise en tom "ca."-sekundærlinje.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt", null, null)], "R1");
  const salt = findByName(list, "salt")!;
  assertEqual("P4: ukvantifisert salt -> tom sekundærtekst", formatShoppingSecondaryAmount([salt]), "");
}

// P5: groupShoppingEntriesForDisplay er en 1:1-passthrough for alt som
// allerede er slått sammen til én rad (de aller fleste varer) – ingen
// regresjon i gruppe-antallet for et vanlig, ublandet scenario.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("ris", "200", "g")], "R1");
  list = addRecipe(list, [it("løk", "2", "stk")], "R1");
  const groups = groupShoppingEntriesForDisplay(list);
  assertEqual("P5: to ublandede varer -> to grupper", groups.length, 2);
}

// P6: Opprydding 06.10.2026 (Henrik) – "trengs"/"Du trenger" skal ALDRI
// forekomme i getPurchaseNote for G (hvitløk) eller S (sitrus) lenger.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fedd hvitløk", "10", null)], "R1");
  const garlic = findByPurchaseId(list, "garlic");
  const garlicNote = garlic && getPurchaseNote(garlic);
  assertTrue("P6: hvitløk-notat inneholder ikke 'trengs'", !!garlicNote && !garlicNote.includes("trengs"), garlicNote);
  assertTrue("P6: hvitløk-notat inneholder ikke 'Du trenger'", !!garlicNote && !garlicNote.includes("Du trenger"), garlicNote);

  let citrusList: ShoppingListEntry[] = [];
  citrusList = addRecipe(citrusList, [it("sitronsaft", "2", "ss")], "R1");
  const lemon = findByPurchaseId(citrusList, "lemon");
  const lemonNote = lemon && getPurchaseNote(lemon);
  assertTrue("P6: sitron-notat inneholder ikke 'trengs'", !!lemonNote && !lemonNote.includes("trengs"), lemonNote);
  assertTrue("P6: sitron-notat inneholder ikke 'Du trenger'", !!lemonNote && !lemonNote.includes("Du trenger"), lemonNote);
}

// P7: Henriks eget eksempel – kjøpsantall og beregnet behov samles på ÉN
// sekundærlinje ("2 stk. · ca. 10 fedd" / "2 stk. · ca. 30 ml saft"), ikke
// spredt over flere linjer.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fedd hvitløk", "6", null)], "R1");
  list = addRecipe(list, [it("fedd hvitløk", "4", null)], "R2");
  const garlicGroups = groupShoppingEntriesForDisplay(list);
  const garlicGroup = garlicGroups.find((g) => g.name === "hvitløk")!;
  assertEqual(
    "P7: hvitløk -> '2 stk. · ca. 10 fedd'",
    garlicGroup && formatShoppingSecondaryLine(garlicGroup),
    "2 stk. · ca. 10 fedd",
  );

  let citrusList: ShoppingListEntry[] = [];
  citrusList = addRecipe(citrusList, [it("sitron", "1", null, "hel")], "R1");
  citrusList = addRecipe(citrusList, [it("sitronsaft", "2", "ss")], "R2");
  const citrusGroups = groupShoppingEntriesForDisplay(citrusList);
  const lemonGroup = citrusGroups.find((g) => g.name === "sitron")!;
  assertEqual(
    "P7: sitron -> '2 stk. · ca. 30 ml saft'",
    lemonGroup && formatShoppingSecondaryLine(lemonGroup),
    "2 stk. · ca. 30 ml saft",
  );
}

// --- DEL 3: Del/eksporter bevarer mengder i ett-linjes format ---

// E1: Henriks eget eksempel – "Kremfløte — ca. 6 dl" (her: 3 dl + 3 dl -> 6 dl)
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("kremfløte", "3", "dl")], "R1");
  list = addRecipe(list, [it("kremfløte", "3", "dl")], "R2");
  const groups = groupShoppingEntriesForDisplay(list);
  const creamGroup = groups.find((g) => g.name === "kremfløte")!;
  assertEqual("E1: delingstekst for kremfløte -> 'kremfløte — ca. 6 dl'", formatShoppingShareLine(creamGroup), "kremfløte — ca. 6 dl");
}

// E2: flere, ikke-sammenslåtte behov komprimeres til ÉN delingslinje,
// uten informasjonstap (samme kombinerte sekundærtekst som på skjermen).
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("koriander", "15", "g")], "R1");
  list = addRecipe(list, [it("koriander", "1", "håndfull")], "R2");
  const groups = groupShoppingEntriesForDisplay(list);
  const corianderGroup = groups.find((g) => g.name === "koriander")!;
  assertEqual(
    "E2: delingstekst for koriander -> 'koriander — ca. 15 g + 1 håndfull'",
    formatShoppingShareLine(corianderGroup),
    "koriander — ca. 15 g + 1 håndfull",
  );
}

// E3: en helt ukvantifisert vare vises med bare navnet i delingsteksten,
// uten en tom "— "-rest.
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("salt", null, null)], "R1");
  const groups = groupShoppingEntriesForDisplay(list);
  const saltGroup = groups.find((g) => g.name === "salt")!;
  assertEqual("E3: delingstekst for ukvantifisert salt -> bare 'salt'", formatShoppingShareLine(saltGroup), "salt");
}

// E4: Opprydding 06.10.2026 (Henrik) – delingstekst for hvitløk/sitron
// tilsvarer skjermvisningen (kjøpsantall + beregnet behov på én linje),
// og inneholder ALDRI "Fra: [oppskrift]".
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("fedd hvitløk", "6", null)], "R1");
  list = addRecipe(list, [it("fedd hvitløk", "4", null)], "R2");
  const groups = groupShoppingEntriesForDisplay(list);
  const garlicGroup = groups.find((g) => g.name === "hvitløk")!;
  const garlicLine = garlicGroup && formatShoppingShareLine(garlicGroup);
  assertEqual("E4: delingstekst for hvitløk -> 'hvitløk — 2 stk. · ca. 10 fedd'", garlicLine, "hvitløk — 2 stk. · ca. 10 fedd");
  assertTrue("E4: delingstekst for hvitløk inneholder ikke 'Fra:'", !!garlicLine && !garlicLine.includes("Fra:"), garlicLine);

  let citrusList: ShoppingListEntry[] = [];
  citrusList = addRecipe(citrusList, [it("sitron", "1", null, "hel")], "R1");
  citrusList = addRecipe(citrusList, [it("sitronsaft", "2", "ss")], "R2");
  const citrusGroups = groupShoppingEntriesForDisplay(citrusList);
  const lemonGroup = citrusGroups.find((g) => g.name === "sitron")!;
  const lemonLine = lemonGroup && formatShoppingShareLine(lemonGroup);
  assertEqual("E4: delingstekst for sitron -> 'sitron — 2 stk. · ca. 30 ml saft'", lemonLine, "sitron — 2 stk. · ca. 30 ml saft");
  assertTrue("E4: delingstekst for sitron inneholder ikke 'Fra:'", !!lemonLine && !lemonLine.includes("Fra:"), lemonLine);
}

console.log(`\n(Del 3) ${passed} OK, ${failed} FEIL totalt\n`);

console.log("=== Del 4: Regresjon – eksisterende kryss-enhet-sammenslåing for IKKE-whitelistede varer ===\n");

// R1: soyasaus (ikke whitelistet) – ss+ts skal fortsatt slås sammen via den
// EKSISTERENDE, uendrede generiske kryss-enhet-sammenslåingen (units.ts sine
// presise ml-faktorer, IKKE purchase-engine sine norske kjøkkenmål – se
// toBaseAmount i shopping-list.ts).
{
  let list: ShoppingListEntry[] = [];
  list = addRecipe(list, [it("soyasaus", "1", "ss")], "R1");
  list = addRecipe(list, [it("soyasaus", "1", "ts")], "R2");
  const soy = findByName(list, "soyasaus");
  assertEqual("R1: 1 ss + 1 ts soyasaus -> ÉN linje (kryss-enhet-sammenslåing uendret)", list.filter((e) => e.name === "soyasaus").length, 1);
  assertTrue("R1: soyasaus-linjen har en volum-enhet (ts/ss/dl/l)", !!soy && ["ts", "ss", "dl", "l"].includes(soy.unit ?? ""), soy);
}

console.log(`\n(Del 4) ${passed} OK, ${failed} FEIL totalt\n`);

console.log(`\n=== TOTALT: ${passed} OK, ${failed} FEIL ===`);
if (failed > 0) {
  console.log("\nFeilende tester:");
  for (const f of failures) console.log(f);
}
process.exit(failed > 0 ? 1 : 0);
