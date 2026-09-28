"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { t, type Lang, type DictKey } from "@/lib/i18n";

interface TutorialStep {
  /** Verdien på data-cookmode-target i CookMode.tsx, eller null for de to
   * "ramme"-stegene (intro/avslutning) uten noe spesifikt å peke på. */
  target: string | null;
  shape: "circle" | "box";
  titleKey: DictKey;
  bodyKey: DictKey;
  /** Talestyring finnes kun i nettlesere som støtter Web Speech API (se
   * data-cookmode-target="voice" sin kommentar i CookMode.tsx) – markert
   * `optional` slik at steget hoppes automatisk over når elementet rett og
   * slett ikke finnes i DOM-en, i stedet for å stå fast og peke på tomrom. */
  optional?: boolean;
}

const STEPS: TutorialStep[] = [
  { target: null, shape: "box", titleKey: "cookModeTutorial.introTitle", bodyKey: "cookModeTutorial.introBody" },
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
  { target: "timers", shape: "circle", titleKey: "cookModeTutorial.timersTitle", bodyKey: "cookModeTutorial.timersBody" },
  {
    target: "voice",
    shape: "circle",
    titleKey: "cookModeTutorial.voiceTitle",
    bodyKey: "cookModeTutorial.voiceBody",
    optional: true,
  },
  { target: "footer", shape: "box", titleKey: "cookModeTutorial.navTitle", bodyKey: "cookModeTutorial.navBody" },
  { target: null, shape: "box", titleKey: "cookModeTutorial.outroTitle", bodyKey: "cookModeTutorial.outroBody" },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface BubblePlacement {
  align: "center" | "below" | "above";
  offset: number;
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
 * (28.09.2026, redesignet) Ligger OVENPÅ en allerede åpen, ekte CookMode
 * (se components/cook-mode-tutorial/CookModeTutorial.tsx) og peker – med et
 * getBoundingClientRect()-oppslag mot CookMode.tsx sine
 * data-cookmode-target-attributter – ut én ekte knapp om gangen.
 *
 * "Kamera-fokus"-effekten (Henrik: "resten av Cook Mode er fortsatt synlig,
 * men oppmerksomheten ligger på det tutorialen viser") er BEVISST løst med
 * `backdrop-filter: blur()` + `clip-path` på et SEPARAT lag OVENPÅ CookMode
 * – ALDRI et `filter: blur()` på selve CookMode eller en wrapper rundt den.
 * En CSS `filter` på en forelder ville blurret HELE undertreet, inkludert
 * det som skal være skarpt (ingen måte å "punktere hull" i en filter-blurret
 * flate fra utsiden). `backdrop-filter` løser dette annerledes: laget selv
 * blurrer det som ligger BAK det, og der laget er klippet bort (clip-path,
 * se roundedRectPath/spotlightClipPath over) blurres INGENTING der – man
 * ser rett gjennom til den ene, ekte, skarpe CookMode-instansen. Dermed
 * finnes CookMode kun ÉN gang i DOM-en (ingen duplisert komponent, ingen
 * fare for doble tidtakere/talestyring/tastatur-lyttere), og ingen
 * `position: fixed`-forelder får `filter`/`transform` som ville endret
 * hvilken boks CookMode sine egne fixed-barn er posisjonert i forhold til.
 *
 * Selve gull-ringen (uendret idé fra første runde, kun forenklet CSS – se
 * .cookmode-tutorial-pulse i app/globals.css) ligger som et helt eget,
 * tredje lag OVENPÅ blur-laget, ikke bak det – helt uavhengig av
 * backdrop-filter, alltid skarp.
 *
 * Klikk hvor som helst på det usynlige klikk-laget (Lag A, under) – utenfor
 * selve boblen – går videre til neste steg, i tillegg til den eksplisitte
 * "Neste"-knappen.
 */
export function CookModeTutorialOverlay({
  lang,
  onFinish,
  onExplore,
}: {
  lang: Lang;
  onFinish: () => void;
  onExplore: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [placement, setPlacement] = useState<BubblePlacement>({ align: "center", offset: 0 });
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  const step = STEPS[index];
  const isFraming = step.target === null; // intro eller avslutning – bred, "editorial" kortvariant
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

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
      setPlacement({ align: "center", offset: 0 });
      return;
    }

    function update() {
      const el = document.querySelector(`[data-cookmode-target="${step.target}"]`);
      if (!el) {
        // Se `optional`-kommentaren over TutorialStep – finnes ikke
        // elementet (f.eks. talestyring i en nettleser uten støtte), hopp
        // rett videre i stedet for å stå fast med et tomt oppslag.
        if (step.optional) {
          setIndex((i) => Math.min(i + 1, STEPS.length - 1));
        }
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      const belowSpace = window.innerHeight - r.bottom;
      const aboveSpace = r.top;
      if (belowSpace >= 180 || belowSpace >= aboveSpace) {
        setPlacement({ align: "below", offset: r.bottom + 16 });
      } else {
        setPlacement({ align: "above", offset: window.innerHeight - r.top + 16 });
      }
    }

    update();
    // Ett ekstra oppslag etter layout har fått "satt seg" (f.eks. rett
    // etter at CookMode selv nettopp har montert) – samme forsiktige
    // dobbeltsjekk-mønster som andre steder i kodebasen bruker for
    // DOM-avhengige mål.
    const settleTimeout = setTimeout(update, 60);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(settleTimeout);
    };
  }, [index, step.target, step.optional]);

  function goNext() {
    if (isLast) return;
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goPrev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  const holePadding = step.shape === "circle" ? 6 : 10;
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
       * blur-laget over (den ligger OVENPÅ det, ikke bak). Selve pulsen
       * (.cookmode-tutorial-pulse) er definert i app/globals.css. */}
      {rect && (
        <div
          aria-hidden="true"
          className="cookmode-tutorial-pulse pointer-events-none fixed z-[80] transition-all duration-500 ease-out"
          style={{
            top: rect.top - holePadding,
            left: rect.left - holePadding,
            width: rect.width + holePadding * 2,
            height: rect.height + holePadding * 2,
            borderRadius: step.shape === "circle" ? 9999 : 16,
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, step.titleKey)}
        className={clsx(
          "pointer-events-none fixed left-1/2 z-[81] -translate-x-1/2 px-4",
          isFraming ? "w-full max-w-xl" : "w-[calc(100%-2rem)] max-w-[280px]",
          placement.align === "center" && "top-1/2 -translate-y-1/2",
        )}
        style={
          placement.align === "below"
            ? { top: placement.offset }
            : placement.align === "above"
              ? { bottom: placement.offset }
              : undefined
        }
      >
        {isFraming ? (
          // Bred, lav "editorial" flate for intro/avslutning – eyebrow +
          // serif-overskrift + undertekst + notis, med god horisontal luft
          // i stedet for den tidligere, nesten kvadratiske modal-boksen.
          <div className="pointer-events-auto rounded-2xl border border-clay/15 bg-cream px-8 py-9 text-center shadow-card-hover sm:px-14 sm:py-11">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay">
              {t(lang, "home.cookMode.eyebrow")}
            </p>
            <p className="mt-3 text-balance font-serif text-2xl leading-snug text-ink sm:text-3xl">
              {t(lang, step.titleKey)}
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
                {t(lang, step.bodyKey)}
              </p>
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
                  {t(lang, "cookModeTutorial.exploreRecipes")}
                </button>
              )}
            </div>

            <TutorialDots index={index} />
          </div>
        ) : (
          // Kompakt variant for de faktiske, pekt-ut stegene – selve
          // Cook Mode-elementet (ringen) er hovedpersonen her, boblen skal
          // ikke konkurrere med den om oppmerksomheten.
          <div className="pointer-events-auto rounded-2xl border border-clay/15 bg-cream p-4 text-center shadow-card-hover">
            <p className="font-serif text-base leading-snug text-ink">{t(lang, step.titleKey)}</p>
            <p className="mt-1.5 text-xs text-ink-soft">{t(lang, step.bodyKey)}</p>

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

            <TutorialDots index={index} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Diskret "n av m"-erstatning (Henrik: "føles litt teknisk") – en rad med
 * små prikker i dempet gull, der den aktive strekker seg til en kort pille.
 * Rent visuelt, ingen egen state – kun avledet av `index`. */
function TutorialDots({ index }: { index: number }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
      {STEPS.map((_, i) => (
        <span
          key={i}
          className={clsx(
            "h-1.5 rounded-full transition-all duration-300",
            i === index ? "w-4 bg-clay" : "w-1.5 bg-ink-faint/30",
          )}
        />
      ))}
    </div>
  );
}
