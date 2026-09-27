"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  generateMealPlan,
  regenerateMealPlanCourse,
  type MealPlanCourse,
} from "@/lib/actions/kitchen-intelligence";
import { generateMealId, useMealSession } from "@/lib/hooks/useMealSession";
import { ALL_MEAL_COURSE_ROLES, type MealCourseRole } from "@/lib/kitchen-intelligence";
import { t, type Lang } from "@/lib/i18n";

interface WorkingCourse {
  course: MealPlanCourse;
  servings: number;
  /** true mens "Bytt rett" pågår for AKKURAT denne plassen – lar
   * resten av menyen forbli interaktiv mens én rad venter. */
  regenerating: boolean;
}

/** De fire tidsbudsjett-valgene i "Hvor mye tid har du?"-kontrollen (29.09.2026-
 * redesignet, se filheaderen under). `minutes: null` = "Ingen grense" (samme
 * som å la feltet stå tomt i den gamle fritekst-inputen – ingen constraint
 * sendes til AI-en). "2+ timer" har ikke ett presist minuttall å sende inn
 * (det er per definisjon åpent oppover) – 150 min er valgt som et fornuftig,
 * konkret tall å gi AI-en et "det er god tid, en langsommere rett er helt
 * fint her"-hint, uten at det leses som en hard 2-timersgrense. */
type TimeOptionKey = "none" | "60" | "90" | "120plus";

const TIME_BUDGET_OPTIONS: { key: TimeOptionKey; minutes: number | null }[] = [
  { key: "none", minutes: null },
  { key: "60", minutes: 60 },
  { key: "90", minutes: 90 },
  { key: "120plus", minutes: 150 },
];

