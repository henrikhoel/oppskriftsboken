"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { t, type Lang, type DictKey } from "@/lib/i18n";
import {
  COOK_MODE_TUTORIAL_FIRST_STEP_ID,
  COOK_MODE_TUTORIAL_MIDDLE_STEP_ID,
  COOK_MODE_TUTORIAL_TIMER_STEP_ID,
} from "@/lib/cook-mode-tutorial/demo-recipe";

interface TutorialStep {
  /** Verdien på data-cookmode-target i CookMode.tsx, ELLER en liste med
   * FLERE slike verdier når ringen skal omslutte flere atskilte DOM-
   * elementer samtidig – kun "footer"-steget bruker dette: ringen dekker
   * da UNIONEN av alle oppgitte elementers rektangler (se measureUnion i
   * useEffect-en under), IKKE et wrapper-element rundt dem (se hvorfor i
   * measureUnion-kommentaren). null for de to "ramme"-stegene
   * (intro/avslutning) uten noe spesifikt å peke på. */
  target: string | string[] | null;
  shape: "circle" | "box";
  /** Luft mellom elementets egne kanter og selve ringen. Utelates for
   * standard-luft (6px for "circle", 10px for "box" – se render-koden
   * under). "footer"-steget bruker denne for å gi unionen av Forrige+
   * Neste-knappene samme trange luft som en "circle"-ring (6px) i stedet
   * for den løsere "box"-standarden (10px) – ringen skal ligge tett inntil
   * selve knappene (Henrik, 28.09.2026: "DEN GULE SIRKELEN, skal følge
   * kantene til selve knappene 'forrige' og 'neste'"). */
  ringPadding?: number;
  titleKey: DictKey;
  bodyKey: DictKey;
  /** Talestyring finnes kun i nettlesere som støtter Web Speech API (se
   * data-cookmode-target="voice" sin kommentar i CookMode.tsx) – markert
   * `optional` slik at steget hoppes automatisk over når elementet rett og
   * slett ikke finnes i DOM-en, i stedet for å stå fast og peke på tomrom. */
  optional?: boolean;
  /** (28.09.2026, redesign-runde 2) Steg-id fra demo-oppskriften
   * (lib/cook-mode-tutorial/demo-recipe.ts) som CookMode.tsx TVINGES til å
   * vise mens dette tutorial-steget er aktivt (se `onForcedStepChange`
   * under og `forcedStepId`-proppen på CookMode.tsx). Kun satt for de to
   * stegene som faktisk trenger et bestemt, ekte Cook Mode-steg synlig:
   * selve stegteksten, og steget med en tidsangivelse (for at den ekte
   * "sett timer"-knappen skal vises) – og for "footer"-steget, slik at
   * BÅDE Forrige (ikke utgrået) og Neste (fortsatt den gule "Neste"-
   * knappen, ikke den oliven "Ferdig"-knappen på siste steg) vises normalt.
   * undefined for alle andre steg = vanlig, persistert stegvalg. */
  forcedRecipeStepId?: string;
}

