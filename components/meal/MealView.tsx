"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import {
  MEAL_OCCASION_LABELS,
  mealSessionExists,
  sortSlotsByRole,
  type ExistingMealCourseSlot,
} from "@/lib/kitchen-intelligence";
import { MealShoppingListSection } from "@/components/meal/MealShoppingListSection";
import { MealTimelineSection } from "@/components/meal/MealTimelineSection";
import { EveningExperience } from "@/components/meal/EveningExperience";
import { MultiCookMode } from "@/components/meal/MultiCookMode";
import { CheckIcon, PlayIcon, BookIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/config";
import { t, type Lang } from "@/lib/i18n";

/**
 * Viser/redigerer én bygget MealSession – landingssiden en besøkende havner
 * på etter "Gå videre" i MealBuilder.tsx/ManualMealBuilder.tsx (se der for
 * hvordan en meny faktisk blir til). Rent klientside/localStorage, samme
 * som resten av Kitchen Intelligence-fundamentet – ingen database involvert.
 *
 * "Finnes ikke"-tilstanden sjekkes via mealSessionExists(session) (IKKE "er
 * slots tom", og IKKE lenger useMealSessionIndex – se OMLAGT-avsnittet
 * under), fordi en tom, men FAKTISK BYGGET meny (brukeren fjernet alle
 * forslagene) ellers ville sett identisk ut som en id som aldri fantes –
 * `session.updatedAt` (satt av touch() i useMealSession.ts på enhver reell
 * endring) er signalet som skiller "bygget, men tom" fra "aldri bygget".
 *
 * OMLAGT 27.09.2026 – "LAGRE MENYEN" ER NÅ EN EGEN, EKSPLISITT HANDLING.
 * Henrik: "jeg vil ikke at alle menyer man går videre med skal lagres. det
 * må være en knapp man trykker på for å velge å lagre." Før dette ble
 * `useMealSessionIndex().addToIndex(mealId)` kalt AUTOMATISK inne i
 * menybyggernes handleSave, samtidig som selve menyen ble bygget – "gå
 * videre" OG "lagre til Dine menyer" var i praksis samme handling. Nå:
 * enhver bygget meny kan vises og redigeres her uansett (se
 * mealSessionExists over), men står IKKE i `useMealSessionIndex()` sitt
 * register (og dukker dermed ikke opp på /mine-menyer, SavedMealsList.tsx)
 * før den besøkende trykker "Lagre menyen"-lenken (plassering endret
 * 28.09.2026, se REDESIGNET-avsnittet under). `saved` (utledet av
 * `mealIds.includes(mealId)`) styrer om lenken viser "Lagre menyen" eller
 * en "Lagret"-bekreftelse med en "Fjern menyen"-lenke (samme
 * handling/tekst som fjern-knappen på /mine-menyer selv).
 *
 * REDESIGNET 27.09.2026 (3. runde – Henrik ga Claude en detaljert
 * designbrief, utarbeidet sammen med ChatGPT ut fra skjermbilder av denne
 * siden: "gir siden mer rotete og administrativ [...] Vi skal beholde
 * funksjonaliteten, men redesigne presentasjonen slik at følelsen blir:
 * 'Her er kvelden din.'"). Dropper den faste `lg:grid-cols-2`
 * MENY/PLANLEGG-KVELDEN-kolonne-layouten fra forrige runde (31.08.2026, se
 * historikken) til fordel for en vertikal, redaksjonell "kapittel"-struktur
 * – hvert kapittel er en egen gull-uppercase-eyebrow etterfulgt av
 * innholdet, atskilt med `border-t border-line pt-12`, samme mønster som
 * "GJØR DET TIL EN KVELD"-overgangen allerede brukte:
 *
 * 1. DIN MENY – eyebrow (mealPage.menuEyebrow) + den store tittelen
 *    (uendret). Beskrivelsen er ikke lenger et permanent synlig
 *    placeholder-felt: har menyen en beskrivelse vises den som ren,
 *    klikkbar tekst (klikk for å redigere); er den tom vises kun en
 *    diskret "+ Legg til beskrivelse"-lenke (mealPage.addDescription) som
 *    åpner feltet. Egen lokal `descriptionEditing`-state, IKKE lagret noe
 *    sted – kun UI-tilstand, selve teksten går fortsatt rett i
 *    session.description via samme setDescription som før.
 * 2. SELVE MENYEN – course-label er nå en liten gull-eyebrow (samme
 *    fargeformel som resten av gull-eyebrowene i denne filen, IKKE lenger
 *    ink-faint), rettenavnet er større (text-xl/2xl, opp fra text-lg/xl).
 *    "Finnes i oppskriftsboken"-teksten for eksisterende retter er fjernet
 *    helt (ren metadata uten funksjon – lenken til selve oppskriften sier
 *    allerede det samme). Porsjoner + "Fjern fra menyen" ligger nå bak en
 *    liten "Rediger"-lenke per rett (ny lokal `expandedSlotIds`-Set,
 *    IKKE lagret), i tråd med brief-ens prioritet
 *    course > rettnavn > redigeringskontroller. "Nytt forslag"-merket,
 *    forslagsbeskrivelsen og admin sin "Opprett som oppskrift"-lenke er
 *    UENDRET og fortsatt alltid synlige – reell informasjon, ikke
 *    administrativt grensesnitt.
 * 3. PLANLEGG KVELDEN – egen eyebrow + ny undertittel
 *    (mealPage.planSubtitle), samler spisetid/tidslinje, kokemodus-knappen
 *    (fortsatt DEN ene tydelige CTA-en) og "Legg i handlelisten" (nå full
 *    bredde i MealShoppingListSection.tsx, se filheaderen der – fortsatt
 *    tydelig sekundær, ikke gull) samt notatene. Alt vertikalt i én kolonne
 *    (ikke lenger en egen høyrekolonne ved siden av menyen).
 * 4. VINEN DIN – flyttet UT av "Planlegg kvelden"-kolonnen og opp som sitt
 *    eget kapittel, med chapter-eyebrowen hentet fra samme
 *    mealWineInput.heading-nøkkel MealWineInput.tsx selv brukte til å vise
 *    en intern overskrift – den interne overskriften/border-t-en er derfor
 *    fjernet fra MealWineInput.tsx selv (se filheaderen der), for å unngå
 *    en duplisert "Vinen din"-tekst rett over hverandre.
 * 5. GJØR DET TIL EN KVELD – URØRT, verken visuelt eller funksjonelt (brief-
 *    ens eksplisitte grense). Samme kode som før, kun flyttet til å følge
 *    rett etter det nye "Vinen din"-kapittelet i stedet for rett etter
 *    2-kolonne-gridet.
 *
 * Ingen ny funksjonalitet i denne runden – kun presentasjon/informasjons-
 * arkitektur. Alle eksisterende handlinger (tittel/beskrivelse/notater,
 * porsjoner, fjern rett, spisetid/tidslinje, kokemodus, handleliste, vin,
 * lagre/fjern menyen, print/PDF, tilbake-navigasjon) er uendret i hvordan
 * de fungerer, kun i hvor fremtredende de vises.
 *
 * ANLEDNING fjernet helt fra denne siden i en tidligere runde (samme dato) –
 * `session.occasion` kan fortsatt stå igjen på eldre, allerede lagrede
 * menyer og vises fortsatt i utskriftsoppsummeringen under, men det finnes
 * ikke lenger noe UI her for å SETTE den.
 *
 * Multi-oppskrift Cook Mode (MultiCookMode.tsx, 5.16/5.17) åpnes som et eget
 * fullskjerm-lag OVENPÅ denne siden (samme mønster som RecipeInteractive.tsx
 * sin `cookModeOpen`-boolean + betinget rendering av CookMode nederst i
 * treet) – se MultiCookMode.tsx sin filheader for den kryssrett-orkestrerte
 * modellen. Uendret av denne runden.
 *
 * DELING/UTSKRIFT: ren print-CSS-basert utskrifts-/PDF-visning
 * (`window.print()` + Tailwind sine `print:`-varianter), IKKE en delbar
 * lenke – MealSession lever kun i denne besøkendes egen nettleser
 * (localStorage). Trigger-knappen bodde tidligere øverst i
 * EveningExperience.tsx sitt (nå fjernede) modal-hode – siden den
 * komponenten ikke lenger har noe eget "hode", er utskrifts-lenken flyttet
 * hit, som en liten, tilbaketrukket tekstlenke ved siden av
 * "Tilbake til …"-lenken øverst på siden. Uendret av denne runden.
 *
 * REDESIGNET 28.09.2026 (4. runde – ny, større designbrief fra Henrik:
 * "Jeg vil nå redesigne hele siden «Din meny» + «Gjør det til en kveld»
 * slik at den får samme tydelige seksjonering og visuelle rytme som
 * forsiden til CONVITE"). Fra ÉN sammenhengende, mørk `max-w-3xl`-kolonne
 * (3. runde, se REDESIGNET-avsnittet over) TIL tre klare, fullbredde
 * makro-segmenter, samme "scene"-teknikk som forsiden (app/page.tsx)
 * allerede bruker (egen `<section>` per segment, hvert med sin egen
 * bakgrunn og sin egen indre `mx-auto max-w-*`-kolonne – se f.eks.
 * components/home/CookModeShowcase.tsx/MoodModeSection.tsx). Den tidligere
 * felles `max-w-3xl`-wrapperen som lå i app/meny/[id]/page.tsx er derfor
 * fjernet derfra for den innloggede visningen – hvert segment her eier nå
 * sin egen bredde/padding:
 *
 * 1. DIN MENY (mørk, standard sidebunn) – uendret innhold (topplinje,
 *    tittel/beskrivelse, retter), kun flyttet inn i sin egen
 *    `mx-auto max-w-3xl`-wrapper i STEDET for å arve den fra page.tsx, med
 *    en tydelig avsluttende pb (`pb-16 sm:pb-20`, samme mønster som
 *    FeaturedEditorial-wrapperen på forsiden) – selve fargeskiftet til
 *    segment 2 rett under ER den tydelige visuelle avslutningen (samme
 *    prinsipp som forsidens seksjoner, ingen ekstra dekorativ linje lagt
 *    til).
 * 2. PLANLEGG KVELDEN – NÅ en egen, full-bredde LYS seksjon (`bg-ink`,
 *    samme lyse token CookModeShowcase.tsx bruker for sin "lyse seksjon som
 *    bevisst bryter med den ellers mørke siden") – tidligere et mørkt
 *    kapittel i samme kolonne som resten. Kokemodus-knappen er ikke lenger
 *    full bredde ("absurd bred") – nå en kompakt, sentrert pille (samme
 *    gull-fylte `bg-clay text-cream`-stil, bare `inline-flex` i stedet for
 *    `w-full`). "Legg i handlelisten" er nå en diskré tekstlenke (samme
 *    behandling som "Vis tidslinje"), tydelig sekundær til kokemodus-
 *    knappen. MealTimelineSection.tsx/MealShoppingListSection.tsx er
 *    omfarget for denne lyse bunnen i egne commits – se deres filheadere.
 * 3. VINEN DIN – IKKE lenger sitt eget kapittel her. Flyttet inn i
 *    EveningExperience.tsx sitt "I GLASSET"-kapittel (se filheaderen der)
 *    – "vin brukeren allerede har" hører naturlig sammen med AI-ens egen
 *    vin-anbefaling for menyen, i stedet for å stå isolert i "Planlegg
 *    kvelden". `setWine` sendes nå ned som `onWineChange`-prop til
 *    EveningExperience i stedet for å brukes direkte her.
 * 4. GJØR DET TIL EN KVELD – nå sitt eget mørke "univers": en egen
 *    full-bredde `bg-paper`-seksjon (en anelse lysere enn sidens
 *    `bg-cream`-bunn, nok til å lese som et eget rom, samme prinsipp som
 *    brief-en ba om – "strukturert slik at et fullbredde bakgrunnsbilde kan
 *    legges til senere", IKKE noe bilde lagt til nå) som rommer BÅDE
 *    kapittel-inngangen (eyebrow + ny undertittel "Alt rundt bordet." +
 *    beskrivelseslinjen, uendret tekstinnhold, kun flyttet hit fra den
 *    smale `max-w-3xl`-kolonnen) OG selve EveningExperience.tsx – begge nå
 *    i samme `max-w-xl`-kolonnebredde som EveningExperience sine egne
 *    kapitler allerede brukte, for konsekvent venstrekant gjennom hele
 *    segmentet.
 *
 * Fortsatt ingen ny funksjonalitet i denne runden heller – samme prinsipp
 * som 3. runde (kun presentasjon/informasjonsarkitektur).
 *
 * BREDDE-RETTING 27.09.2026 (6. runde – Henrik, med to skjermbilder av den
 * levende siden: "det ser ut som du har lagd en sperre sånn at tekst ikke
 * kan gå ut på sidene på siden, hvorfor det? du må fjerne sperren, da kan
 * også 'start kokemodus' ligge til høyre i 'Planlegg kvelden' boksen, og
 * ikke litt nede til høyre, og tittelen får plassen den trenger"). To ting
 * rettet:
 *
 * 1. Den store tittel-`<input>`en i DIN MENY var (siden 3. runde) fanget i
 *    en `max-w-3xl` (768px) kolonne – på en bred skjerm ble resten av
 *    vinduet stående tomt mens selve tittelen (som ALDRI bryter linje, en
 *    `<input>` kan strukturelt ikke wrappe som et avsnitt) ble klippet/
 *    scrollet inni det trange feltet i stedet for å få bruke plassen som
 *    faktisk fantes. DIN MENY-segmentets wrapper er derfor utvidet fra
 *    `max-w-3xl` til `max-w-5xl` – selve tittel-inputen er allerede
 *    `w-full`, så den strekker seg automatisk med den bredere kolonnen.
 *    Retteliste-innholdet under (course/rettnavn/rediger-rad) er fortsatt
 *    lesbart i denne bredden – det er enkeltlinjer, ikke løpende brødtekst.
 * 2. PLANLEGG KVELDEN fikk samme `max-w-5xl`-utvidelse, OG selve innholdet
 *    er lagt om fra én sentrert kolonne til en to-kolonners rad fra `lg`
 *    og oppover: venstre kolonne = eyebrow/undertittel/spisetid-tidslinje,
 *    høyre kolonne = "Start kokemodus"-knappen (rett ved siden av, ikke
 *    lenger sentrert et stykke nedenfor). "Legg i handlelisten" ligger
 *    fortsatt sentrert under hele raden, som den diskré sekundærhandlingen
 *    den er. Under `lg` er rekkefølgen uendret (stables som før).
 *
 * TITTEL-WRAP 27.09.2026 (7. runde – Henrik testet i selve appen, ikke i
 * en print-forhåndsvisning som jeg først antok feilaktig: "hva snakker du
 * om? jeg bruker appen på macen. det er ingen forskjell! [...] du kan også
 * gjøre det mulig at tittelen går over to linjer, da må den ikke være så
 * bred"). Roten til problemet var IKKE bredden i seg selv, men at tittelen
 * lå i en `<input type="text">` – et HTML-element som strukturelt ALDRI
 * kan brekke linje, uansett hvor bred kolonnen rundt den er (kun bli
 * bredere eller klippe/scrolle internt). Byttet derfor til en auto-
 * voksende `<textarea rows={1}>` (høyden justeres i en `useEffect`/
 * `onInput` ut fra `scrollHeight`, Enter fanges opp og gir ikke linjeskift
 * – kun naturlig automatisk wrap når teksten ikke får plass, ingen manuell
 * `\n` lagres i dataene) – nå kan en lang tittel brekke over to (eller
 * flere) linjer akkurat som et vanlig avsnitt. Siden tittelen nå kan
 * wrappe i stedet for å kreve stadig mer bredde, er DIN MENY/PLANLEGG
 * KVELDEN-kolonnene samtidig dempet noe ned igjen, fra forrige rundes
 * `max-w-5xl` til `max-w-4xl` – fortsatt tydelig bredere enn opprinnelige
 * `max-w-3xl`, men ikke så ekstremt at det ble unaturlig for
 * retteliste/tidslinje-radene.
 *
 * "TILBAKE"-LENKE 29.09.2026 (9. runde – Henrik: "jeg savner noen
 * 'tilbake' knapper på siden som tar deg tilbake ett hakk, rett dit du kom
 * fra. feks kan man trykke på hver rett i menyen, om jeg gjør det så
 * ønsker jeg en knapp som tar meg rett tilbake til menyen uten at jeg
 * kommer helt ut av det"). Begge lenkene herfra til en oppskrift (retten i
 * "Tilbake til …"-lenken øverst OG hver rett i selve retteliste-kapittelet
 * under) sender nå med `?fromMealId=<mealId>` – se
 * app/oppskrifter/[slug]/page.tsx, som viser en "Tilbake til menyen"-lenke
 * (i stedet for den generelle "Alle oppskrifter") øverst på oppskriftssiden
 * når den parameteren finnes, rett tilbake til DENNE menyen.
 *
 * REDESIGNET 29.09.2026 (22. runde – stor, detaljert designbrief fra
 * Henrik: "Området fungerer, men føles akkurat nå litt for mye som en
 * administrativ tekstliste på svart bakgrunn. Jeg vil at dette skal føles
 * som åpningen på en kuratert middagsmeny [...] 'Her er kvelden du nettopp
 * har satt sammen.' Ikke: 'Her er tre oppskrifter du har valgt.'"). Ren
 * presentasjon/informasjonsarkitektur i DIN MENY-kapittelet – samme
 * prinsipp som 3./4. runde over, ingen ny funksjonalitet, ingen endret
 * data/logikk:
 *
 * 1. TITTEL/BESKRIVELSE – eyebrow-en fikk samme tracking/størrelse-formel
 *    som "GJØR DET TIL EN KVELD" sin kapittel-inngang lenger ned
 *    (`tracking-[0.35em] sm:text-sm`, se MealView.tsx sitt eget
 *    bakgrunnsbilde-avsnitt over og EveningExperience.tsx), for at
 *    "kvelden" skal føles som ÉN sammenhengende redaksjonell reise fra
 *    toppen. Selve tittel-/beskrivelse-blokken (og retteliste-kolonnen
 *    under) er nå i en egen, litt smalere `max-w-3xl`-lesekolonne INNI det
 *    ellers bredere `max-w-4xl`-segmentet (som fortsatt eies av
 *    handlingsgruppen øverst til høyre, se punkt 3) – en bevisst
 *    magasin-aktig tekstspalte i stedet for at tittel/retter strekker seg
 *    over hele bredden. IKKE en retur til den opprinnelige `max-w-3xl`-
 *    sperren fra 6. runde (som var et ekte problem: en `<input>` som
 *    strukturelt ikke kunne brekke linje i det hele tatt) – siden 7. runde
 *    er tittelen en auto-voksende `<textarea>` som wrapper akkurat som et
 *    vanlig avsnitt når den ikke får plass, nøyaktig det Henrik selv ba om
 *    da ("du kan også gjøre det mulig at tittelen går over to linjer, da
 *    må den ikke være så bred"). Mer luft lagt til over/under selve
 *    tittelen (`mt-5 sm:mt-6` fra eyebrow, samme fra tittel til
 *    beskrivelse) i stedet for den tette `space-y-3`-stablingen.
 * 2. RETTENE – `divide-line` (en tydeligere strek) byttet til
 *    `divide-ink/10`, samme hårfine skillelinje-token EveningExperience.tsx
 *    sine kapitler allerede bruker (PÅ BORDET-strekene, Stemning/Musikk-
 *    streken) – konsekvent "svært subtil skillelinje" gjennom hele siden i
 *    stedet for to ulike strek-språk. Course-labelen (FORRETT/HOVEDRETT/
 *    DESSERT) er justert til samme `text-[0.7rem]`/`tracking-[0.3em]`-
 *    formel som selve `Eyebrow`-komponenten i EveningExperience.tsx bruker
 *    (var `text-xs`/`tracking-[0.25em]`, en liten, men reell forskjell fra
 *    resten av siden). Mer luft per rett (`py-6` → `py-7 sm:py-8`,
 *    `gap-1.5` → `gap-2`). HOVEDRETTEN (`slot.role === "main"`) får "ørlite
 *    mer visuell tyngde enn forrett og dessert" (Henrik sin egen ordlyd) –
 *    ett trinn større tittel (`text-2xl sm:text-3xl`, mot `text-xl
 *    sm:text-2xl` for de andre) og ett hakk mer luft over/under
 *    (`py-8 sm:py-10`) – ingen annen forskjell (samme farge/vekt/skrifttype
 *    som forrett/dessert), bevisst subtilt som bedt om. Ingen cards/
 *    bakgrunnsbokser lagt til noe sted – kun typografi, luft og strek.
 * 3. HANDLINGSGRUPPEN (Skriv ut/PDF, Lagre menyen, Legg i handlelisten) –
 *    var tre visuelt likestilte tekstlenker i tilfeldig rekkefølge (skriv
 *    ut øverst). Henrik ba eksplisitt om en prioritert handlingsgruppe:
 *    "Lagre menyen" = primær, "Legg hele menyen i handlelisten" = sekundær,
 *    "Skriv ut / lagre som PDF" = tertiær og mest diskret – "ikke gjøre dem
 *    til tre store knapper [...] bruk gjerne små ikoner dersom det passer".
 *    Omorganisert i akkurat den rekkefølgen (primær øverst, tertiær
 *    nederst):
 *      – Lagre menyen: nå `text-sm` (opp fra `text-xs`) og `text-clay`
 *        (gull, i stedet for `text-ink-faint`) med et lite `BookIcon`
 *        foran – ingen understrek lenger (selve fargen/størrelsen ER nå
 *        signalet, en understreket lenke ville sett unødvendig UI-aktig ut
 *        for DEN primære handlingen i gruppen). "Lagret"-bekreftelsen
 *        (når `saved`) har samme størrelsesøkning.
 *      – Legg i handlelisten: uendret logikk (MealShoppingListSection.tsx),
 *        fikk et lite `ShoppingBagIcon` foran selve knappeteksten inni
 *        komponenten (se filheaderen der) – fortsatt `text-xs`/
 *        `text-ink-faint`, klart sekundær til den nye, gullfargede "Lagre
 *        menyen".
 *      – Skriv ut / lagre som PDF: dyttet lengst ned og dempet ytterligere
 *        (`text-xs` → `text-[11px]`, `text-ink-faint` → `text-ink-faint/70`)
 *        – ingen ikon (et ikon her ville gitt den for mye visuell vekt for
 *        en bevisst tertiær, tilbaketrukket handling).
 *    `window.print()`-kallet, `addToIndex`/`removeFromIndex`, og
 *    MealShoppingListSection sin egen add-til-handleliste-logikk er alle
 *    helt uendret – kun rekkefølge, størrelse, farge og ikon er nytt.
 */
export function MealView({ mealId, isAdmin, lang }: { mealId: string; isAdmin: boolean; lang: Lang }) {
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  // Hvilke retter som har "Rediger"-raden (porsjoner/fjern) åpen akkurat
  // nå – se REDESIGNET-avsnittet i filheaderen over. Ren UI-state, ikke
  // lagret noe sted; tom ved hver friske sidevisning.
  const [expandedSlotIds, setExpandedSlotIds] = useState<Set<string>>(new Set());
  const { mealIds, hydrated: indexHydrated, addToIndex, removeFromIndex } = useMealSessionIndex();
  const {
    session,
    hydrated: sessionHydrated,
    setTitle,
    setDescription,
    remove,
    setServings,
    setDesiredReadyAt,
    setWine,
  } = useMealSession(mealId, "");

  // Auto-voksende tittelfelt (se TITTEL-WRAP-avsnittet i filheaderen over) –
  // justerer høyden ut fra scrollHeight hver gang tittelen endres, enten fra
  // direkte skriving (onInput på selve <textarea>-en under) eller fra en
  // asynkront hydrert session.title ved førstegangslasting av siden.
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [session.title]);

  if (!indexHydrated || !sessionHydrated) {
    return <div className="h-40 animate-pulse rounded-card bg-cream-dark/60" />;
  }

  if (!mealSessionExists(session)) {
    return (
      <div className="rounded-card border border-line bg-cream-dark/60 p-6 text-center">
        <h1 className="font-serif text-xl text-ink">{t(lang, "mealPage.notFoundHeading")}</h1>
        <p className="mt-2 text-sm text-ink-faint">{t(lang, "mealPage.notFoundBody")}</p>
      </div>
    );
  }

  const slots = sortSlotsByRole(session.slots);
  const hasExistingDish = slots.some((slot) => slot.source === "existing");

  // Retten menyen ble bygget rundt (session.anchorRecipeId) er alltid også
  // lagt inn som en av de "existing"-plassene selv (se addExistingSlot i
  // MealBuilder.tsx sitt genererings-steg) – ingen egen oppslags-fetch
  // nødvendig, bare finn den samme slotten igjen her for slug-en. `null` når
  // menyen ikke har noen forankret ankerrett (bør normalt ikke skje, men en
  // meny startet uten en gyldig anker skal ikke krasje siden).
  const anchorSlot: ExistingMealCourseSlot | null = session.anchorRecipeId
    ? (slots.find(
        (s): s is ExistingMealCourseSlot => s.source === "existing" && s.recipeId === session.anchorRecipeId,
      ) ?? null)
    : null;

  // Står menyen i "Dine menyer"-registeret? (se OMLAGT-avsnittet i
  // filheaderen over) – IKKE "finnes menyen" lenger, kun "er den
  // eksplisitt lagret dit".
  const saved = mealIds.includes(mealId);

  function toggleExpanded(slotId: string) {
    setExpandedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }

  return (
    <>
    {/* ============ SEGMENT 1: DIN MENY (mørk, standard sidebunn) ============ */}
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-16 sm:px-6 sm:pb-20 lg:px-8 print:hidden">
      {/* (29.09.2026, 23. runde – Henrik: "Dette redesignet gikk i feil
          retning [...] Jeg vil ha en mer raffinert komposisjon, ikke større
          typografi [...] Det viktigste nye grepet skal være layouten: Lag
          en tydelig, balansert todelt komposisjon") – reverserer 22. rundes
          størrelsesøkninger (ekstra luft rundt tittelen, hovedrett-
          skalering, brede `py`-verdier på retteradene) og erstatter
          samtidig toppraden (tilbake-lenke + handlingsgruppe presset øverst
          til høyre i viewporten) med en ekte todelt grid-komposisjon:
          venstre = DIN MENY (eyebrow/tittel/beskrivelse + den kompakte
          tre-rettersmenyen), høyre = en smal handlings-"sidebar" som
          starter på høyde med tittelen. Atskilt med samme hårfine
          `border-ink/10`-strek (og samme mobil-stables-med-border-t/
          desktop-border-l-mønster) som "I glasset"/"Vinen din" i
          EveningExperience.tsx allerede bruker – se filheaderen der.
          Tilbake-lenken står nå alene øverst, ikke lenger i en
          justify-between-rad med handlingsgruppen (som ikke lenger bor
          der). */}
      {anchorSlot && (
        <Link
          href={`/oppskrifter/${anchorSlot.slug}?fromMealId=${mealId}`}
          className="text-sm font-medium text-ink-faint transition-colors hover:text-clay-dark"
        >
          {t(lang, "mealPage.backToRecipeShort")}
        </Link>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
        {/* VENSTRE: DIN MENY – eyebrow/tittel/beskrivelse + retteliste. */}
        <div>
          {/* 1. DIN MENY – tittel er hovedpersonen, beskrivelsen er diskret.
              Tett `space-y-3`-stabling og opprinnelig eyebrow-formel
              (`tracking-[0.3em]`, ingen `sm:text-sm`) – 22. rundes ekstra
              luft (`mt-5 sm:mt-6` rundt tittel/beskrivelse) og bredere
              eyebrow-tracking er reversert. Selve tittel-tekststørrelsen
              (`text-3xl`/`sm:text-4xl`/`md:text-5xl`) har vært UENDRET
              gjennom hele denne historien – det var alltid kun luften og
              eyebrow-en rundt den som vokste i 22. runde, ikke selve
              teksten. */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
              {t(lang, "mealPage.menuEyebrow")}
            </p>
            <textarea
              ref={titleRef}
              rows={1}
              value={session.title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                // Tittelen er logisk sett fortsatt én sammenhengende streng
                // (ingen manuelle linjeskift lagret) – Enter skal ikke sette
                // inn "\n", kun automatisk visuell wrap skal brekke linjen.
                if (e.key === "Enter") e.preventDefault();
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              className="block w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent font-serif text-3xl leading-tight text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-4xl md:text-5xl"
            />

            {descriptionEditing ? (
              <input
                type="text"
                value={session.description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setDescriptionEditing(false)}
                placeholder={t(lang, "mealPage.descriptionPlaceholder")}
                autoFocus
                className="w-full rounded-lg border border-transparent bg-transparent font-serif text-base italic text-ink-faint transition-colors placeholder:not-italic focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-lg"
              />
            ) : session.description ? (
              <button
                type="button"
                onClick={() => setDescriptionEditing(true)}
                className="block w-full rounded-lg text-left font-serif text-base italic text-ink-faint transition-colors hover:text-ink-soft sm:text-lg"
              >
                {session.description}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDescriptionEditing(true)}
                className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
              >
                {t(lang, "mealPage.addDescription")}
              </button>
            )}
          </div>

          {slots.length === 0 ? (
            <p className="mt-6 text-sm text-ink-faint">{t(lang, "mealPage.emptyState")}</p>
          ) : (
            /* 2. SELVE MENYEN – kompakt restaurantmeny-liste, ingen kort/
                bokser, kun hårfine skillelinjer (`divide-ink/10`, samme
                token som EveningExperience.tsx sine kapitler bruker).
                Redusert fra 22. rundes luftige `py-7/py-8`
                (`py-8/py-10` for hovedretten) tilbake til en tettere `py-5`
                – litt strammere enn selv den opprinnelige `py-6` (Henrik,
                23. runde: "Gjør hele listen [...] mer kompakt igjen").
                Hovedrettens egen, større tittel-skalering er fjernet helt
                (Henrik: "Ikke gi hovedretten større font enn de andre
                rettene. Hierarkiet kommer allerede fra rekkefølgen og
                labelene") – alle tre retter har nå identisk
                tittel-/label-størrelse igjen. */
            <div className="mt-6 divide-y divide-ink/10">
              {slots.map((slot) => {
                const expanded = expandedSlotIds.has(slot.id);
                return (
                  <div key={slot.id} className="flex flex-col gap-1.5 py-5 first:pt-0 last:pb-0">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-clay">
                      {t(lang, `mealBuilder.role.${slot.role}`)}
                    </span>

                    {slot.source === "existing" ? (
                      <Link
                        href={`/oppskrifter/${slot.slug}?fromMealId=${mealId}`}
                        className="font-serif text-xl text-ink hover:text-clay-dark sm:text-2xl"
                      >
                        {slot.title}
                      </Link>
                    ) : (
                      <p className="font-serif text-xl text-ink sm:text-2xl">{slot.title}</p>
                    )}

                    {/* "Nytt forslag"-merket og forslagsbeskrivelsen er reell
                        informasjon (skiller et AI-forslag fra en ekte
                        oppskrift) – UENDRET, alltid synlig, i motsetning til
                        "Finnes i oppskriftsboken" for eksisterende retter
                        (fjernet helt, se filheaderen over). */}
                    {slot.source === "suggested" && (
                      <span className="text-[11px] font-medium text-mustard-dark">
                        {t(lang, "mealBuilder.suggestedBadge")}
                      </span>
                    )}

                    {slot.source === "suggested" && slot.description && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                          {t(lang, "mealPage.suggestedDescriptionLabel")}
                        </p>
                        <p className="text-xs leading-relaxed text-ink-faint">{slot.description}</p>
                      </div>
                    )}

                    {/* Kun synlig for innlogget admin (server-sjekket, se
                     * isAdmin-prop-en/app/meny/[id]/page.tsx). Fører til "Ny
                     * oppskrift" med tittel/beskrivelse forhåndsutfylt, pluss
                     * fromMealId/fromSlotId som RecipeForm.tsx bruker til å
                     * bytte DENNE plassen fra et AI-forslag til en ordentlig
                     * oppskrift så snart den er lagret. */}
                    {isAdmin && slot.source === "suggested" && (
                      <Link
                        href={`/admin/oppskrifter/ny?${new URLSearchParams({
                          title: slot.title,
                          description: slot.description,
                          servings: String(slot.servings),
                          fromMealId: mealId,
                          fromSlotId: slot.id,
                        }).toString()}`}
                        className="self-start text-xs font-medium text-clay hover:text-clay-dark"
                      >
                        {t(lang, "mealPage.createFromSuggestion")}
                      </Link>
                    )}

                    {/* Porsjoner + "Fjern fra menyen" bak en "Rediger"-lenke
                        (se REDESIGNET-avsnittet i filheaderen over) – course
                        og rettnavn skal eie oppmerksomheten, ikke
                        redigeringskontrollene. */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(slot.id)}
                      className="mt-0.5 self-start text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                    >
                      {expanded ? t(lang, "eveningExperience.whyHide") : t(lang, "mealPage.editDish")}
                    </button>

                    {expanded && (
                      <div className="mt-1 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-ink-faint">
                          {t(lang, "mealBuilder.servingsLabel")}
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={slot.servings}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (Number.isFinite(next) && next >= 1) setServings(slot.id, Math.round(next));
                            }}
                            // text-base på mobil (unngår iOS-innzooming ved fokus).
                            className="w-16 rounded-lg border border-line bg-cream px-2 py-1 text-base text-ink focus:border-clay focus:outline-none sm:text-sm"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => remove(slot.id)}
                          className="text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                        >
                          {t(lang, "mealBuilder.remove")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HØYRE: handlingsgruppe – nå en del av selve menykomposisjonen i
            stedet for løsrevet øverst i høyre hjørne av viewporten (Henrik,
            23. runde: "De skal være en del av selve menykomposisjonen").
            Prioritert rekkefølge uendret fra 22. runde: Lagre menyen
            (primær) → Legg i handlelisten (sekundær) → Skriv ut/PDF
            (tertiær). Samme mobil-border-t/desktop-border-l-mønster som "I
            glasset"/"Vinen din" i EveningExperience.tsx – på mobil stables
            denne under venstrekolonnen med en hårfin strek over, på desktop
            står den ved siden av med en loddrett hårfin strek i stedet.
            Venstrestilt (ikke lenger `items-end`) – leser nå som en liten,
            rolig vertikal meny av handlinger i sin egen smale spalte, samme
            lesevei som resten av siden. */}
        <div className="mt-8 border-t border-ink/10 pt-6 lg:mt-0 lg:w-52 lg:border-t-0 lg:border-l lg:border-ink/10 lg:pl-10 lg:pt-0">
          <div className="flex flex-col items-start gap-2.5">
            {saved ? (
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-clay">
                <CheckIcon className="h-4 w-4" />
                {t(lang, "mealPage.savedLabel")}
                <span className="text-ink-faint">·</span>
                <button
                  type="button"
                  onClick={() => removeFromIndex(mealId)}
                  className="text-xs font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
                >
                  {t(lang, "savedMealsPage.removeButton")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addToIndex(mealId)}
                className="flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-dark"
              >
                <BookIcon className="h-4 w-4" />
                {t(lang, "mealPage.saveButton")}
              </button>
            )}

            {/* "Legg i handlelisten" – sekundær handling, se
                MealShoppingListSection.tsx sin filheader for ikonet
                (22. runde) og venstrestillingen (23. runde). */}
            {slots.length > 0 && (
              <div id="meal-shopping-list">
                <MealShoppingListSection slots={slots} lang={lang} />
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="text-[11px] font-medium text-ink-faint/70 underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
            >
              {t(lang, "mealPrint.button")}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ============ SEGMENT 2: PLANLEGG KVELDEN (lys kremflate, fullbredde) ============
        Egen full-bredde LYS seksjon (`bg-ink`) – samme "scene"-brudd-teknikk
        som components/home/CookModeShowcase.tsx bruker på forsiden (se
        filheaderen over for hele begrunnelsen). Kokemodus er fortsatt DEN
        ene tydelige, men nå bevisst KOMPAKTE CTA-en (ikke lenger full
        bredde). Notat-inputen er fortsatt fjernet (28.09.2026, se tidligere
        OPPFØLGING-avsnitt i filheaderen) – kun feltet i datamodellen
        (MealSession.notes) og setNotes (useMealSession.ts) lever videre,
        vist i utskriftsoppsummeringen lenger ned.

        (29.09.2026, 8. runde – Henrik: "'legg hele menyen i handlelisten'
        passer ikke her. den kan ligge oppe sammen med 'lagre menyen'") –
        MealShoppingListSection er flyttet UT herfra og opp i DIN MENY sin
        topplinje (se over), rett ved siden av "Lagre menyen". Igjen (samme
        Henrik-melding): "nå må vi bare midtstille 'planlegg kvelden' og
        start kokemodus. sånn at de ligger midt på boksen og har like mye
        luft under som over" – seksjonen er derfor gjort om til en
        `flex`-boks med en `min-h-*` (i stedet for kun symmetrisk `py-*`,
        som bare garanterer luft rundt YTTERKANTEN av innholdet, ikke at
        selve innholdet sitter midt i boksen når boksen er høyere enn
        innholdet trenger) – `justify-center` fordeler da overskytende
        høyde likt over og under innholdet uansett faktisk innholdshøyde
        (f.eks. om "Vis tidslinje" utvides). Selve raden (undertittel/
        tidslinje til venstre, kokemodus-knappen til høyre) er samtidig
        byttet fra `items-end` til `items-center`, slik at knappen sentreres
        på tvers av raden i stedet for å bunnstilles mot venstrekolonnen. */}
    {slots.length > 0 && (
      <section className="flex min-h-[26rem] flex-col justify-center bg-ink py-16 sm:min-h-[30rem] sm:py-20 print:hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="lg:max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
                {t(lang, "eveningExperience.planButton")}
              </p>
              <p className="mt-2 font-serif text-2xl text-cream sm:text-3xl">{t(lang, "mealPage.planSubtitle")}</p>

              <div className="mt-8" id="meal-timeline">
                <MealTimelineSection
                  slots={slots}
                  readyAt={session.desiredReadyAt ?? ""}
                  onReadyAtChange={setDesiredReadyAt}
                  lang={lang}
                />
              </div>
            </div>

            {hasExistingDish && (
              <div className="mt-8 shrink-0 text-center lg:mt-0">
                <button
                  type="button"
                  onClick={() => setCookModeOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-clay px-8 py-3.5 text-base font-medium text-cream transition-colors hover:bg-clay-dark sm:px-10 sm:text-lg"
                >
                  <PlayIcon className="h-4 w-4" />
                  {t(lang, "mealCookMode.button")}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    )}

    {/* ============ SEGMENT 3: GJØR DET TIL EN KVELD (eget mørkt univers, fullbredde) ============
        Egen full-bredde `bg-paper`-seksjon (en anelse lysere enn sidens
        `bg-cream`-bunn – nok til å lese som et eget rom, strukturert slik
        at et fullbredde bakgrunnsbilde kan legges til her senere, IKKE lagt
        til nå). "Vinen din" er IKKE lenger et eget kapittel her – flyttet
        inn i EveningExperience.tsx sitt "I GLASSET"-kapittel, se
        filheaderen der.

        (28.09.2026, 5. runde – Henrik: "gi inngangen mer tyngde som
        starten på et nytt kapittel") – kapittel-inngangen under er en
        egen, SENTRERT "tittelside"-komposisjon (større undertittel, en
        tynn gull-strek som markerer kapittelskiftet, romsligere pt/pb) i
        stedet for den venstrestilte, kompakte inngangen fra 4. runde – et
        tydeligere brudd før selve EveningExperience.tsx-kapitlene (som
        beholder sin egen, venstrestilte redaksjonelle stil).

        (28.09.2026, samme runde – Henrik, rett etter: "jeg vil at ...
        skal få enda mer plass") – enda mer rom rundt inngangen: mer
        luft over/under (pt/pb økt), undertittelen er enda større
        (5xl/6xl, opp fra 4xl/5xl), gullstreken og beskrivelsen har fått
        tilsvarende mer luft og en anelse større tekst.

        (28.09.2026, samme runde – Henrik, rett etter igjen: "like mye
        luft under 'akkurat denne menyen' som over 'gjør det til en
        kveld'") – pb er nå satt LIK pt (begge `pt-24 sm:pt-36`) i stedet
        for den mindre pb-16/pb-24 den hadde et øyeblikk – luften er nå
        symmetrisk over eyebrowen og under beskrivelsen.

        BAKGRUNNSBILDE 29.09.2026 (16. runde – Henrik sendte et mørkt,
        uskarpt bilde av et kjøkken/spisestue om kvelden: "legg inn dette
        bildet på 'gjør det til en kveld' seksjonen med samme overlay, og
        fjern linja som skiller seksjonene") – kapittel-inngangen har nå
        sitt eget bakgrunnsbilde (public/images/evening-entry.jpg), samme
        `relative isolate overflow-hidden` + absolutt bilde/overlegg-teknikk
        og samme `bg-cream/86`-overlegg som EveningExperience.tsx sitt delte
        bakgrunnsbilde bruker for I GLASSET/PÅ BORDET/STEMNING (se
        filheaderen der) – et EGET "rom" (kjøkkenet) rett før man går inn i
        spiserommet, ikke samme bilde som resten av kapitlene. Selve
        EveningExperience-komponenten er UTENFOR denne bilde-wrapperen (den
        eier fortsatt sitt eget bilde), kun selve inngangs-teksten
        (eyebrow/undertittel/strek/beskrivelse) har bildet bak seg.
        "Linja som skiller seksjonene" var I GLASSET sin egen `border-t` i
        EveningExperience.tsx (bevisst beholdt i forrige runde nettopp fordi
        den DA skilte mot en bildeløs inngang) – fjernet nå (se filheaderen
        der), siden inngangen og I GLASSET deler samme bilde-driftne visuelle
        språk og ikke lenger trenger en synlig sømlinje mellom seg.

        FADE TIL SVART, KUN NEDERST (29.09.2026, 17. runde – Henrik: "bildet
        på 'gjør det til en kveld' må fades til svart nederst, trenger ikke
        gjøre det øverst") – et ekstra gradient-overlegg OVENPÅ den
        eksisterende flate `bg-cream/86`-flaten, samme `var(--color-cream)`-
        fargetoken (sidens ekte sorte) i en `linear-gradient` som er helt
        gjennomsiktig øverst (toppen av inngangen beholdes som den er – ingen
        fade der) og solid nederst, der inngangen møter EveningExperience
        sitt eget bilde (evening-table.jpg, se EveningExperience.tsx sin
        filheader) rett under – en myk overgang mellom de to bildene i stedet
        for en brå kant. */}
    {slots.length > 0 && (
      <section className="bg-paper print:hidden">
        <div className="relative isolate overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/evening-entry.jpg)" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-cream/86" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_65%,var(--color-cream)_100%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl px-5 pb-24 pt-24 text-center sm:px-10 sm:pb-36 sm:pt-36">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-clay sm:text-sm">
              {t(lang, "eveningExperience.entryHeading")}
            </p>
            <p className="mt-6 text-balance font-serif text-5xl text-ink sm:text-6xl">
              {t(lang, "eveningExperience.entrySubtitle")}
            </p>
            <div className="mx-auto mt-8 h-px w-20 bg-clay/60" />
            <p className="mx-auto mt-8 max-w-lg font-serif text-xl text-ink-soft sm:text-2xl">
              {t(lang, "eveningExperience.entryDescription")}
            </p>
          </div>
        </div>

        <EveningExperience session={session} wine={session.wine} onWineChange={setWine} lang={lang} />
      </section>
    )}

    {/* Utskriftsvennlig oppsummering – skjult på skjerm, vist KUN ved
     * utskrift (Tailwind sin `print:`-variant, se filheaderen over for
     * hvorfor dette er en ren CSS-løsning fremfor en delbar lenke).
     * Trigger-knappen bor nå øverst på selve siden (se over) i stedet for
     * inni EveningExperience.tsx – denne print-only-blokken ligger fortsatt
     * her, uendret, siden CSS sin `print:`-variant virker uavhengig av HVOR
     * i DOM-treet knappen som trigget den befinner seg. UENDRET av
     * 27.09.2026-redesignet. */}
    <div className="hidden print:mx-auto print:block print:max-w-xl print:px-4 print:py-16 print:text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-ink-faint">{siteConfig.name}</p>

      {(session.occasion || session.desiredReadyAt) && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-ink-faint">
          {[
            session.occasion
              ? lang === "en"
                ? MEAL_OCCASION_LABELS[session.occasion].en
                : MEAL_OCCASION_LABELS[session.occasion].no
              : null,
            session.desiredReadyAt,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <h1 className="mt-4 text-balance font-serif text-4xl text-ink">{session.title}</h1>
      {session.description && (
        <p className="mx-auto mt-3 max-w-sm font-serif text-base italic text-ink-faint">{session.description}</p>
      )}
      <div className="mx-auto mt-5 h-px w-16 bg-clay" />

      {slots.length > 0 && (
        <ul className="mt-10 space-y-6">
          {slots.map((slot) => (
            <li key={slot.id}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-clay-dark">
                {t(lang, `mealBuilder.role.${slot.role}`)}
              </p>
              <p className="mt-1.5 font-serif text-xl text-ink">{slot.title}</p>
            </li>
          ))}
        </ul>
      )}

      {session.wine && (
        <div className="mx-auto mt-14 max-w-sm border-t border-ink/15 pt-6 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {t(lang, "mealWineInput.heading")}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{session.wine.name}</p>
        </div>
      )}

      {session.notes && (
        <div className="mx-auto mt-14 max-w-sm border-t border-ink/15 pt-6 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {t(lang, "mealPage.notesLabel")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{session.notes}</p>
        </div>
      )}

      <p className="mt-16 font-serif text-sm italic text-ink-faint">{siteConfig.tagline}</p>
    </div>

    {cookModeOpen && (
      <MultiCookMode
        mealId={mealId}
        mealTitle={session.title}
        slots={slots}
        readyAt={session.desiredReadyAt ?? ""}
        onClose={() => setCookModeOpen(false)}
        lang={lang}
      />
    )}
    </>
  );
}
