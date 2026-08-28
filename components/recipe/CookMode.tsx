"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import type { IngredientGroup, RecipeStep } from "@/lib/types";
import type { CookingTimeline } from "@/lib/kitchen-intelligence/timeline";
import { getStepTimerLabels } from "@/lib/actions/kitchen-intelligence";
import { useCookModeState } from "@/lib/hooks/useCookModeState";
import { useCookModeTimers } from "@/lib/hooks/useCookModeTimers";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useVoiceCommands } from "@/lib/hooks/useVoiceCommands";
import { formatShoppingAmount } from "@/lib/utils/shopping-list";
import { playTimerDoneSound } from "@/lib/utils/timer-sound";
import { Drawer } from "@/components/ui/Drawer";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MenuIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatDuration, isTimerExpired, isTimerPaused, parseStepDurationMs, remainingMs } from "@/lib/kitchen-intelligence/timers";
import { t, type Lang } from "@/lib/i18n";

interface CookModeProps {
  recipeId: string;
  title: string;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  onClose: () => void;
  lang: Lang;
  /** Fra "Når bør jeg starte?"-panelet (CookingTimelinePanel.tsx) via
   * RecipeInteractive.tsx sin løftede `cookingTimeline`-state – samme
   * beregnede tidsplan som allerede vises inline i fremgangsmåte-listen
   * utenfor Cook Mode. Udefinert/null når brukeren ikke har regnet ut noen
   * tidsplan ennå (eller har byttet steg-sett siden, se nullstillingen i
   * CookingTimelinePanel.tsx) – da vises rett og slett ingen klokkeslett her,
   * akkurat som i fremgangsmåte-listen. */
  cookingTimeline?: CookingTimeline | null;
  /** Valgfri ekstra rad rett under fremdriftslinjen i header – brukt av
   * MultiCookMode.tsx (Fase 5 – Experience, 5.17) til å vise en
   * rette-bytter mellom flere retter i samme måltid. Udefinert ved vanlig
   * ett-oppskrift-bruk (RecipeInteractive.tsx) – ingen visuell endring der.
   * Bevisst en enkel slot fremfor å bygge flere-retter-logikk inn i denne
   * fila, som ellers allerede bærer timere/talestyring/wake lock for ÉN
   * oppskrift om gangen. */
  headerExtra?: ReactNode;
}

