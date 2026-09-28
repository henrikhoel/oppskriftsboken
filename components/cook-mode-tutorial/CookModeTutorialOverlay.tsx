"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { t, type Lang, type DictKey } from "@/lib/i18n";

interface TutorialStep {
  /** Verdien på data-cookmode-target i CookMode.tsx, eller null for de to
   * sentrerte "ramme"-stegene (intro/outro) uten noe spesifikt å peke på. */
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

/**
 * (28.09.2026) Ligger OVENPÅ en allerede åpen, ekte CookMode (se
 * components/cook-mode-tutorial/CookModeTutorial.tsx) og peker – med et
 * enkelt getBoundingClientRect()-oppslag mot CookMode.tsx sine
 * data-cookmode-target-attributter – ut én ekte knapp om gangen, med en kort
 * forklaring. Bevisst IKKE en generisk "spotlight-bibliotek"-løsning: ingen
 * SVG-maske, kun et fast-posisjonert lag med en enorm box-shadow
 * ("spotlight"-trikset – se ring-diven under) som lager utsparingen rundt
 * målet, i tråd med sidens ellers enkle, biblioteksfrie linje (samme
 * tilnærming som Drawer.tsx/CookMode.tsx sine egne paneler).
 *
 * Klikk hvor som helst på det nedtonede laget (utenfor selve boblen) går
 * videre til neste steg – en vanlig, forventet snarvei i denne typen
 * gjennomgang, i tillegg til den eksplisitte "Neste"-knappen.
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

  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

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

  const padding = step.shape === "circle" ? 6 : 10;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Lag A – usynlig, men fyller HELE skjermen og fanger klikk: "trykk
       * hvor som helst for å gå videre". Holdt adskilt fra det rent
       * VISUELLE nedtonings-/spotlight-laget under (Lag B), fordi en
       * box-shadow (som Lag B bruker til å male ut resten av skjermen mørk
       * rundt målet) aldri selv fanger klikk i nettlesere – uten dette
       * separate, fulle klikk-laget ville "trykk for å gå videre" sluttet å
       * virke i det øyeblikket et mål faktisk er lyssatt. */}
      <div
        role="presentation"
        onClick={goNext}
        className="fixed inset-0 z-[80] cursor-default"
      />

      {/* Lag B – rent visuelt: enten et jevnt nedtonet lag (ingen mål, f.eks.
       * intro/avslutning), eller en liten ring nøyaktig over målknappen med
       * en enorm box-shadow-spredning som "spotlight"-triks – se
       * filheaderen. pointer-events-none slik at Lag A under fortsatt tar
       * imot klikk overalt, også over selve den lyssatte knappen (med
       * vilje: et trykk der skal gå videre i tutorialen, ikke trigge den
       * ekte knappen bak).
       *
       * Ringen får en myk, gjentakende puls (.cookmode-tutorial-pulse, se
       * app/globals.css) i stedet for en pil som skulle pekt fra boblen til
       * målet – vurdert og bevisst droppet 28.09.2026 (for risikabelt å
       * treffe geometrisk pent på tvers av 8 svært ulike mål-former uten å
       * kunne se resultatet visuelt selv, se globals.css sin kommentar for
       * hele resonnementet). Boks-skyggen selv styres av CSS-animasjonen,
       * ikke av inline style her – kun posisjon/størrelse/fasong er inline. */}
      <div
        aria-hidden="true"
        className={clsx(
          "pointer-events-none fixed z-[80] transition-[top,left,width,height] duration-300 ease-out",
          rect ? "cookmode-tutorial-pulse" : "inset-0 bg-ink/70",
        )}
        style={
          rect
            ? {
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
                borderRadius: step.shape === "circle" ? 9999 : 16,
              }
            : undefined
        }
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, step.titleKey)}
        className={clsx(
          "pointer-events-none fixed left-1/2 z-[81] w-[calc(100%-2rem)] max-w-xs -translate-x-1/2",
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
        <div className="pointer-events-auto rounded-2xl bg-cream p-5 text-center shadow-card-hover">
          <p className="font-serif text-lg leading-snug text-ink">{t(lang, step.titleKey)}</p>
          <p className="mt-2 text-sm text-ink-faint">{t(lang, step.bodyKey)}</p>

          {isLast ? (
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onExplore}
                className="rounded-full bg-clay px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
              >
                {t(lang, "cookModeTutorial.exploreRecipes")}
              </button>
              <button
                type="button"
                onClick={onFinish}
                className="rounded-full px-5 py-2 text-sm font-medium text-ink-faint transition-colors hover:text-clay-dark"
              >
                {t(lang, "cookModeTutorial.close")}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onFinish}
                className="text-xs font-medium text-ink-faint transition-colors hover:text-clay-dark"
              >
                {t(lang, "cookModeTutorial.skip")}
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="rounded-full border border-line-strong px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-cream-dark"
                  >
                    {t(lang, "cookModeTutorial.previous")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full bg-clay px-4 py-2 text-xs font-medium text-cream transition-colors hover:bg-clay-dark"
                >
                  {t(lang, "cookModeTutorial.next")}
                </button>
              </div>
            </div>
          )}

          {/* Enkel "n av m"-indikator – tall trenger ingen oversettelse. */}
          <p className="mt-3 text-[11px] tracking-wider text-ink-faint/70">
            {index + 1}/{STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}