/**
 * MENYBYGGEREN (Fase 5 – Experience). Knapp-trigget (samme mønster som
 * MenuSuggestions/WineSection) – besøkende ber selv om en meny fremfor at
 * den lastes automatisk. Se generateMealPlan i
 * lib/actions/kitchen-intelligence.ts for selve AI-logikken, og
 * lib/kitchen-intelligence/meal-session.ts for hva som skjer med et
 * akseptert forslag når "Gå videre" trykkes – IKKE en utvidelse av
 * MenuSuggestions (den lever videre uendret ved siden av denne), men en
 * egen, rikere funksjon: rolle-inndelt, redigerbar per plass, og kan
 * inkludere retter som ikke finnes i katalogen ennå.
 *
 * REDESIGNET 29.09.2026 – stor designbrief fra Henrik: "Jeg vil redesigne
 * hele 'Gjør det til en kveld'-området nederst på oppskriftssiden [...] Det
 * skal bli en egen, tydelig premiumseksjon på linje med de andre store
 * seksjonene vi nå har redesignet på CONVITE [...] Dette skal føles som en
 * kuratert del av matopplevelsen, ikke som et konfigurasjonsskjema." Ren
 * presentasjon/interaksjon – all funksjonalitet (hvordan menyen genereres,
 * hvilke retter som velges, porsjoner, navigasjon videre, lagring) er
 * UENDRET, kun hvordan den vises:
 *
 * 1. FULLBREDDE PREMIUMFLATE – selve `<section>`-en (se JSX under) bryter nå
 *    ut av oppskriftssidens vanlige `max-w-5xl`/`xl:max-w-[1280px]`-
 *    container med samme full-bleed-triks (`relative left-1/2 -mx-[50vw]
 *    w-screen`) som RecipeHero.tsx allerede bruker for sitt bilde (se
 *    filheaderen der) – men UTEN `xl:`-prefikset, siden denne skal være
 *    fullbredde på ALLE skjermstørrelser, ikke bare fra 1280px. En egen
 *    indre `mx-auto max-w-5xl ... xl:max-w-[1280px]`-kolonne (nøyaktig
 *    samme bredde-/padding-verdier som app/oppskrifter/[slug]/page.tsx sin
 *    ytre wrapper) gjenoppretter samme venstrekant/innholdsbredde som
 *    resten av siden – "innenfor samme content-grid og venstrekant som
 *    resten av nettsiden", ikke en tilfeldig annen bredde. `relative
 *    isolate overflow-hidden bg-paper` på selve `<section>`-en (samme
 *    teknikk som EveningExperience.tsx/MealView.tsx sine bakgrunnsbilde-
 *    seksjoner) gjør at et fullbredde bakgrunnsbilde + mørke overlays/
 *    gradienter kan legges til SENERE som to ekstra `absolute inset-0`-lag
 *    helt uten strukturelle endringer – bevisst IKKE lagt til ennå (Henrik:
 *    "IKKE legg inn noe nytt bilde nå"). Generøs `py-14 sm:py-18 lg:py-21`
 *    gir seksjonen den "gode høyden" som er bedt om (justert ned ~10–15 %
 *    fra opprinnelig `py-16 sm:py-20 lg:py-24` 29.09.2026 – tilbakemelding:
 *    "redusert høyden/padding med kanskje 10–15 %", resten av
 *    hierarkiet/spacingen inni seksjonen er UENDRET siden det leste "veldig
 *    naturlig").
 * 2. VENSTREJUSTERT EDITORIAL INTRO (ikke lenger sentrert) – liten gull-
 *    eyebrow (`mealBuilder.eyebrow`, uendret tekst "Gjør det til en kveld"),
 *    stor serif-heading (`mealBuilder.heading`, tekst endret til "Bygg en
 *    kveld rundt retten." – se dictionary.ts) og en kort ingress
 *    (`mealBuilder.intro`, tekst endret til å nevne forrett/hovedrett/
 *    dessert konkret). Denne intro-blokken er ALLTID synlig, både før og
 *    etter generering ("Behold labelen [...] og headingen øverst, slik at
 *    dette fortsatt visuelt er samme seksjon").
 * 3. TIDSBUDSJETT – det gamle tekniske "Jeg har (minutter, valgfritt)
 *    f.eks. 6"-tallfeltet er fjernet. Erstattet med `TIME_BUDGET_OPTIONS`
 *    over: en liten pille-rad (Ingen grense/60 min/90 min/2+ timer) under
 *    en egen `mealBuilder.timeLabel`-eyebrow ("Hvor mye tid har du?").
 *    `availableMinutesInput` (fritekst-state) er derfor byttet ut med
 *    `selectedMinutes: number | null` – kobles til nøyaktig samme
 *    `generateMealPlan(..., { availableMinutes })`-kall som før, bare uten
 *    fritekst-parsingen (Number/Number.isFinite-sjekken er overflødig når
 *    verdien allerede er et kontrollert `number | null`).
 * 3b. TO-KOLONNER VED GENERERING (30.09.2026, tilbakemelding: "menyen
 *    kommer opp nedover på siden [...] jeg vil at menyen skal komme opp på
 *    høyre side inne i seksjonen, slik at seksjonen ikke trenger å bli
 *    større") – se `<section>`-JSX-en for detaljene. Kort fortalt: den
 *    ytre wrapper-diven bytter fra vanlig blokk-flyt til `lg:grid
 *    lg:grid-cols-[2fr_3fr]` når `hasPlan` er true, slik at den genererte
 *    menyen dukker opp i en ny høyrekolonne VED SIDEN AV introen i stedet
 *    for stablet under den – seksjonens høyde bestemmes da av den høyeste
 *    av de to kolonnene, ikke summen av begge. Under lg (for smalt for to
 *    kolonner) er stablingen uendret.
 * 4. GENERERT MENY – de store, kantede `CourseCard`-boksene er borte.
 *    `CourseRow` (ny, under) rendrer nå ALLE plasser (anker + de andre)
 *    likt: liten gull-rolle-label + retten i medium serif, tynne
 *    `divide-y divide-ink/10`-skillelinjer mellom radene (samme hårfine
 *    token som DIN MENY-listen i MealView.tsx – bevisst samme visuelle
 *    språk, se filheaderen der). VIDERE KRAFTIG FORENKLET 30.09.2026
 *    (tilbakemelding: "fortsatt for mye informasjon [...] mye renere og
 *    mer som et elegant menykort enn et redigeringspanel", med en eksakt
 *    ønsket sluttilstand) – se filheaderen på selve `CourseRow` under for
 *    hele lista over hva som ble fjernet (statustekster, beskrivelse/
 *    notat, per-rett porsjonsfelt, "Fjern fra menyen"). Det som er igjen
 *    per rett er kun rolle-label, rettenavn, og "Bytt rett" der det er
 *    mulig. Porsjoner er nå ÉN felles kontroll ("2 personer") rett under
 *    menynavnet (se `setAllServings`), ikke lenger per rett. Menynavnet
 *    er fortsatt en `<input>` som er usynlig (gjennomsiktig, ingen kant)
 *    helt til den får fokus – samme "diskret til man faktisk trenger den"-
 *    teknikk som tittelfeltet i MealView.tsx.
 * 5. CTA-RAD – "Gå videre" (`mealBuilder.save`, tekst uendret) er en tydelig
 *    gullfylt rund knapp (samme `bg-clay`/`text-cream`-formel som
 *    kokemodus-knappen i MealView.tsx). Sekundærhandlingen er forkortet
 *    30.09.2026 fra "Nullstill og begynn på nytt" til bare "Begynn på
 *    nytt" (`mealBuilder.reset`) – fortsatt en mye roligere, liten
 *    tekstlenke ved siden av, ikke jevnbyrdig med primærknappen.
 *
 * `Badge`/`Button`-komponentene er ikke lenger brukt her (erstattet av
 * skreddersydde elementer som matcher resten av denne rundens redesign) –
 * importene er derfor fjernet.
 */