export function CookMode({
  recipeId,
  title,
  ingredientGroups,
  steps,
  onClose,
  lang,
  cookingTimeline,
  headerExtra,
}: CookModeProps) {
  const { state, toggleIngredient, toggleStep, setCurrentStepIndex } = useCookModeState(recipeId);
  const {
    isSupported: wakeLockSupported,
    isInsecureContext: wakeLockInsecureContext,
    request: requestWakeLock,
    release: releaseWakeLock,
  } = useWakeLock();
  const [showIngredients, setShowIngredients] = useState(false);
  const [showTimers, setShowTimers] = useState(false);
  // "Se alle steg" (26.08.2026 – bruker-ønske: å bla ett og ett steg om
  // gangen er tregt når man vil orientere seg i HELE fremgangsmåten – se
  // egen full-panel-oversikt lenger ned, med gjeldende steg fortsatt vist i
  // stor skrift ØVERST i panelet (ikke bare den vesle listen alene), slik at
  // man ikke mister av syne hva man faktisk holder på med mens man ser seg
  // om i resten av oppskriften).
  const [showAllSteps, setShowAllSteps] = useState(false);
  const {
    timers,
    now: timerNow,
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    remove: removeTimer,
    notifyNewlyExpired,
  } = useCookModeTimers(recipeId);

  const currentIndex = Math.min(state.currentStepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[currentIndex];
  const progress = steps.length > 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

  // Foreslått tidtaker-varighet for gjeldende steg, tolket deterministisk
  // fra stegteksten (ingen AI) – se lib/kitchen-intelligence/timers.ts.
  // Null når teksten ikke nevner noen tidsangivelse; da vises ingen
  // forslags-knapp i det hele tatt (i stedet for å gjette).
  const suggestedDurationMs = useMemo(
    () => (currentStep ? parseStepDurationMs(currentStep.text) : null),
    [currentStep],
  );

  // Samme oppslag som RecipeInteractive.tsx gjør for fremgangsmåte-listen
  // utenfor Cook Mode (se cookingTimeline-proppen sin kommentar over) – nå
  // vist for STEGET SOM FAKTISK ER AKTIVT her inne, ikke bare i listen man
  // forlater når man trykker "Start å lage mat".
  const currentStepTimelineEntry = useMemo(
    () => (currentStep ? cookingTimeline?.steps.find((s) => s.stepId === currentStep.id) ?? null : null),
    [cookingTimeline, currentStep],
  );

  // Korte tidtaker-navn ("Gryten koker") for steg med en tidtaker-verdig
  // varighet – hentes samlet én gang når oppskriften åpnes i Cook Mode
  // (ikke på nytt for hvert stegbytte), slik at "start tidtaker"-knappen
  // aldri må vente på et AI-kall midt i matlagingen. `null` = ikke lastet
  // ennå/feilet – da faller vi tilbake til "Steg N" (progressiv
  // forbedring, samme prinsipp som resten av kjøkkenintelligens-laget).
  const [stepTimerLabels, setStepTimerLabels] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timerWorthySteps = steps
      .filter((s) => parseStepDurationMs(s.text) != null)
      .map((s) => ({ id: s.id, stepNumber: s.stepNumber, text: s.text }));
    if (timerWorthySteps.length === 0) {
      setStepTimerLabels({});
      return;
    }
    getStepTimerLabels(recipeId, timerWorthySteps, lang)
      .then((labels) => {
        if (!cancelled) setStepTimerLabels(labels);
      })
      .catch(() => {
        if (!cancelled) setStepTimerLabels({});
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, recipeId, lang]);

  const runningTimerCount = timers.filter((timer) => !isTimerExpired(timer, timerNow) && !isTimerPaused(timer)).length;
  const anyTimerExpired = timers.some((timer) => isTimerExpired(timer, timerNow));

  // Blinker faneteksten mens en tidtaker er utløpt og ikke fjernet ennå –
  // ekstra synlig varsel for de som har byttet fane/vindu mens noe står på.
  // Kjører KUN når anyTimerExpired faktisk endrer verdi (ikke på hvert
  // sekund-tick av timerNow), for å unngå å nullstille intervallet 60
  // ganger i minuttet.
  useEffect(() => {
    if (!anyTimerExpired || typeof document === "undefined") return;
    const originalTitle = document.title;
    let showAlert = false;
    const interval = setInterval(() => {
      document.title = showAlert ? originalTitle : `⏰ ${t(lang, "cookMode.timerDone")}`;
      showAlert = !showAlert;
    }, 1000);
    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyTimerExpired]);

  // Spiller varsellyden nøyaktig én gang per tidtaker som går ut.
  useEffect(() => {
    notifyNewlyExpired(playTimerDoneSound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerNow, timers]);

  // Leser opp gjeldende steg via nettleserens innebygde talesyntese (ingen
  // ekstern tjeneste) – trigges av "gjenta"-kommandoen under, slik at den
  // faktisk har noe å gjenta selv om appen ikke leser steg opp av seg selv.
  function speakCurrentStep() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !currentStep) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentStep.text);
    utterance.lang = lang === "en" ? "en-US" : "nb-NO";
    window.speechSynthesis.speak(utterance);
  }

  const {
    isSupported: voiceSupported,
    isInsecureContext: voiceInsecureContext,
    isListening: voiceListening,
    permissionDenied: voicePermissionDenied,
    start: startVoice,
    stop: stopVoice,
  } = useVoiceCommands({
    lang,
    onCommand: (command) => {
      // Bruker en fersk lukking pr. render (via ref inne i hooken) – trygt
      // å referere currentIndex/steps.length/currentStep/toggleStep direkte
      // her uten stale-closure-fare.
      if (command === "next") goNext();
      else if (command === "previous") goPrev();
      else if (command === "repeat") speakCurrentStep();
      else if (command === "markDone" && currentStep) toggleStep(currentStep.id);
    },
  });

  // Umiddelbar tilbakemelding på "Sett timer"-trykk – se dictionary-
  // kommentaren ved cookMode.timerStartedToast for bakgrunnen (ønsket av
  // Henrik 27.08.2026: ingen synlig endring gjorde at man endte med å
  // trykke flere ganger og sette flere timere på samme steg). To lag:
  // knappen selv viser en kort "✓ Timer startet"-tilstand (og deaktiveres i
  // samme vindu, se justStartedTimerForStep-sjekken på selve knappen under
  // – hindrer nettopp gjentatte trykk fra å opprette dupliserte timere),
  // pluss en stor bekreftelse midt på skjermen (timerToast) med en faktisk
  // inn/ut-animasjon (28.08.2026 – bruker-ønske: den første, lille toppen-
  // varianten var for lett å overse; denne skal være umulig å gå glipp av).
  // `timerToastShown` styrer selve transisjonen (skalering+opacity) atskilt
  // fra `timerToast` (selve teksten/om den skal være montert i det hele
  // tatt), slik at vi kan animere INN (montert men usynlig -> synlig,
  // rAF-forsinket ett steg slik at nettleseren faktisk rekker å registrere
  // start-tilstanden før overgangen trigges) og UT (synlig -> usynlig, og
  // avmonteres først når CSS-transisjonen er ferdig) i stedet for at den
  // bare plutselig dukker opp og forsvinner.
  const [timerToast, setTimerToast] = useState<string | null>(null);
  const [timerToastShown, setTimerToastShown] = useState(false);
  const [justStartedTimerForStep, setJustStartedTimerForStep] = useState<string | null>(null);

  useEffect(() => {
    if (!timerToast) return;
    const showFrame = requestAnimationFrame(() => setTimerToastShown(true));
    const hideTimeout = setTimeout(() => setTimerToastShown(false), 1600);
    const unmountTimeout = setTimeout(() => setTimerToast(null), 1600 + 500);
    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(hideTimeout);
      clearTimeout(unmountTimeout);
    };
  }, [timerToast]);

  useEffect(() => {
    if (!justStartedTimerForStep) return;
    const timeout = setTimeout(() => setJustStartedTimerForStep(null), 1500);
    return () => clearTimeout(timeout);
  }, [justStartedTimerForStep]);

  function handleStartStepTimer() {
    if (!currentStep || suggestedDurationMs == null) return;
    const label =
      stepTimerLabels?.[currentStep.id] || t(lang, "cookMode.timerStepLabel", { number: currentIndex + 1 });
    startTimer(label, currentStep.id, suggestedDurationMs);
    setJustStartedTimerForStep(currentStep.id);
    setTimerToastShown(false);
    setTimerToast(
      t(lang, "cookMode.timerStartedToast", { label, minutes: Math.round(suggestedDurationMs / 60_000) }),
    );
  }

  useEffect(() => {
    requestWakeLock();
    document.body.style.overflow = "hidden";
    return () => {
      releaseWakeLock();
      document.body.style.overflow = "";
      // useVoiceCommands rydder selv opp lytting ved avmontering, men
      // eventuell pågående "gjenta"-opplesning må stoppes eksplisitt her.
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, steps.length]);

  function goNext() {
    if (currentIndex < steps.length - 1) setCurrentStepIndex(currentIndex + 1);
  }
  function goPrev() {
    if (currentIndex > 0) setCurrentStepIndex(currentIndex - 1);
  }

  if (steps.length === 0 || !currentStep) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, "cookMode.dialogAria", { title })}
      className="fixed inset-0 z-50 flex flex-col bg-cream text-ink"
    >
      <header className="flex items-center gap-3 border-b border-ink/10 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          aria-label={t(lang, "cookMode.closeAria")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-ink/10 hover:text-ink"
        >
          <XIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base sm:text-lg">{title}</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/15">
            <div
              className="h-full rounded-full bg-clay transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowIngredients(true)}
          className="shrink-0 rounded-full border border-ink/25 px-3.5 py-2 text-xs font-medium text-ink/90 hover:bg-ink/10 sm:text-sm"
        >
          {t(lang, "cookMode.ingredientsButton")}
        </button>
        <button
          type="button"
          onClick={() => setShowAllSteps(true)}
          aria-label={t(lang, "cookMode.allStepsButtonAria")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/25 text-ink/80 transition-colors hover:bg-ink/10 hover:text-ink"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowTimers(true)}
          aria-label={t(lang, "cookMode.timersButtonAria")}
          className={clsx(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
            anyTimerExpired
              ? "border-clay bg-clay text-cream"
              : "border-ink/25 text-ink/80 hover:bg-ink/10 hover:text-ink",
          )}
        >
          <ClockIcon className="h-5 w-5" />
          {timers.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-olive px-1 text-[10px] font-semibold text-cream">
              {runningTimerCount || timers.length}
            </span>
          )}
        </button>
        {/* Talestyring – vises kun der nettleseren faktisk støtter Web
         * Speech API (feature-detected i useVoiceCommands); ingen
         * synlig, ikke-fungerende knapp i nettlesere uten støtte. */}
        {voiceSupported && (
          <button
            type="button"
            onClick={() => (voiceListening ? stopVoice() : startVoice())}
            aria-pressed={voiceListening}
            aria-label={t(lang, voiceListening ? "cookMode.voiceStopAria" : "cookMode.voiceStartAria")}
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
              voiceListening
                ? "border-clay bg-clay text-cream"
                : "border-ink/25 text-ink/80 hover:bg-ink/10 hover:text-ink",
            )}
          >
            {voiceListening ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
          </button>
        )}
      </header>

      {headerExtra}

      {/* "Timer startet"-bekreftelse midt på skjermen – se
       * cookMode.timerStartedToast-kommentaren i dictionary.ts for
       * bakgrunnen. Bevisst UTEN kort/boks (28.08.2026 – rettet etter
       * tilbakemelding: en avrundet, fylt boks så ut som en generisk
       * dashboard-toast, ikke i tråd med sidens rolige, redaksjonelle
       * linje). I stedet: et mykt, gjennomsiktig slør over selve
       * Cook Mode-bakgrunnen (samme bg-cream, bare med et snev av
       * uskarphet) og ren serif-typografi som glir stille inn og ut – som
       * et kort filmtittel-øyeblikk, ikke et varsel-UI-element.
       * pointer-events-none slik at den aldri kan blokkere trykk på noe
       * under. */}
      {timerToast && (
        <div
          className={clsx(
            "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6 transition-all duration-500 ease-out",
            timerToastShown ? "bg-cream/85 backdrop-blur-sm" : "bg-cream/0 backdrop-blur-0",
          )}
        >
          <div
            className={clsx(
              "flex flex-col items-center gap-2.5 text-center transition-all duration-500 ease-out",
              timerToastShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <ClockIcon className="h-6 w-6 text-clay" />
            <p className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "cookMode.timerStartedButton")}</p>
            <p className="text-base text-ink-faint sm:text-lg">{timerToast}</p>
          </div>
        </div>
      )}

      {/* Vises kun når nettleseren virkelig mangler støtte for Wake Lock –
       * ikke ved testing over usikker http:// (se cookMode.wakeLockInsecure
       * under), som er en midlertidig testeforutsetning, ikke en reell
       * begrensning. */}
      {!wakeLockSupported && !wakeLockInsecureContext && (
        <p className="bg-ink/5 px-4 py-1.5 text-center text-[11px] text-ink/50 sm:px-6">
          {t(lang, "cookMode.screenLockWarning")}
        </p>
      )}
      {wakeLockInsecureContext && (
        <p className="bg-ink/5 px-4 py-1.5 text-center text-[11px] text-ink/50 sm:px-6">
          {t(lang, "cookMode.wakeLockInsecureContext")}
        </p>
      )}
      {voiceListening && (
        <p className="bg-clay/10 px-4 py-1.5 text-center text-[11px] text-clay-dark sm:px-6">
          {t(lang, "cookMode.voiceListening")}
        </p>
      )}
      {voicePermissionDenied && (
        <p className="bg-ink/5 px-4 py-1.5 text-center text-[11px] text-ink/50 sm:px-6">
          {t(lang, "cookMode.voicePermissionDenied")}
        </p>
      )}
      {/* Vises når nettleseren normalt støtter talestyring, men siden
       * kjører i en usikker kontekst (vanlig http://, f.eks. når man tester
       * dev-serveren fra telefonen via LAN-IP) – da finnes ikke
       * SpeechRecognition-konstruktøren i det hele tatt, så uten denne
       * meldingen ville mikrofonknappen bare vært usynlig og se ut som en
       * feil. Ingen kodefeil å fikse her – funksjonen virker av seg selv
       * så snart siden kjører på https (f.eks. i produksjon). */}
      {voiceInsecureContext && (
        <p className="bg-ink/5 px-4 py-1.5 text-center text-[11px] text-ink/50 sm:px-6">
          {t(lang, "cookMode.voiceInsecureContext")}
        </p>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium uppercase tracking-wider text-clay">
            {t(lang, "cookMode.stepOf", { current: currentIndex + 1, total: steps.length })}
            {currentStep.groupTitle ? ` · ${currentStep.groupTitle}` : ""}
          </p>
          {currentStepTimelineEntry && (
            <p className="text-sm font-medium text-clay-dark">
              {t(lang, "recipeDetail.stepStartTime", { time: currentStepTimelineEntry.startClockTime })}
              {currentStepTimelineEntry.isEstimated ? " *" : ""}
            </p>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8">
          <p className="text-balance text-center font-serif text-2xl leading-snug sm:text-3xl md:text-4xl">
            {currentStep.text}
          </p>
        </div>

        <label className="mx-auto flex w-full max-w-2xl cursor-pointer items-center justify-center gap-3 rounded-full border border-ink/20 px-5 py-3 text-sm text-ink/85 transition-colors hover:bg-ink/5">
          <input
            type="checkbox"
            checked={state.checkedSteps.includes(currentStep.id)}
            onChange={() => toggleStep(currentStep.id)}
            className="h-5 w-5 shrink-0 accent-clay"
          />
          {t(lang, "cookMode.markDone")}
        </label>

        {suggestedDurationMs != null && (
          <button
            type="button"
            onClick={handleStartStepTimer}
            disabled={justStartedTimerForStep === currentStep.id}
            className="mx-auto mt-3 flex items-center gap-2 text-sm font-medium text-clay transition-colors hover:text-clay-dark disabled:cursor-default disabled:text-olive"
          >
            {justStartedTimerForStep === currentStep.id ? (
              <>
                <CheckIcon className="h-4 w-4" />
                {t(lang, "cookMode.timerStartedButton")}
              </>
            ) : (
              <>
                <ClockIcon className="h-4 w-4" />
                {t(lang, "cookMode.startTimerForStep", { minutes: Math.round(suggestedDurationMs / 60_000) })}
              </>
            )}
          </button>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-ink/10 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/20 py-4 text-base font-medium text-ink disabled:opacity-30 sm:text-lg"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          {t(lang, "cookMode.previous")}
        </button>
        {currentIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-clay py-4 text-base font-medium text-cream sm:text-lg"
          >
            {t(lang, "cookMode.next")}
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-olive py-4 text-base font-medium text-cream sm:text-lg"
          >
            <CheckIcon className="h-5 w-5" />
            {t(lang, "cookMode.done")}
          </button>
        )}
      </footer>

      {showIngredients && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(lang, "cookMode.ingredientsTitle")}
          className="fixed inset-0 z-10 flex flex-col justify-end bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setShowIngredients(false)}
        >
          <div className="max-h-[75vh] overflow-y-auto rounded-t-3xl bg-paper px-5 pb-8 pt-5 text-ink sm:px-8">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line-strong" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl">{t(lang, "cookMode.ingredientsTitle")}</h3>
              <button
                type="button"
                onClick={() => setShowIngredients(false)}
                aria-label={t(lang, "cookMode.closeIngredientsAria")}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cream-dark"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {/* Gruppert etter ingrediensgruppe (27.08.2026 – bruker-
             * tilbakemelding: "salat"/"brød"-inndelingen fra selve
             * oppskriftssiden manglet helt her inne, alt lå i én lang,
             * uinndelt liste). Samme visningsmønster som RecipeInteractive.tsx
             * sin ingrediensliste utenfor Cook Mode: overskrift kun når
             * gruppen faktisk har en tittel (mange oppskrifter har bare én,
             * uten navngitt gruppe). */}
            <div className="space-y-5">
              {ingredientGroups.map((group) => (
                <div key={group.id}>
                  {group.title && <h4 className="mb-2 font-serif text-base text-ink-soft">{group.title}</h4>}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const checked = state.checkedIngredients.includes(item.id);
                      return (
                        <li key={item.id}>
                          <label
                            className={clsx(
                              "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-cream-dark",
                              checked && "text-ink-faint line-through",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleIngredient(item.id)}
                              className="h-5 w-5 shrink-0 accent-clay"
                            />
                            <span>
                              {formatShoppingAmount({
                                id: item.id,
                                amount: null,
                                displayAmount: item.amount,
                                unit: item.unit,
                                name: item.name,
                                checked: false,
                                fromRecipes: [],
                              })}{" "}
                              {item.name}
                              {item.note ? ` (${item.note})` : ""}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* "Se alle steg" (26.08.2026) – EGET panel, IKKE den delte Drawer-
       * primitiven (som er et bunn-ark som dekker det meste av skjermen) –
       * dette skal kunne vises SAMTIDIG som gjeldende steg fortsatt er
       * synlig i stor skrift, jf. bruker-ønsket. Løst ved at gjeldende steg
       * gjentas kompakt (men fortsatt tydelig, egen seksjon) ØVERST i selve
       * panelet, over listen – ikke ved å la panelet være gjennomsiktig/
       * delvis (ville vært for smalt til å faktisk lese listen på mobil).
       * Sklir inn fra høyre ("på siden") og tar det meste av bredden på
       * mobil, smalere på større skjermer – samme "bevisst enkel, ingen
       * animasjonsbibliotek"-linje som Drawer.tsx. */}
      {showAllSteps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(lang, "cookMode.allStepsTitle")}
          className="fixed inset-0 z-30 flex justify-end bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowAllSteps(false)}
        >
          <div className="flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-cream text-ink shadow-card-hover">
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
              <h3 className="font-serif text-lg">{t(lang, "cookMode.allStepsTitle")}</h3>
              <button
                type="button"
                onClick={() => setShowAllSteps(false)}
                aria-label={t(lang, "cookMode.closeAllStepsAria")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-cream-dark"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-ink/10 bg-cream-dark/40 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-clay">
                {t(lang, "cookMode.stepOf", { current: currentIndex + 1, total: steps.length })}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug sm:text-xl">{currentStep.text}</p>
            </div>

            <ul className="flex-1 overflow-y-auto px-3 py-3">
              {steps.map((step, i) => {
                const active = i === currentIndex;
                const checked = state.checkedSteps.includes(step.id);
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStepIndex(i);
                        setShowAllSteps(false);
                      }}
                      className={clsx(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        active ? "bg-clay/10" : "hover:bg-cream-dark",
                      )}
                    >
                      <span
                        className={clsx(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                          checked
                            ? "bg-olive text-cream"
                            : active
                              ? "bg-clay text-cream"
                              : "border border-ink/25 text-ink/70",
                        )}
                      >
                        {checked ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span
                        className={clsx(
                          "text-sm leading-snug",
                          checked && "text-ink-faint line-through",
                          active && !checked && "font-medium text-ink",
                        )}
                      >
                        {step.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <Drawer
        open={showTimers}
        onClose={() => setShowTimers(false)}
        title={t(lang, "cookMode.timersTitle")}
        closeLabel={t(lang, "cookMode.closeTimersAria")}
      >
        {timers.length === 0 ? (
          <p className="py-4 text-sm text-ink-faint">{t(lang, "cookMode.noTimers")}</p>
        ) : (
          <ul className="space-y-2">
            {timers.map((timer) => {
              const expired = isTimerExpired(timer, timerNow);
              const paused = isTimerPaused(timer);
              return (
                <li
                  key={timer.id}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl border px-4 py-3",
                    expired ? "border-clay bg-clay/10" : "border-line",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{timer.label}</p>
                    <p className={clsx("font-serif text-2xl", expired ? "text-clay-dark" : "text-ink")}>
                      {expired ? t(lang, "cookMode.timerDone") : formatDuration(remainingMs(timer, timerNow))}
                    </p>
                  </div>
                  {!expired && (
                    <button
                      type="button"
                      onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
                      aria-label={t(lang, paused ? "cookMode.resumeTimerAria" : "cookMode.pauseTimerAria")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/20 text-ink/80 hover:bg-cream-dark"
                    >
                      {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTimer(timer.id)}
                    aria-label={t(lang, "cookMode.removeTimerAria")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/20 text-ink/80 hover:bg-cream-dark"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>
    </div>
  );
}
