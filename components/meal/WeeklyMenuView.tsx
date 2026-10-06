"use client";

/**
 * AUTOMATISK UKESMENY – EDITORIELT REDESIGN (30.09.2026). Henrik: "Redesign
 * /ukesmeny slik at siden føles langt mer som CONVITE: premium, editorial,
 * rolig og stilren [...] Ukesmenyen skal IKKE genereres automatisk når
 * brukeren åpner siden." Fullstendig omskriving av v1/v1.1
 * (WeeklyMenuView.tsx), samme underliggende funksjonalitet:
 *
 * - Siden åpner alltid TOM (ingen forhåndsvalgt stil, ingen generert uke,
 *   ingen placeholder-kort) – "Lag ukesmenyen"-knappen er deaktivert til en
 *   stil er valgt, og genererer FØRST uken når man trykker på den.
 * - "Bytt ut" per dag og "Lag en ny uke" (regenerer innenfor valgt stil)
 *   er uendret i sin logikk, kun i visuelt uttrykk.
 * - Dagskortene er IKKE lenger RecipeCard (som viser kategori-badges,
 *   stjerner, favoritt-hjerte, beskrivelse) – Henrik: "Denne siden trenger
 *   først og fremst å kommunisere: DAG → RETT → TID." Egen, minimal
 *   markering bygget direkte her i stedet: dag-label → bilde → oppskrift
 *   (serif) → tid → bytt ut, ingen kort-boks/border/skygge rundt.
 *
 * AKTIV UKE, MED ETT-SKUDDS "TILBAKE"-STØTTE (28.09.2026, se filheaderen
 * i lib/hooks/useActiveWeeklyMenu.ts for hele resonnementet + en runde 2
 * med feilretting) – Henrik: "når jeg trykker på en av oppskriftene i
 * ukesmenyen, så er det ikke en tilbakeknapp tilbake til ukesmenyen [...]
 * man må kunne gå tilbake til ukesmenyen". Selve uken lever FORTSATT i
 * vanlig React-state (nullstilles ved enhver ny sidevisning, akkurat som i
 * det opprinnelige 30.09.2026-redesignet) – MEN rett før man navigerer
 * bort via en oppskrift-lenke (onClick under) skrives et
 * "returøyeblikksbilde" til sessionStorage, som denne siden leser OG
 * SLETTER med det samme ved neste mount. Første forsøk (samme dag) holdt
 * uken løpende synket mot sessionStorage i stedet – Henrik oppdaget at det
 * gjeninnførte akkurat den "gjenåpner forrige uke automatisk"-følelsen han
 * opprinnelig ba om å fjerne, bare nå trigget av ALL navigering innenfor
 * samme fane (også forsiden og inn igjen), ikke bare oppskrift-og-tilbake.
 * Ett-skudds-konsumering løser dette presist: uken er der KUN rett etter
 * en tilbake-reise, ikke ved noen annen senere sidevisning.
 *
 * "LAGRE UKESMENY" + "SE LAGREDE UKESMENYER" (28.09.2026, Henrik: "jeg
 * mener også å ha en 'lagre ukesmeny' og 'se lagrede ukesmenyer'") –
 * speiler "Dine menyer"-mønsteret fra den manuelle/AI-baserte
 * menybyggeren (se lib/hooks/useSavedWeeklyMenus.ts sin filheader):
 * EKSPLISITT lagring (en egen "Lagre ukesmenyen"-knapp, ikke automatisk),
 * ekte localStorage (til forskjell fra den AKTIVE uken over), og en egen
 * oversiktsside (/ukesmeny/lagrede, se SavedWeeklyMenusList.tsx).
 *
 * DRA-FOR-Å-BYTTE DAGER (04.10.2026, Henrik: "flytte på rettene mellom
 * dagene, hvis jeg får burger på mandag, så kan jeg bytte den med den som
 * står på fredag feks, og at man da kan dra over selve segmentet med
 * bildet og tittel") – BYTTER to dager (A↔B), til forskjell fra
 * IngredientGroupsEditor.tsx sin dra-for-å-OMORDNE-en-liste (som flytter
 * ÉN vare til en ny posisjon og skyver resten). Dagene her er faste
 * POSISJONER (mandag er alltid først uansett), så riktig mental modell er
 * "bytt plass", ikke "flytt til ny rekkefølge".
 *
 * Bruker samme Pointer Events-mønster som IngredientGroupsEditor.tsx (IKKE
 * HTML5 sitt native draggable-API – se den filens filheader for hvorfor),
 * MEN uten en egen dra-håndtak-knapp: Henrik ba eksplisitt om at selve
 * bilde+tittel-segmentet (den eksisterende oppskrift-lenken) skal være
 * drahåndtaket. Det krever å skille et faktisk DRA fra et vanlig KLIKK (som
 * fortsatt skal navigere til oppskriften) på nøyaktig samme element:
 * `dragStartRef` lagrer startposisjon ved pointerdown, og først når
 * pointeren har beveget seg forbi DRAG_THRESHOLD_PX regnes det som en reell
 * drag (`didDragRef`) – under den terskelen er det fortsatt et klikk.
 * Lenkens egen onClick sjekker `didDragRef` og kaller `e.preventDefault()`
 * for å kansellere navigeringen KUN når gesten faktisk var en drag.
 *
 * FEILRETTET SAMME DAG (Henrik, med skjermbilde: "får ikke dratt noe som
 * helst") – lenken (<a>) og bildet inni (<img>, via next/image) er
 * NATIVT drag-bare i nettlesere helt uavhengig av Pointer Events-koden
 * over. Skjermbildet viste nettopp dette: nettleserens EGEN drag-spøkelse
 * av bildet, og URL-en i statuslinjen, akkurat som når man drar en vanlig
 * lenke – nettleserens innebygde lenke/bilde-drag vant kappestriden om
 * selve gesten før/i stedet for onPointerMove-logikken. Løsning:
 * `draggable={false}` på BÅDE Lenken og Image-komponenten under, pluss en
 * `onDragStart`-handler som kaller `e.preventDefault()` som et ekstra
 * sikkerhetsnett (draggable={false} skal i teorien være nok alene per
 * HTML-spesifikasjonen, men kostet ingenting å legge til begge).
 *
 * KUN mus/penn i praksis (ingen `touchAction: "none"` lagt til, til
 * forskjell fra IngredientGroupsEditor.tsx sitt drahåndtak) – dagene står i
 * ÉN kolonne på mobil (se grid-oppsettet under), så en dra-gest her ville
 * vært i nøyaktig samme retning som vanlig vertikal scrolling og dermed
 * stride mot den på touch. "Bytt ut" under hvert bilde er fortsatt den
 * mobilvennlige måten å endre én enkelt dag på – dra-og-bytt er et
 * tilleggsgrep for mus/trackpad på større skjermer.
 */
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { useActiveWeeklyMenu, stashActiveWeeklyMenu, clearStashedActiveWeeklyMenu } from "@/lib/hooks/useActiveWeeklyMenu";
import { useSavedWeeklyMenus } from "@/lib/hooks/useSavedWeeklyMenus";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { formatMinutes, localizedTitle } from "@/lib/utils/format";
import {
  ShoppingBagIcon,
  ClockIcon,
  LeafIcon,
  UsersIcon,
  SparklesIcon,
  BookIcon,
  CheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import type { SearchableRecipe } from "@/lib/utils/search";
import {
  WEEKLY_MENU_STYLE_DEFINITIONS,
  VARIED_CHOICE,
  type WeeklyMenuChoice,
} from "@/lib/kitchen-intelligence/weekly-menu-styles";
import { t, type Lang, type DictKey } from "@/lib/i18n";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const MIN_RECIPES = DAY_KEYS.length;

const STYLE_CHOICES: { id: WeeklyMenuChoice; labelKey: DictKey }[] = [
  { id: VARIED_CHOICE, labelKey: "weeklyMenu.style.variert" },
  ...WEEKLY_MENU_STYLE_DEFINITIONS,
];

// Samme ikonsett som components/admin/WeeklyMenuAdminPicker.tsx – "variert"
// har bevisst ingen ikon (den er ikke en admin-satt kategori). Henrik:
// "Behold gjerne små, diskrete ikoner på kategoriene" – uendret fra
// v1.1, kun selve pille-stylingen er dempet i redesignet under.
const STYLE_ICONS: Partial<Record<WeeklyMenuChoice, typeof ClockIcon>> = {
  sunt_enkelt: LeafIcon,
  rask: ClockIcon,
  familievennlig: UsersIcon,
  litt_ekstra: SparklesIcon,
};

// "Kun vegetar" (01.10.2026, Henrik: "på ukesmeny bør man egentlig ha en
// knapp 'Kun vegetar'") – delt ut i en egen funksjon fremfor å duplisere
// stil-filtreringen inline to steder (pool-useMemo og handlePickStyle under),
// slik moods/courses-filtrering andre steder på siten allerede gjør det.
// Filtrerer på isVegetarian (admin-satt bryter, migrasjon 0027, se
// WeeklyMenuAdminPicker.tsx) OVENPÅ stil-filtreringen, ikke i stedet for den
// – "Kun vegetar" er ment å kunne kombineres med enhver stil, inkludert
// "Variert".
function computePool(
  recipes: SearchableRecipe[],
  style: WeeklyMenuChoice | null,
  vegetarianOnly: boolean,
): SearchableRecipe[] {
  if (style === null) return [];
  const styleFiltered =
    style === VARIED_CHOICE ? recipes : recipes.filter((r) => (r.weeklyMenuStyles ?? []).includes(style));
  return vegetarianOnly ? styleFiltered.filter((r) => r.isVegetarian) : styleFiltered;
}

// Fisher-Yates – brukt BÅDE til å stokke rekkefølgen på kategoriene og til
// å stokke hver kategoris egen liste i pickRandomWeek under, se filheaderen
// der for hvorfor dette er trukket ut som sin egen, gjenbrukbare funksjon.
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Kategori-spredning i ukesmenyen (03.10.2026, Henrik: "fikk jeg en
// vegetar, og FIRE fiskeretter [...] den MÅ velge mer ut i fra kategori så
// den ikke velger 4 i den samme kategorien"). Ren tilfeldig shuffle+slice
// (den opprinnelige implementasjonen) tar ikke hensyn til at poolen typisk
// har noen få oppskrift-kategorier (Fisk, Kjøtt, Vegetar, osv.) representert
// med svært ulikt antall oppskrifter – med nok ren flaks/uflaks endte man
// opp med fire-fem retter fra samme kategori på én uke.
//
// Løsningen er en runde-robin over KATEGORIER i stedet for over enkelt-
// oppskrifter: grupper poolen på recipe.category?.id (oppskrifter uten
// kategori havner i en egen "uncategorized"-bøtte, ikke utelatt), stokk
// BÅDE rekkefølgen på kategoriene og hver kategoris egen liste, og plukk så
// maks ÉN rett per kategori per runde før noen kategori får lov til en ny.
// Det gir maksimal spredning når poolen har nok kategorier til å dekke
// MIN_RECIPES uten gjentakelse, og faller naturlig tilbake til en ny runde
// (og dermed en reell gjentakelse) KUN når poolen rett og slett ikke har
// nok ulike kategorier – man får uansett alltid MIN_RECIPES retter tilbake
// så lenge poolen selv har nok oppskrifter totalt, akkurat som før.
function pickRandomWeek(pool: SearchableRecipe[], excludeIds: string[] = []): string[] {
  const candidates = pool.filter((r) => !excludeIds.includes(r.id));

  const byCategory = new Map<string, SearchableRecipe[]>();
  for (const recipe of candidates) {
    const key = recipe.category?.id ?? "uncategorized";
    const bucket = byCategory.get(key);
    if (bucket) bucket.push(recipe);
    else byCategory.set(key, [recipe]);
  }
  const categoryBuckets = shuffle([...byCategory.values()]).map((bucket) => shuffle(bucket));

  const picked: SearchableRecipe[] = [];
  let pickedSomethingThisRound = true;
  while (picked.length < MIN_RECIPES && pickedSomethingThisRound) {
    pickedSomethingThisRound = false;
    for (const bucket of categoryBuckets) {
      if (picked.length >= MIN_RECIPES) break;
      const next = bucket.shift();
      if (next) {
        picked.push(next);
        pickedSomethingThisRound = true;
      }
    }
  }

  return picked.map((r) => r.id);
}

export function WeeklyMenuView({ recipes, lang }: { recipes: SearchableRecipe[]; lang: Lang }) {
  // Kalt "activeWeek" (ikke "active") for å unngå navnekollisjon med den
  // lokale `active`-variabelen inne i STYLE_CHOICES-map-en lenger ned
  // (er choice.id den VALGTE stilen) – to helt ulike ting som tilfeldigvis
  // begge naturlig heter "active".
  const [activeWeek, setActiveWeek] = useActiveWeeklyMenu();
  const { style, recipeIds, vegetarianOnly } = activeWeek;
  const { addFromRecipe } = useShoppingList();
  const { saveMenu } = useSavedWeeklyMenus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  // Egen, LOKAL "lagret"-indikator (ikke utledet av useSavedWeeklyMenus,
  // til forskjell fra MealView.tsx sin `saved`, som slår opp mealId i et
  // register) – en lagret ukesmeny får sin egen, NYE id ved hver lagring
  // (se saveMenu i useSavedWeeklyMenus.ts), det finnes ingen stabil id for
  // "denne aktive uken" å slå opp mot. Nullstilles i alle handlinger som
  // endrer selve uken (samme mønster som `added` over), slik at
  // "Lagret ✓"-meldingen ikke blir stående og lyve om en uke som faktisk
  // er endret siden sist lagring.
  const [savedJustNow, setSavedJustNow] = useState(false);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const pool = useMemo(() => computePool(recipes, style, vegetarianOnly), [recipes, style, vegetarianOnly]);

  const hasEnoughRecipes = style !== null && pool.length >= MIN_RECIPES;
  const generated = recipeIds.length > 0;

  function handlePickStyle(next: WeeklyMenuChoice) {
    if (next === style) return;
    setAdded(false);
    // (06.10.2026) – se filheaderen ved clearStashedActiveWeeklyMenu i
    // useActiveWeeklyMenu.ts: uken endres her, så et evt. stashet
    // øyeblikksbilde av den FORRIGE uken (fra handleAddToShoppingList
    // under) er ikke lenger gyldig og skal ikke kunne dukke opp igjen ved
    // et senere, urelatert besøk.
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    const nextPool = computePool(recipes, next, vegetarianOnly);
    // Kun regenerer AUTOMATISK ved stil-bytte hvis besøkende allerede har
    // generert en uke denne økten (da forventer man at "bytt type" faktisk
    // bytter ut det man ser). Har man IKKE trykket "Lag ukesmenyen" ennå,
    // skal det fortsatt kreve et eksplisitt trykk – se filheaderen.
    const nextRecipeIds = generated ? (nextPool.length >= MIN_RECIPES ? pickRandomWeek(nextPool) : []) : recipeIds;
    setActiveWeek({ style: next, recipeIds: nextRecipeIds, vegetarianOnly });
  }

  // "Kun vegetar" (01.10.2026) – samme "regenerer kun hvis man allerede har
  // generert en uke"-logikk som handlePickStyle over, se kommentaren der.
  function handleToggleVegetarianOnly() {
    const next = !vegetarianOnly;
    setAdded(false);
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    const nextPool = computePool(recipes, style, next);
    const nextRecipeIds = generated ? (nextPool.length >= MIN_RECIPES ? pickRandomWeek(nextPool) : []) : recipeIds;
    setActiveWeek({ style, recipeIds: nextRecipeIds, vegetarianOnly: next });
  }

  function handleGenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: pickRandomWeek(pool), vegetarianOnly });
  }

  function handleRegenerate() {
    if (!hasEnoughRecipes) return;
    setAdded(false);
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: pickRandomWeek(pool), vegetarianOnly });
  }

  function handleSwapDay(index: number) {
    const candidates = pool.filter((r) => !recipeIds.includes(r.id));
    if (candidates.length === 0) return;
    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    const nextIds = [...recipeIds];
    nextIds[index] = replacement.id;
    setAdded(false);
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: nextIds, vegetarianOnly });
  }

  // --- Dra-for-å-bytte dager (04.10.2026) – se filheaderens eget avsnitt
  // for hele resonnementet. cardRefs: DOM-noden for hvert dagskort, nøkkel
  // = indeksen i recipeIds (0 = mandag osv.), brukt til å måle hvilket kort
  // pekeren befinner seg over akkurat nå (samme hit-test-teknikk som
  // reorderItemsForPointer i IngredientGroupsEditor.tsx, men mot
  // getBoundingClientRect()-REKTANGELET til hvert kort i stedet for bare
  // midtpunktet på Y-aksen, siden kortene her ligger side ved side
  // horisontalt på lg+, ikke bare stablet vertikalt).
  const cardRefs = useRef<Map<number, HTMLAnchorElement>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const DRAG_THRESHOLD_PX = 6;

  function swapDays(a: number, b: number) {
    if (a === b) return;
    const nextIds = [...recipeIds];
    [nextIds[a], nextIds[b]] = [nextIds[b], nextIds[a]];
    setAdded(false);
    clearStashedActiveWeeklyMenu();
    setSavedJustNow(false);
    setActiveWeek({ style, recipeIds: nextIds, vegetarianOnly });
  }

  function handleCardPointerDown(e: ReactPointerEvent<HTMLAnchorElement>, index: number) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
    // Pointer capture tas FØR vi vet om dette blir en reell drag – helt
    // nødvendig for å fortsatt få pointermove/pointerup selv om pekeren
    // beveger seg utenfor selve lenke-elementet underveis (akkurat som
    // IngredientGroupsEditor.tsx sitt drahåndtak).
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleCardPointerMove(e: ReactPointerEvent<HTMLAnchorElement>, index: number) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!didDragRef.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      didDragRef.current = true;
      setDraggingIndex(index);
    }
    e.preventDefault();

    let target: number | null = null;
    for (const [i, el] of cardRefs.current) {
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        target = i;
        break;
      }
    }
    setDropTargetIndex(target);
  }

  function handleCardPointerEnd(e: ReactPointerEvent<HTMLAnchorElement>, index: number) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (didDragRef.current && dropTargetIndex !== null) {
      swapDays(index, dropTargetIndex);
    }
    dragStartRef.current = null;
    setDraggingIndex(null);
    setDropTargetIndex(null);
    // didDragRef nullstilles IKKE her – den leses av Lenkens egen onClick
    // (som fyres RETT ETTER pointerup) for å kansellere navigeringen når
    // gesten faktisk var en drag, se filheaderen. Nullstilles der i stedet.
  }

  function handleSaveMenu() {
    if (!style || recipeIds.length === 0) return;
    saveMenu(style, recipeIds);
    setSavedJustNow(true);
  }

  async function handleAddToShoppingList() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMealShoppingIngredients(recipeIds);
      const dataById = new Map(data.map((d) => [d.recipeId, d]));
      for (const id of recipeIds) {
        const recipeData = dataById.get(id);
        if (!recipeData || recipeData.baseServings <= 0) continue;
        addFromRecipe(recipeData.ingredientGroups, recipeData.title, 1, {
          recipeId: recipeData.recipeId,
          slug: recipeData.slug,
          servings: recipeData.baseServings,
        });
      }
      setAdded(true);
      // (06.10.2026) Henrik, etter at "Se listen →"-lenkens egen
      // onClick={stashActiveWeeklyMenu(...)} viste seg IKKE å være nok
      // alene ("da må fortsatt ukesmenyen være synlig når man går
      // tilbake, nå er den tom", gjentatt selv etter den fiksen) –
      // skriver øyeblikksbildet HER i stedet, idet uken faktisk BLIR
      // lagt i handlelisten, fremfor å stole på nøyaktig det ene senere
      // klikket på "Se listen →" som eneste utløser. Se filheaderen ved
      // clearStashedActiveWeeklyMenu i useActiveWeeklyMenu.ts for hvordan
      // dette likevel holdes ETT-SKUDDS og ferskt (ikke en løpende synk).
      stashActiveWeeklyMenu({ style, recipeIds, vegetarianOnly });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealShopping.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-faint">{t(lang, "weeklyMenu.styleHeading")}</p>
      {/* "Se lagrede ukesmenyer" (28.09.2026) – FEILRETTET rett etter
          første forsøk: lå opprinnelig helt til høyre i en justify-between-
          rad ved siden av selve stil-overskriften, som i praksis satte den
          rett oppå råvare-komposisjonen øverst til høyre i bakgrunnsbildet
          (public/images/weekly-menu.jpg) – nesten uleselig lys, tynn tekst
          mot et travelt fotografi der (Henrik, med skjermbilde: "hvor er
          'lagrede ukesmenyer'?" – fant den rett og slett ikke). Flyttet ned
          til å stå i SAMME rad som stil-pillene under i stedet (venstre-
          justert, ikke justify-between) – akkurat den sonen av bildet er
          bevisst mørk/tom (se objectPosition-justeringen i
          app/ukesmeny/page.tsx, 28.09.2026, "FLYTT BILDET LENGER TIL
          HØYRE"), som allerede er bekreftet leselig av knappene/pillene som
          står der. Vises uansett (ikke bare når en uke er generert), siden
          en besøkende skal kunne hoppe rett til lagrede uker uten å måtte
          velge stil/generere først. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-2">
          {STYLE_CHOICES.map((choice) => {
            const Icon = STYLE_ICONS[choice.id];
            const active = choice.id === style;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handlePickStyle(choice.id)}
                aria-pressed={active}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-clay/50 bg-clay/10 text-clay-dark"
                    : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t(lang, choice.labelKey)}
              </button>
            );
          })}
        </div>

        <Link
          href="/ukesmeny/lagrede"
          className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "weeklyMenu.savedMenusLink")}
        </Link>
      </div>

      {/* "Kun vegetar" (01.10.2026, Henrik: "på ukesmeny bør man egentlig ha
          en knapp 'Kun vegetar' [...] litt utenfor, så man kan få retter i
          de andre kategoriene fortsatt, men som er vegetar"). FEILRETTET
          (01.10.2026, runde 2) – første forsøk satte den som en pille RETT
          VED stil-pillene over, bare skilt med en loddrett strek. Henrik:
          "det ser ut som en egen stil når den er rett ved de andre" – en
          strek alene holdt ikke når formen (rund pille) var identisk med
          stil-knappene. Flyttet derfor til en HELT EGEN linje under
          stilvalget, OG byttet til en helt annen visuell form (en
          avkrysningsboks, ikke en pille-knapp), slik at den ikke kan
          forveksles med et sjette stilvalg uansett skjermbredde. Filtrerer
          på isVegetarian (admin-satt bryter, migrasjon 0027) OVENPÅ den
          valgte stilen (inkl. "Variert"), erstatter den aldri – se
          computePool() over. */}
      <label className="mt-4 inline-flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
        <input
          type="checkbox"
          checked={vegetarianOnly}
          onChange={handleToggleVegetarianOnly}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={clsx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            vegetarianOnly ? "border-olive bg-olive text-cream" : "border-line-strong bg-cream text-transparent",
          )}
        >
          <CheckIcon className="h-3 w-3" />
        </span>
        <LeafIcon className="h-3.5 w-3.5 text-olive" />
        {t(lang, "weeklyMenu.vegetarianOnly")}
      </label>

      {/* TOM STARTTILSTAND – ingen retter, ingen tomme kort. Kun knappen
          (deaktivert til en stil er valgt), eller en melding hvis den
          valgte stilen rett og slett ikke har nok merkede oppskrifter ennå
          (se /admin/ukesmeny). Negativ plass i stedet for placeholders. */}
      {!generated && (
        <div className="mt-8">
          {style !== null && !hasEnoughRecipes ? (
            <p className="max-w-md text-sm text-ink-soft">{t(lang, "weeklyMenu.notEnoughRecipes", { count: MIN_RECIPES })}</p>
          ) : (
            <Button variant="primary" disabled={!style} onClick={handleGenerate}>
              {t(lang, "weeklyMenu.generate")} →
            </Button>
          )}
        </div>
      )}

      {generated && (
        <>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {!added ? (
              <Button variant="primary" onClick={handleAddToShoppingList} disabled={loading}>
                <ShoppingBagIcon className="h-4 w-4" />
                {loading ? t(lang, "weeklyMenu.addLoading") : `${t(lang, "weeklyMenu.addButton")} →`}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-olive-dark">{t(lang, "weeklyMenu.addDone")}</span>
                {/* (06.10.2026) Ingen ?fromWeeklyMenu=1 lenger – Henrik:
                    "uansett om vi har lagt en ukesmeny i handlelista, så
                    står det ALLTID 'tilbake til ukesmenyen' inne på
                    handlelista, uansett om man går inn via handlelista
                    eller senere". BackToWeeklyMenuLink
                    (components/meal/BackToWeeklyMenuLink.tsx) avgjør nå
                    SELV om tilbakelenken skal vises, ved å spørre
                    handlelisten direkte – ingen URL-parameter å sette her
                    lenger (se filheaderen der for hele resonnementet).
                    onClick={stashActiveWeeklyMenu(activeWeek)} er bevisst
                    BEHOLDT som en harmløs, redundant sikring ved siden av
                    den egentlige skrivingen i handleAddToShoppingList
                    over – se filheaderen ved clearStashedActiveWeeklyMenu
                    i useActiveWeeklyMenu.ts. */}
                <Link
                  href="/handleliste"
                  className="font-medium text-clay hover:text-clay-dark"
                  onClick={() => stashActiveWeeklyMenu(activeWeek)}
                >
                  {t(lang, "weeklyMenu.viewList")} →
                </Link>
              </div>
            )}

            {/* "Lagre ukesmenyen" (28.09.2026) – sekundær handling ved
                siden av "Legg uka i handlelisten", samme
                ikon+farge-mønster som MealView.tsx sin "Lagre menyen"
                (BookIcon, text-clay, ingen understrek – fargen ER
                signalet). `savedJustNow` nullstilles av ENHVER endring av
                selve uken over (bytt dag/stil, ny uke), se merknaden ved
                state-deklarasjonen. */}
            {!savedJustNow ? (
              <button
                type="button"
                onClick={handleSaveMenu}
                className="flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-dark"
              >
                <BookIcon className="h-4 w-4" />
                {t(lang, "weeklyMenu.save")}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-clay">
                <CheckIcon className="h-4 w-4" />
                {t(lang, "weeklyMenu.savedLabel")}
              </div>
            )}

            <button
              type="button"
              onClick={handleRegenerate}
              className="text-sm font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "weeklyMenu.regenerate")}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

          {/* Dra-for-å-bytte-hint (04.10.2026) – `hidden lg:block` fordi
              selve funksjonen kun er mus/penn i praksis (se filheaderens
              "KUN mus/penn"-avsnitt), og lg er nøyaktig samme brytningspunkt
              som rutenettet under går fra én kolonne (stablet, ingen
              dra-støtte) til fem kolonner side ved side (hvor dra faktisk
              virker). Speilvendt mobil-hint (`lg:hidden`) peker i stedet på
              flytt opp/ned-pilene, se disse sin egen kommentar lenger ned. */}
          <p className="mt-6 hidden text-xs text-ink-faint lg:block">{t(lang, "weeklyMenu.dragHint")}</p>
          <p className="mt-6 text-xs text-ink-faint lg:hidden">{t(lang, "weeklyMenu.movePillsHint")}</p>

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-6">
            {recipeIds.map((id, index) => {
              const recipe = byId.get(id);
              if (!recipe) return null;
              const dayKey = DAY_KEYS[index];
              const dayLabel = t(lang, `weeklyMenu.${dayKey}`);
              const canSwap = pool.some((r) => !recipeIds.includes(r.id));
              return (
                <div key={`${dayKey}-${id}`} className={clsx(index > 0 && "lg:border-l lg:border-line lg:pl-6")}>
                  <p className="text-xs uppercase tracking-wide text-ink-faint">{dayLabel}</p>

                  {/* isLoggedIn/hjerte er bevisst droppet her – se
                      filheaderen: dette skal kommunisere dag → rett → tid,
                      ikke gjenta hele oppskriftskort-UI-et.
                      ?fromWeeklyMenu=1 (28.09.2026) – samme mønster som
                      MealView.tsx sin ?fromMealId=<id> (se filheaderen i
                      app/oppskrifter/[slug]/page.tsx): lar oppskriftssiden
                      vise en "Tilbake til ukesmenyen"-lenke i stedet for
                      den generelle "Alle oppskrifter". Ukesmenyen trenger
                      ingen id i selve param-verdien (kun én AKTIV uke om
                      gangen, se useActiveWeeklyMenu.ts), derfor holder et
                      enkelt flagg.
                      onClick={stashActiveWeeklyMenu(...)} (28.09.2026,
                      runde 2 – se filheaderen øverst i denne filen og i
                      useActiveWeeklyMenu.ts) – skriver ETT-SKUDDS
                      returøyeblikksbildet RETT FØR selve navigeringen til
                      oppskriften skjer, i stedet for å holde uken løpende
                      synket mot sessionStorage (det ga en uheldig
                      bieffekt: uken ble husket ved ALL navigering i samme
                      fane, ikke bare denne ene tilbake-reisen).

                      DRA-FOR-Å-BYTTE (04.10.2026) – se filheaderens eget
                      avsnitt. Samme lenke er NÅ også drahåndtaket: onClick
                      kansellerer navigeringen kun når didDragRef sier at
                      gesten faktisk var en drag, ikke et vanlig klikk. */}
                  <Link
                    ref={(el) => {
                      if (el) cardRefs.current.set(index, el);
                      else cardRefs.current.delete(index);
                    }}
                    href={`/oppskrifter/${recipe.slug}?fromWeeklyMenu=1`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      if (didDragRef.current) {
                        e.preventDefault();
                        didDragRef.current = false;
                        return;
                      }
                      stashActiveWeeklyMenu(activeWeek);
                    }}
                    onPointerDown={(e) => handleCardPointerDown(e, index)}
                    onPointerMove={(e) => handleCardPointerMove(e, index)}
                    onPointerUp={(e) => handleCardPointerEnd(e, index)}
                    onPointerCancel={(e) => handleCardPointerEnd(e, index)}
                    className={clsx(
                      "group mt-3 block cursor-grab select-none rounded-lg transition-[opacity,box-shadow] active:cursor-grabbing",
                      draggingIndex === index && "relative z-10 opacity-60 shadow-card",
                      dropTargetIndex === index && draggingIndex !== index && "ring-2 ring-clay ring-offset-2 ring-offset-cream",
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
                      {recipe.heroImageUrl && (
                        <Image
                          src={recipe.heroImageUrl}
                          alt={recipe.heroImageAlt || localizedTitle(recipe, lang)}
                          fill
                          draggable={false}
                          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-4 font-serif text-sm text-ink transition-colors group-hover:text-clay-dark sm:text-base">
                      {localizedTitle(recipe, lang)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">{formatMinutes(recipe.totalTimeMinutes, lang)}</p>
                  </Link>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwapDay(index)}
                      disabled={!canSwap}
                      aria-label={t(lang, "weeklyMenu.swapAria", { day: dayLabel })}
                      className="text-xs text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t(lang, "weeklyMenu.swap")}
                    </button>

                    {/* Flytt opp/ned (04.10.2026, touch-erstatning for
                        dra-og-bytt) – bytter posisjon med dagen over/under,
                        samme swapDays-funksjon som selve drahåndteringen
                        over bruker. KUN synlig under lg (lg:hidden) – speilvendt
                        av dragHint-teksten (hidden lg:block): fra lg har man
                        drag i stedet, og piler ville vært overflødige der. */}
                    <div className="flex items-center gap-1 lg:hidden">
                      <button
                        type="button"
                        onClick={() => swapDays(index, index - 1)}
                        disabled={index === 0}
                        aria-label={t(lang, "weeklyMenu.moveUpAria", { day: dayLabel })}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => swapDays(index, index + 1)}
                        disabled={index === recipeIds.length - 1}
                        aria-label={t(lang, "weeklyMenu.moveDownAria", { day: dayLabel })}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-cream-dark hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