export function MealBuilder({
  recipe,
  lang,
}: {
  recipe: {
    id: string;
    slug: string;
    title: string;
    description: string;
    servings: number;
    category: { name: string } | null;
  };
  lang: Lang;
}) {
  const router = useRouter();
  const [mealId] = useState(() => generateMealId());
  const { addExisting, addSuggested, setTitle, setAnchorRecipeId } = useMealSession(mealId, recipe.title);

  const [anchorRole, setAnchorRole] = useState<MealCourseRole | null>(null);
  const [menuTitle, setMenuTitle] = useState("");
  const [anchorServings, setAnchorServings] = useState(recipe.servings);
  const [courses, setCourses] = useState<WorkingCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ANLEDNING fjernet HELT (31.08.2026, tilbakemelding: "for den har ingen
  // effekt" – selv som mykt AI-hint ga den ikke et merkbart utslag brukeren
  // faktisk la merke til, og ga da mest et falskt inntrykk av kontroll).
  // TILGJENGELIG TID (5.13) er beholdt – rent tidsbudsjett er en konkret,
  // forståelig begrensning på en helt annen måte enn en stemningsetikett.
  // Byttet fra fritekst-state til en kontrollert `number | null` (29.09.2026,
  // se filheaderen over) – `null` er "Ingen grense", samme default som det
  // gamle tomme feltet hadde.
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  // Se useEffect-en nedenfor (rett før JSX-en returneres) for hele
  // resonnementet bak disse to – låser seksjonens høyde til
  // før-genereringstilstanden (30.09.2026).
  const contentRef = useRef<HTMLDivElement>(null);
  const [lockedMinHeight, setLockedMinHeight] = useState<number | undefined>(undefined);

  const hasPlan = anchorRole !== null;

  async function handleBuild() {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateMealPlan(
        recipe.id,
        { title: recipe.title, description: recipe.description, categoryName: recipe.category?.name ?? null },
        lang,
        { availableMinutes: selectedMinutes },
      );
      setAnchorRole(plan.anchorRole);
      setMenuTitle(plan.menuTitle);
      setAnchorServings(recipe.servings);
      setCourses(plan.courses.map((course) => ({ course, servings: recipe.servings, regenerating: false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealBuilder.error"));
    } finally {
      setLoading(false);
    }
  }

  /** Nullstiller HELE det genererte forslaget og går tilbake til
   * start-knappen – for når brukeren vil begynne helt på nytt fremfor å
   * fjerne/regenerere kort for kort. Rører IKKE en allerede LAGRET meny (se
   * `saved`/`mealId` – "Lagre menyen" har på det tidspunktet allerede
   * skrevet til useMealSession sin egen localStorage-post); dette nullstiller
   * kun byggeskjermens egen, ennå-ikke-lagrede arbeidstilstand. */
  function handleReset() {
    setAnchorRole(null);
    setMenuTitle("");
    setAnchorServings(recipe.servings);
    setCourses([]);
    setError(null);
    setSaved(false);
  }

  /** Én FELLES porsjonskontroll for hele menyen (30.09.2026, tilbakemelding:
   * "fjern porsjonsvelger fra hver enkelt rett. legg i stedet én felles
   * porsjonsvelger rett under menynavnet [...] som styrer porsjoner for
   * hele menyen og kobles til eksisterende porsjonslogikk") – erstatter
   * den tidligere per-rett `setCourseServings(role, servings)`. Setter
   * `anchorServings` OG alle `courses[].servings` til samme verdi i ett
   * kall, i stedet for å la hver rett ha sin egen uavhengige verdi. Selve
   * lagre-/handlelistelogikken (se handleSave/MealShoppingListSection) er
   * uendret – den leser fortsatt `servings` per rett, disse verdiene er
   * nå bare alltid like siden dette er eneste stedet de endres fra. */
  function setAllServings(next: number) {
    setAnchorServings(next);
    setCourses((prev) => prev.map((c) => ({ ...c, servings: next })));
  }

  async function handleRegenerate(role: MealCourseRole) {
    setCourses((prev) => prev.map((c) => (c.course.role === role ? { ...c, regenerating: true } : c)));
    try {
      const excludeRecipeIds = [
        recipe.id,
        ...courses.flatMap((c) => (c.course.source === "existing" ? [c.course.recipe.id] : [])),
      ];
      const next = await regenerateMealPlanCourse(role, { title: recipe.title, description: recipe.description }, excludeRecipeIds, lang);
      setCourses((prev) => prev.map((c) => (c.course.role === role ? { course: next, servings: c.servings, regenerating: false } : c)));
    } catch {
      setCourses((prev) => prev.map((c) => (c.course.role === role ? { ...c, regenerating: false } : c)));
    }
  }

  async function handleSave() {
    if (!anchorRole) return;
    setSaving(true);
    try {
      // VIKTIG – flushSync rundt ALLE lagre-kallene (26.08.2026, rettet
      // etter bruker-tilbakemelding: "bygg en meny"-lagring fungerte ikke på
      // mobil – landet på "Fant ikke menyen" rett etter lagring). Uten dette
      // batcher React 18/19 automatisk de mange separate setState-kallene
      // under (setTitle/setAnchorRecipeId/addExisting × N) sammen med
      // router.push() sin egen navigasjons-tilstandsoppdatering – ALLE kalt
      // synkront i samme hendelse, uten et eneste "await" innimellom. React
      // garanterer IKKE at de tidligere batchede oppdateringene (og dermed
      // useLocalStorage sine localStorage.setItem-kall, som skjer INNI
      // selve state-updateren) er flushet/skrevet FØR router.push() sin
      // egen batch behandles – MealView på den nye siden kan da rekke å
      // montere og lese localStorage FØR selve menyinnholdet faktisk er
      // skrevet, og viser da "ikke funnet" (mealSessionExists sjekker
      // session.updatedAt, som touch() kun setter når disse kallene faktisk
      // committer – se filheaderen i meal-session.ts) selv om lagringen
      // egentlig lyktes et lite øyeblikk senere. Så vidt merkbart/
      // tidsfølsomt at det trolig varierte med enhetens ytelse (derav
      // mobil ↔ desktop). flushSync tvinger React til å committe HELE
      // denne batchen synkront FØR funksjonen går videre til router.push()
      // – dermed er ALT allerede skrevet til localStorage før selve
      // navigasjonen starter, uansett enhet/ytelse. (27.09.2026: addToIndex
      // fjernet herfra – "gå videre" lagrer IKKE lenger automatisk til
      // Dine menyer, se useMealSessionIndex sin filheader – men samme
      // race/samme fiks gjelder fortsatt for setTitle/addExisting/
      // addSuggested, siden mealSessionExists nå er signalet MealView leser.)
      flushSync(() => {
        setTitle(menuTitle || recipe.title);
        setAnchorRecipeId(recipe.id);
        addExisting(anchorRole, { id: recipe.id, slug: recipe.slug, title: recipe.title }, anchorServings);
        for (const { course, servings } of courses) {
          if (course.source === "existing") {
            addExisting(course.role, { id: course.recipe.id, slug: course.recipe.slug, title: course.recipe.title }, servings);
          } else {
            addSuggested(course.role, { title: course.title, description: course.description }, servings);
          }
        }
      });
      setSaved(true);
      router.push(`/meny/${mealId}`);
    } finally {
      setSaving(false);
    }
  }

  const displayRoles = anchorRole
    ? ALL_MEAL_COURSE_ROLES.filter((role) => role === anchorRole || courses.some((c) => c.course.role === role))
    : [];

  // LÅSER SEKSJONENS HØYDE TIL FØR-GENERERING-TILSTANDEN (30.09.2026,
  // tilbakemelding: "nå blir seksjonen MINDRE. lås seksjonen til å være i
  // den størrelsen den er i før man genererer meny"). Etter forrige runde
  // med kompriminering av høyrekolonnen (mindre tekst, felles
  // porsjonskontroll) endte den genererte tilstanden opp KORTERE enn
  // før-tilstanden (som i tillegg har tidsvalg-pillene + "Bygg en
  // meny"-knappen, ganske høy i seg selv) – seksjonen krympet dermed
  // synlig idet man genererte. Måler derfor `contentRef` sin faktiske,
  // gjengitte høyde kontinuerlig SÅ LENGE `hasPlan` er false (inkl. ved
  // vindusstørrelse-endringer, slik at verdien alltid er riktig for
  // GJELDENDE skjermbredde), og fryser siste målte verdi som `minHeight`
  // idet `hasPlan` blir true. `contentRef` sitter på nøyaktig samme div
  // som får to-kolonne-grid-klassene under – den er derfor "hele
  // seksjonens innhold" i begge tilstander, ikke bare én kolonne. Dette
  // er en GULV-verdi (min-height), ikke et tak – en uvanlig lang
  // menytittel/rettenavn kan fortsatt gjøre seksjonen høyere enn dette,
  // akkurat som før.
  useEffect(() => {
    if (hasPlan) return;
    function measure() {
      if (contentRef.current) setLockedMinHeight(contentRef.current.offsetHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hasPlan]);

  return (
    // Se filheaderen over for hele redesign-resonnementet (29.09.2026).
    // Full-bleed-teknikk identisk med RecipeHero.tsx (kun uten xl:-prefiks –
    // denne skal være fullbredde på alle skjermstørrelser).
    <section className="relative isolate left-1/2 -mx-[50vw] w-screen overflow-hidden bg-paper">
      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-21 xl:max-w-[1280px]">
        {/* TO-KOLONNERS FRA lg NÅR MENYEN ER GENERERT (30.09.2026,
            tilbakemelding: "menyen kommer opp nedover på siden [...] jeg
            vil at menyen skal komme opp på høyre side inne i seksjonen,
            slik at seksjonen ikke trenger å bli større"). Før generering:
            ÉN kolonne, akkurat som før (intro + tidsvalg + CTA, ingen
            grid). Når `hasPlan` blir true bytter DENNE ytre div-en til
            samme `lg:grid`-mønster som DIN MENY-splitten i MealView.tsx
            (se filheaderen der) – introen (eyebrow/heading/ingress) blir
            værende i venstrekolonnen ("Behold labelen [...] og headingen
            øverst, slik at dette fortsatt visuelt er samme seksjon"), og
            selve den genererte menyen vises i en ny høyrekolonne ved
            siden av i stedet for å stables under. Kolonnene er `2fr_3fr`
            (menyen får mer bredde enn den kompakte introen, motsatt
            vektet av DIN MENY-splittens `7fr_3fr` der hovedinnholdet
            ligger til venstre) – seksjonens totale høyde styres dermed av
            den høyeste av de to kolonnene i stedet for av summen av begge
            stablet på hverandre. Under lg er alt fortsatt uendret: ren
            vertikal stabling, menyen kommer under introen som før (ikke
            nok bredde til to kolonner på mobil/nettbrett).

            ref/style: se `useEffect` over handleBuild/return-setningen –
            låser min-height til før-genereringstilstandens målte høyde
            (30.09.2026, "lås seksjonen til å være i den størrelsen den er
            i før man genererer meny"), som en GULV-verdi, ikke et tak. */}
        <div
          ref={contentRef}
          style={hasPlan ? { minHeight: lockedMinHeight } : undefined}
          className={clsx(hasPlan && "lg:grid lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-12")}
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
              {t(lang, "mealBuilder.eyebrow")}
            </p>
            <h2 className="mt-4 text-balance font-serif text-4xl text-ink sm:text-5xl">
              {t(lang, "mealBuilder.heading")}
            </h2>
            <p className="mt-4 max-w-prose font-serif text-lg text-ink-soft sm:text-xl">
              {t(lang, "mealBuilder.intro")}
            </p>

            {!hasPlan && (
              <div className="mt-10 max-w-md">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-clay">
                  {t(lang, "mealBuilder.timeLabel")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TIME_BUDGET_OPTIONS.map((option) => {
                    const active = selectedMinutes === option.minutes;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedMinutes(option.minutes)}
                        aria-pressed={active}
                        className={clsx(
                          "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-clay bg-clay text-cream"
                            : "border-ink-faint/30 text-ink-soft hover:border-clay hover:text-clay-dark",
                        )}
                      >
                        {t(lang, `mealBuilder.timeOption.${option.key}`)}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleBuild}
                  disabled={loading}
                  className="mt-8 rounded-full bg-clay px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
                >
                  {loading ? t(lang, "mealBuilder.loading") : t(lang, "mealBuilder.button")}
                </button>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-clay-dark">{error}</p>}
          </div>

          {hasPlan && (
            // Samme hårfine skillelinje-mønster (mobil border-t / desktop
            // border-l) som handlingskolonnen i MealView.tsx sin DIN
            // MENY-splitt, se filheaderen der.
            //
            // KOMPRIMERT VIDERE 30.09.2026 (ny presisering: "Dette er mye
            // bedre komposisjonsmessig, men den genererte menyen inneholder
            // fortsatt for mye informasjon og gjør seksjonen unødvendig
            // høy [...] mye renere og mer som et elegant menykort enn et
            // redigeringspanel") – utover ren tekststørrelse (forrige
            // runde) er selve INNHOLDET i høyrekolonnen nå kuttet ned til
            // et minimum: ingen statustekster (Retten du startet med/
            // Finnes i oppskriftsboken/Nytt forslag – "Nytt forslag"
            // brukes fortsatt av MealView.tsx sin retteliste, kun IKKE
            // lenger her), ingen
            // beskrivelse/notat under rettene, og porsjonsvelgeren er
            // flyttet fra é per rett til ÉN felles kontroll rett under
            // menynavnet (se setAllServings over). Se CourseRow lenger
            // ned for den tilsvarende komprimerte raden.
            <div className="mt-10 border-t border-ink/10 pt-8 lg:mt-0 lg:border-t-0 lg:border-l lg:border-ink/10 lg:pl-10 lg:pt-0">
              <div>
                {/* DIN MENY + porsjonskontroll på SAMME linje, porsjoner
                    høyrejustert helt ute i kolonnekanten (30.09.2026,
                    tilbakemelding: "flytt den felles porsjonsvelgeren bort
                    fra området under menynavnet. Den bryter den
                    redaksjonelle rytmen der [...] behandles som diskret
                    metadata/kontroll for hele menyen, ikke som en egen rad
                    i innholdet"). Se `MenuServingsControl` lenger ned for
                    klikk-for-å-redigere-mønsteret. */}
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
                    {t(lang, "mealPage.menuEyebrow")}
                  </p>
                  <MenuServingsControl value={anchorServings} onChange={setAllServings} lang={lang} />
                </div>
                {/* Usynlig til fokus (ingen kant/bakgrunn i hviletilstand) – samme
                    teknikk som tittelfeltet i MealView.tsx, se filheaderen over.
                    Etterfølges nå DIREKTE av retterlisten (FORRETT osv.) –
                    ingen mellomliggende porsjonsrad lenger, se over. */}
                <input
                  type="text"
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  // text-base på mobil (unngår iOS-innzooming ved fokus).
                  className="mt-1 block w-full rounded-lg border border-transparent bg-transparent font-serif text-lg leading-tight text-ink transition-colors focus:border-line focus:bg-cream-dark/40 focus:outline-none sm:text-xl"
                />
              </div>

              <div className="mt-2.5 divide-y divide-ink/10">
                {displayRoles.map((role) => {
                  if (role === anchorRole) {
                    return <CourseRow key={role} role={role} title={recipe.title} lang={lang} />;
                  }

                  const working = courses.find((c) => c.course.role === role);
                  if (!working) return null;
                  const { course, regenerating } = working;
                  const title = course.source === "existing" ? course.recipe.title : course.title;
                  return (
                    <CourseRow
                      key={role}
                      role={role}
                      title={title}
                      regenerating={regenerating}
                      onRegenerate={() => handleRegenerate(role)}
                      lang={lang}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
                >
                  {saving ? t(lang, "mealBuilder.saving") : t(lang, "mealBuilder.save")}
                </button>
                {saved && (
                  <Link
                    href={`/meny/${mealId}`}
                    className="text-sm font-medium text-clay transition-colors hover:text-clay-dark"
                  >
                    {t(lang, "mealBuilder.viewSaved")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="text-xs font-medium text-ink-faint/70 underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t(lang, "mealBuilder.reset")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Den felles porsjonskontrollen for hele menyen ("2 personer"), plassert
 * på linje med DIN MENY-labelen (se over). Vises i HVILETILSTAND som ren,
 * diskret tekst – ingen synlig kant/input – og bytter først til den
 * faktiske redigerbare inputen ved klikk/tastaturaktivering (30.09.2026,
 * tilbakemelding: "vis helst «2 personer» som en ren, diskret klikkbar
 * tekst og la selve justeringskontrollen komme frem ved interaksjon,
 * fremfor å vise et permanent input-felt/underline"). Går tilbake til
 * tekstvisning ved blur eller Enter. Samme underliggende
 * `onChange`/`setAllServings`-kobling som før – kun presentasjonen er ny. */
function MenuServingsControl({
  value,
  onChange,
  lang,
}: {
  value: number;
  onChange: (value: number) => void;
  lang: Lang;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={50}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next) && next >= 1) onChange(Math.round(next));
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditing(false);
          }}
          // text-base på mobil (unngår iOS-innzooming ved fokus).
          className="w-7 border-b border-ink-faint/30 bg-transparent px-0.5 py-0.5 text-center text-base text-ink focus:border-clay focus:outline-none sm:text-xs"
        />
        <span>{t(lang, "mealBuilder.servingsUnit")}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="shrink-0 text-xs text-ink-faint underline decoration-transparent underline-offset-4 transition-colors hover:text-ink-soft hover:decoration-line-strong"
    >
      {value} {t(lang, "mealBuilder.servingsUnit")}
    </button>
  );
}

/** Én rad i den genererte menyen. KRAFTIG FORENKLET 30.09.2026
 * (tilbakemelding: "fortsatt for mye informasjon [...] mye renere og mer
 * som et elegant menykort enn et redigeringspanel", med en eksakt
 * ønsket sluttilstand oppgitt av Henrik) – viser nå KUN rolle-label +
 * rettens navn, pluss "Bytt rett" der det faktisk er mulig å bytte (dvs.
 * kun når `onRegenerate` er gitt – ankerretten, som ikke kan byttes,
 * kaller ganske enkelt uten den propen). Fjernet i denne runden,
 * sammenlignet med forrige versjon: alle statustekster (Retten du
 * startet med / Finnes i oppskriftsboken / Nytt forslag – selve
 * dictionary-nøklene lever videre, kun IKKE lenger brukt her, se
 * MealView.tsx/ManualMealBuilder.tsx for deres fortsatte bruk),
 * beskrivelse/notat under retten, og selve porsjonsfeltet (flyttet til
 * ÉN felles kontroll for hele menyen, se setAllServings i MealBuilder
 * over). "Fjern fra menyen" er også fjernet fra denne permanente
 * visningen (samme tilbakemelding) – selve fjern-funksjonaliteten er
 * derfor tatt helt ut herfra; git-historikken har den forrige
 * implementasjonen om den trengs igjen i en annen form senere.
 *
 * PRESISERT 30.09.2026 (skjermbilde + tilbakemelding: "den går fortsatt
 * litt ned. men 'bytt rett' kan stå bak retten, ikke under. og teksten
 * kan være enda litt mindre") – "Bytt rett" står nå PÅ SAMME LINJE som
 * rettenavnet (`items-baseline`-rad), ikke som en egen linje under, og
 * rettenavnet er skalert enda ett hakk ned (var text-base/sm:text-lg).
 * Sammen med den tettere py-2 gir dette hver rad færre "linjer" totalt,
 * som er det som faktisk driver høyrekolonnens høyde ned. */
function CourseRow({
  role,
  title,
  regenerating = false,
  onRegenerate,
  lang,
}: {
  role: MealCourseRole;
  title: string;
  regenerating?: boolean;
  onRegenerate?: () => void;
  lang: Lang;
}) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-clay">
        {t(lang, `mealBuilder.role.${role}`)}
      </span>

      {/* gap-x-[18px] (30.09.2026, "'bytt rett' ligger litt klemt inntil
          retten [...] ørlite mer avstand, kanskje 16-20px, men fortsatt på
          samme linje") – var gap-x-3 (12px), midt i det ønskede
          16-20px-spennet. Fortsatt samme linje/flex-rad, kun luften økt. */}
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-[18px] gap-y-0.5">
        <p className={clsx("font-serif text-sm leading-snug text-ink transition-opacity sm:text-base", regenerating && "opacity-50")}>
          {title}
        </p>

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="shrink-0 text-[11px] font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {regenerating ? t(lang, "mealBuilder.regenerating") : t(lang, "mealBuilder.regenerate")}
          </button>
        )}
      </div>
    </div>
  );
}