const STEPS: TutorialStep[] = [
  { target: null, shape: "box", titleKey: "cookModeTutorial.introTitle", bodyKey: "cookModeTutorial.introBody" },
  {
    target: "step-text",
    shape: "box",
    titleKey: "cookModeTutorial.stepTextTitle",
    bodyKey: "cookModeTutorial.stepTextBody",
    forcedRecipeStepId: COOK_MODE_TUTORIAL_FIRST_STEP_ID,
  },
  { target: "close", shape: "circle", titleKey: "cookModeTutorial.closeTitle", bodyKey: "cookModeTutorial.closeBody" },
  { target: "progress", shape: "box", titleKey: "cookModeTutorial.progressTitle", bodyKey: "cookModeTutorial.progressBody" },
  {
    target: "ingredients",
    shape: "box",
    titleKey: "cookModeTutorial.ingredientsTitle",
    bodyKey: "cookModeTutorial.ingredientsBody",
  },
  {
    target: "all-steps",
    shape: "circle",
    titleKey: "cookModeTutorial.allStepsTitle",
    bodyKey: "cookModeTutorial.allStepsBody",
  },
  {
    target: "timer",
    shape: "box",
    titleKey: "cookModeTutorial.timerAutoTitle",
    bodyKey: "cookModeTutorial.timerAutoBody",
    forcedRecipeStepId: COOK_MODE_TUTORIAL_TIMER_STEP_ID,
  },
  { target: "timers", shape: "circle", titleKey: "cookModeTutorial.timersTitle", bodyKey: "cookModeTutorial.timersBody" },
  {
    target: "voice",
    shape: "circle",
    titleKey: "cookModeTutorial.voiceTitle",
    bodyKey: "cookModeTutorial.voiceBody",
    optional: true,
  },
  {
    // ÉN ring, men den omslutter UNIONEN av selve Forrige- og Neste-
    // knappene (target er en LISTE, se measureUnion) – ikke <footer>-
    // elementet de står i. Footeren har sin egen px-4 py-4-padding rundt
    // knappene, så å måle DEN (som første forsøk på denne innstrammingen
    // gjorde) ga en ring som fortsatt var tydelig større enn knappene selv,
    // uansett hvor lav ringPadding ble satt – Henrik, 28.09.2026, etter
    // det første forsøket: "DEN GULE SIRKELEN, skal følge kantene til
    // selve knappene 'forrige' og 'neste' ikke være utenfor som den er nå!
    // du klarte det jo når du lagde to sirkler". Fortsatt bare ÉTT
    // DOM-element å synkronisere (målingen union'es til ett rect FØR ring-
    // rendring, se update()) – ikke en tilbakevending til de to separate,
    // usynkroniserte ringene fra tidligere i historikken.
    target: ["footer-prev", "footer-next"],
    shape: "box",
    ringPadding: 6,
    titleKey: "cookModeTutorial.navTitle",
    bodyKey: "cookModeTutorial.navBody",
    forcedRecipeStepId: COOK_MODE_TUTORIAL_MIDDLE_STEP_ID,
  },
  { target: null, shape: "box", titleKey: "cookModeTutorial.outroTitle", bodyKey: "cookModeTutorial.outroBody" },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RingRect extends SpotlightRect {
  shape: "circle" | "box";
}

/** Én rundet firkant som SVG-sti, bygget fra de samme fire kommandoene
 * (M/H/A/V/A/H/A/V/A/Z) uansett hjørneradius – en "sirkel" er bare denne
 * formelen med radius = halve bredden/høyden (de rette linjestykkene
 * mellom buene får da lengde 0, og resultatet blir en perfekt sirkel).
 * Poenget: samme sti-STRUKTUR for både "circle"- og "box"-formede mål
 * (se `shape` på TutorialStep) er det som gjør at nettleseren kan
 * MORPHE clip-path jevnt mellom steg (se transition-[clip-path] under) –
 * to path()-strenger med ulik kommandostruktur hopper i stedet for å
 * glatte over. */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${x + radius} ${y}`,
    `H ${x + w - radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}`,
    `V ${y + h - radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}`,
    `H ${x + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x} ${y + h - radius}`,
    `V ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

/** Hele "kamera-fokus"-utsparingen: en full-skjerm firkant MINUS
 * hull-firkanten over, tolket med evenodd-fyllregel (se clip-path-bruken
 * under) – det er selve HULLET i det blurrede laget som avslører det
 * skarpe Cook Mode-elementet bak. `null` hole = ingen utsparing i det hele
 * tatt (intro/avslutning uten noe bestemt mål – hele skjermen forblir jevnt
 * blurret). */
function spotlightClipPath(hole: { x: number; y: number; w: number; h: number; r: number } | null, vw: number, vh: number): string {
  const outer = `M 0 0 H ${vw} V ${vh} H 0 Z`;
  if (!hole) return outer;
  return `${outer} ${roundedRectPath(hole.x, hole.y, hole.w, hole.h, hole.r)}`;
}

/**
 * (28.09.2026, redesignet visuelt samme dag, og igjen 28.09.2026 med fast
 * boksplassering/klikkbar fremdrift/to nye steg)
 * Ligger OVENPÅ en allerede åpen, ekte CookMode (se
 * components/cook-mode-tutorial/CookModeTutorial.tsx) og peker – med et
 * getBoundingClientRect()-oppslag mot CookMode.tsx sine
 * data-cookmode-target-attributter – ut én eller flere ekte elementer om
 * gangen.
 *
 * "Kamera-fokus"-effekten er løst med `backdrop-filter: blur()` + `clip-
 * path` på et SEPARAT lag OVENPÅ CookMode – ALDRI et `filter: blur()` på
 * selve CookMode eller en wrapper rundt den (ville blurret hele
 * undertreet, inkludert det som skal være skarpt). Se roundedRectPath/
 * spotlightClipPath over for selve klippe-mekanikken.
 *
 * FAST BOKSPLASSERING (Henrik, 28.09.2026): tutorial-boksen sto tidligere
 * rett over/under det pekte-ut elementet, og hoppet dermed rundt på
 * skjermen mellom hvert steg. Nå er den midtstilt (både vannrett og
 * loddrett) og STÅR STILLE gjennom hele tutorialen – eneste unntak er
 * "step-text"-steget, der selve den store stegteksten ligger midt på
 * skjermen og boksen derfor må ned mot bunnen for ikke å dekke den
 * (`boxPosition`, avledet direkte av `step.target`, ingen egen state).
 * Dette gjør også at Forrige/Neste alltid ligger på nøyaktig samme sted,
 * slik at man kan klikke seg raskt gjennom uten at blikket må lete etter
 * knappene på nytt for hvert steg.
 *
 * KLIKKBAR FREMDRIFT: prikkene nederst i boksen er nå ekte knapper.
 * `maxVisited` husker det lengste man har kommet, og styrer hvilke prikker
 * som er klikkbare (besøkte steg, inkl. gjeldende) kontra låste
 * (fremtidige, ubesøkte steg) – se goToDot under.
 */
export function CookModeTutorialOverlay({
  lang,
  mode,
  onFinish,
  onExplore,
  onForcedStepChange,
  dontShowAgain,
  onDontShowAgainChange,
}: {
  lang: Lang;
  /** Se CookModeTutorial.tsx sin filheader for hele resonnementet bak de to
   * modusene. Styrer her kun: (1) outro-stegets tekst/knapp-etikett
   * ("Utforsk oppskrifter" vs. "Start matlaging"), og (2) om
   * "ikke vis igjen"-avkrysningen vises i det hele tatt (kun "recipe"). */
  mode: "demo" | "recipe";
  onFinish: () => void;
  onExplore: () => void;
  /** Kalles hver gang gjeldende tutorial-steg endres, med steget sin
   * `forcedRecipeStepId` (eller `null` når steget ikke krever noe bestemt
   * ekte Cook Mode-steg) – videreformidlet til CookMode via
   * CookModeTutorial.tsx sin `forcedStepId`-state. */
  onForcedStepChange: (stepId: string | null) => void;
  /** "Ikke vis denne veiledningen igjen"-avkrysningen (kun mode="recipe") –
   * EID av CookModeTutorial.tsx (samme "controlled"-mønster som
   * forcedStepId over), siden BÅDE denne komponentens egne knapper OG
   * CookMode sin helt separate lukkeknapp må kunne sjekke den siste
   * verdien idet tutorialen avsluttes (se filheaderen i
   * CookModeTutorial.tsx). */
  dontShowAgain: boolean;
  onDontShowAgainChange: (value: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [rings, setRings] = useState<RingRect[]>([]);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  const step = STEPS[index];
  const isFraming = step.target === null; // intro eller avslutning – bred, "editorial" kortvariant
  // Eneste steget der boksen forlater sin faste, midtstilte plass – se
  // filheaderen over.
  const boxPosition: "center" | "bottom" = step.target === "step-text" ? "bottom" : "center";
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  // Outro-steget er den ANDRE av de to "framing"-stegene (isFraming, se
  // over) – intro er isFirst, outro er isFraming && !isFirst siden det bare
  // finnes to slike steg totalt (STEPS[0] og STEPS[STEPS.length - 1]).
  const isOutro = isFraming && !isFirst;

  useEffect(() => {
    setMaxVisited((m) => Math.max(m, index));
  }, [index]);

  useEffect(() => {
    onForcedStepChange(step.forcedRecipeStepId ?? null);
  }, [step.forcedRecipeStepId, onForcedStepChange]);

  // Vindusstørrelsen trengs for selve klippe-stiens YTRE firkant (se
  // spotlightClipPath) – egen, enkel effekt uavhengig av steg-målingen
  // under, siden den bare trenger å oppdateres ved resize, ikke ved hvert
  // stegbytte.
  useEffect(() => {
    function updateViewport() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!step.target) {
      setRect(null);
      setRings([]);
      return;
    }

    function measureOne(targetName: string): SpotlightRect | null {
      const el = document.querySelector(`[data-cookmode-target="${targetName}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }

    /** For "footer"-steget (eneste stedet target er en LISTE, se
     * TutorialStep.target-kommentaren): slår sammen flere elementers egne
     * rektangler til ÉTT omsluttende rektangel. Måler dermed knappene
     * SELV, ikke et wrapper-element med egen CSS-padding rundt dem (se
     * hvorfor det var feil i kommentaren på footer-steget i STEPS over). */
    function measureUnion(targetNames: string[]): SpotlightRect | null {
      const rects = targetNames.map(measureOne).filter((r): r is SpotlightRect => r !== null);
      if (rects.length === 0) return null;
      const top = Math.min(...rects.map((r) => r.top));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.left + r.width));
      const bottom = Math.max(...rects.map((r) => r.top + r.height));
      return { top, left, width: right - left, height: bottom - top };
    }

    function update() {
      const primary = Array.isArray(step.target) ? measureUnion(step.target) : measureOne(step.target!);
      if (!primary) {
        if (step.optional) {
          // Se `optional`-kommentaren over TutorialStep – finnes ikke
          // elementet (f.eks. talestyring i en nettleser uten støtte), hopp
          // rett videre i stedet for å stå fast med et tomt oppslag.
          setIndex((i) => Math.min(i + 1, STEPS.length - 1));
          setRect(null);
          setRings([]);
        }
        // IKKE tøm rect/rings her for andre steg (f.eks. "timer"-steget,
        // som peker på "sett timer"-knappen CookMode kun viser for det
        // TVUNGNE demo-steget, se forcedRecipeStepId). Selve steget her har
        // allerede byttet (dette effekt-kallet kjører), men den tvungne
        // step-endringen i CookMode selv skjer via en state-oppdatering i
        // foreldrekomponenten (onForcedStepChange) – det er én React-runde
        // FORSINKET, så "timer"-knappen finnes ikke i DOM-en ennå akkurat
        // her. Tømmes rings til [] nå, unmountes selve ring-diven, og når
        // settleTimeout under finner den 60ms senere monteres en HELT NY
        // div uten forrige posisjon å gli fra – ringen popper bare inn i
        // stedet for å animere seg dit (Henrik, 28.09.2026: "det mangler en
        // animasjon for når sirkelen går ned til 'sett timer 4 min'"). Ved
        // heller å beholde forrige rects urørt her, fanger settleTimeout
        // opp riktig posisjon rett etterpå, og den ALLEREDE monterte
        // ring-diven glir dit via CSS-transisjonen som normalt.
        return;
      }
      setRect(primary);
      setRings([{ ...primary, shape: step.shape }]);
    }

    update();
    // Ett ekstra oppslag etter layout har fått "satt seg" (f.eks. rett
    // etter at CookMode selv nettopp har byttet til et tvunget steg) –
    // samme forsiktige dobbeltsjekk-mønster som andre steder i kodebasen
    // bruker for DOM-avhengige mål.
    const settleTimeout = setTimeout(update, 60);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(settleTimeout);
    };
  }, [index, step.target, step.optional, step.shape]);

  function goNext() {
    if (isLast) return;
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goPrev() {
    setIndex((i) => Math.max(i - 1, 0));
  }
  function goToDot(i: number) {
    if (i > maxVisited) return; // fremtidige, ubesøkte steg er ikke klikkbare
    setIndex(i);
  }

  const holePadding = step.ringPadding ?? (step.shape === "circle" ? 6 : 10);
  const hole = rect
    ? {
        x: rect.left - holePadding,
        y: rect.top - holePadding,
        w: rect.width + holePadding * 2,
        h: rect.height + holePadding * 2,
        r: step.shape === "circle" ? 9999 : 16,
      }
    : null;
  const clipPathValue = viewport ? `path(evenodd, "${spotlightClipPath(hole, viewport.w, viewport.h)}")` : undefined;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Lag A – usynlig, men fyller HELE skjermen (også "hullet" i Lag B
       * under) og fanger klikk: "trykk hvor som helst for å gå videre".
       * Holdt adskilt fra de rent VISUELLE lagene under, siden et
       * clip-path/backdrop-filter-lag naturlig nok ikke fanger klikk der
       * det selv er klippet bort – uten dette separate, fulle klikk-laget
       * ville "trykk for å gå videre" hatt et dødt felt akkurat der det
       * skarpe elementet er synlig. */}
      <div role="presentation" onClick={goNext} className="fixed inset-0 z-[80] cursor-default" />

      {/* Lag B – selve "kamera-fokus"-blurringen. Se filheaderen for hele
       * resonnementet bak backdrop-filter + clip-path fremfor filter på en
       * forelder. transition-[clip-path] lar utsparingen gli mykt fra ett
       * steg til det neste (samme sti-struktur uansett form, se
       * roundedRectPath). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] backdrop-blur-[5px] transition-[clip-path] duration-500 ease-out"
        style={clipPathValue ? { clipPath: clipPathValue } : undefined}
      />

      {/* Lag C – den skarpe gull-ringen rundt målet, helt uavhengig av
       * blur-laget over (den ligger OVENPÅ det, ikke bak). Alltid ÉN ring –
       * "footer"-steget har to DOM-mål (Forrige+Neste), men de er union'et
       * til ett rect i update() over FØR rings settes, så det er fortsatt
       * bare ett element her som glir helt normalt (position-transisjonen
       * under) fra forrige steg sitt mål til denne. */}
      {rings.map((ring, i) => {
        const pad = step.ringPadding ?? (ring.shape === "circle" ? 6 : 10);
        return (
          <div
            key={i}
            aria-hidden="true"
            className="pointer-events-none fixed z-[80] cookmode-tutorial-pulse transition-[top,left,width,height,border-radius] duration-500 ease-out"
            style={{
              top: ring.top - pad,
              left: ring.left - pad,
              width: ring.width + pad * 2,
              height: ring.height + pad * 2,
              borderRadius: ring.shape === "circle" ? 9999 : 16,
            }}
          />
        );
      })}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, step.titleKey)}
        className={clsx(
          "pointer-events-none fixed left-1/2 z-[81] -translate-x-1/2 px-4",
          // (28.09.2026, Henrik: "gjør tutorial-boksen ca. 10–15 % større...
          // bare litt mer størrelse og luft") – maks-breddene og kortenes
          // egen ytre polstring (px-9/py-10/sm:px-16/sm:py-12 og p-[18px]
          // under) er skalert ~11–14 % opp fra de opprinnelige verdiene.
          // Selve INNHOLDET (tekststørrelser og avstanden mellom elementene
          // inni kortet) er bevisst urørt, slik Henrik ba om.
          isFraming ? "w-full max-w-[40rem]" : "w-[calc(100%-2rem)] max-w-[315px]",
          boxPosition === "bottom" ? "bottom-8 sm:bottom-12" : "top-1/2 -translate-y-1/2",
        )}
      >
        {isFraming ? (
          // Bred, lav "editorial" flate for intro/avslutning – eyebrow +
          // serif-overskrift + undertekst + notis, med god horisontal luft
          // i stedet for den tidligere, nesten kvadratiske modal-boksen.
          <div className="pointer-events-auto rounded-2xl border border-clay/15 bg-cream px-9 py-10 text-center shadow-card-hover sm:px-16 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
              {t(lang, "home.cookMode.eyebrow")}
            </p>
            <p className="mt-3 text-balance font-serif text-2xl leading-snug text-ink sm:text-3xl">
              {/* (29.09.2026) Outro-steget sin titleKey er alltid
               * "cookModeTutorial.navTitle"-etterfølgeren "outroTitle" via
               * step.titleKey som vanlig – i "recipe"-modus vises i stedet
               * den dedikerte "outroTitleRecipe" ("Du er klar til å lage
               * mat!") istedenfor "Du er klar!" (se filheaderen i
               * CookModeTutorial.tsx for hvorfor "utforsk oppskrifter" ikke
               * gir mening når man allerede har valgt en oppskrift). */}
              {t(lang, isOutro && mode === "recipe" ? "cookModeTutorial.outroTitleRecipe" : step.titleKey)}
            </p>
            {isFirst ? (
              <>
                <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-ink-soft sm:text-base">
                  {t(lang, "cookModeTutorial.introSubtitle")}
                </p>
                <p className="mt-2 text-xs text-ink-faint">{t(lang, "cookModeTutorial.introNote")}</p>
              </>
            ) : (
              <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-ink-soft sm:text-base">
                {t(lang, isOutro && mode === "recipe" ? "cookModeTutorial.outroBodyRecipe" : step.bodyKey)}
              </p>
            )}

            {/* (29.09.2026) Vises på ALLE steg i "recipe"-modus, ikke bare
             * outro – "Hopp over" (rett under) er jo også tilgjengelig på
             * ethvert steg, så avkrysningen må være det også: ellers måtte
             * man klikke seg gjennom hele omvisningen bare for å FÅ
             * muligheten til å huke av, noe som ville gjort selve
             * "Hopp over"-knappen nytteløs for noen som vil slippe unna
             * tidlig OG samtidig slippe å se tutorialen igjen. */}
            {mode === "recipe" && (
              <DontShowAgainCheckbox lang={lang} checked={dontShowAgain} onChange={onDontShowAgainChange} />
            )}

            <div className="mt-7 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={onFinish}
                className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark"
              >
                {t(lang, "cookModeTutorial.skip")}
              </button>
              {isFirst ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full bg-clay px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
                >
                  {t(lang, "cookModeTutorial.start")} <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onExplore}
                  className="rounded-full bg-clay px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
                >
                  {t(lang, mode === "recipe" ? "cookModeTutorial.startCooking" : "cookModeTutorial.exploreRecipes")}
                </button>
              )}
            </div>

            <TutorialDots index={index} maxVisited={maxVisited} onSelect={goToDot} />
          </div>
        ) : (
          // Kompakt variant for de faktiske, pekt-ut stegene – selve
          // Cook Mode-elementet (ringen) er hovedpersonen her, boblen skal
          // ikke konkurrere med den om oppmerksomheten.
          <div className="pointer-events-auto rounded-2xl border border-clay/15 bg-cream p-[18px] text-center shadow-card-hover">
            <p className="font-serif text-base leading-snug text-ink">{t(lang, step.titleKey)}</p>
            <p className="mt-1.5 text-xs text-ink-soft">{t(lang, step.bodyKey)}</p>

            {mode === "recipe" && (
              <DontShowAgainCheckbox lang={lang} checked={dontShowAgain} onChange={onDontShowAgainChange} />
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onFinish}
                className="text-[11px] font-medium text-ink-faint transition-colors hover:text-clay-dark"
              >
                {t(lang, "cookModeTutorial.skip")}
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-[11px] font-medium text-ink transition-colors hover:bg-cream-dark"
                  >
                    {t(lang, "cookModeTutorial.previous")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full bg-clay px-3.5 py-1.5 text-[11px] font-medium text-cream transition-colors hover:bg-clay-dark"
                >
                  {t(lang, "cookModeTutorial.next")}
                </button>
              </div>
            </div>

            <TutorialDots index={index} maxVisited={maxVisited} onSelect={goToDot} />
          </div>
        )}
      </div>
    </div>
  );
}

/** (29.09.2026) "Ikke vis denne veiledningen igjen" – kun i mode="recipe"
 * (se CookModeTutorialOverlay-proppene over). Egen liten komponent siden
 * den brukes identisk to steder (begge kortvariantene). Selve verdien
 * lagres ikke her – rent kontrollert (checked/onChange), se
 * CookModeTutorial.tsx sin dontShowAgain-state og
 * persistDontShowAgainIfChecked for HVOR/NÅR den faktisk skrives til
 * profilen. */
function DontShowAgainCheckbox({
  lang,
  checked,
  onChange,
}: {
  lang: Lang;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-line-strong accent-clay"
      />
      {t(lang, "cookModeTutorial.dontShowAgain")}
    </label>
  );
}

/** Diskret "n av m"-erstatning – en rad med små prikker i dempet gull, der
 * den aktive strekker seg til en kort pille. Nå KLIKKBAR (28.09.2026,
 * redesign-runde 2, Henrik: "hvis brukeren har kommet til steg 7, skal
 * steg 1–6 kunne trykkes på for å hoppe direkte tilbake"): hvert steg opp
 * til og med `maxVisited` er en ekte, aktiverbar knapp, fremtidige
 * (ubesøkte) steg er det ikke. Selve knappen (`h-7 w-4`) er bevisst en god
 * del større enn den synlige prikken (`h-1.5`) inni – en usynlig, men
 * trykkbar, "trefflate" rundt hver eneste synlige prikk, som Henrik ba om. */
function TutorialDots({
  index,
  maxVisited,
  onSelect,
}: {
  index: number;
  maxVisited: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-center">
      {STEPS.map((_, i) => {
        const isCurrent = i === index;
        const isVisited = i <= maxVisited;
        return (
          <button
            key={i}
            type="button"
            disabled={!isVisited}
            onClick={() => onSelect(i)}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`${i + 1}/${STEPS.length}`}
            className={clsx(
              "flex h-7 w-4 shrink-0 items-center justify-center",
              isVisited ? "cursor-pointer" : "cursor-default",
            )}
          >
            <span
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300",
                isCurrent ? "w-4 bg-clay" : isVisited ? "w-1.5 bg-clay/50" : "w-1.5 bg-ink-faint/30",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
