"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import type { IngredientGroup, RecipeStep } from "@/lib/types";
import { useCookModeState } from "@/lib/hooks/useCookModeState";
import { useCookModeTimers } from "@/lib/hooks/useCookModeTimers";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useVoiceCommands } from "@/lib/hooks/useVoiceCommands";
import { formatShoppingAmount } from "@/lib/utils/shopping-list";
import { Drawer } from "@/components/ui/Drawer";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatDuration, isTimerExpired, isTimerPaused, parseStepDurationMs, remainingMs } from "@/lib/kitchen-intelligence/timers";
import { t, type Lang } from "@/lib/i18n";

/** Spiller en kort, tre-toners varsellyd via Web Audio API – ingen
 * lydfil/npm-avhengighet nødvendig. Best-effort: svelger feil stille (f.eks.
 * autoplay-begrensninger før noen brukerinteraksjon), siden en tidtaker som
 * går ut fortsatt vises tydelig visuelt (se anyExpired/tittel-blink under)
 * selv om lyden av en eller annen grunn ikke spiller. */
function playTimerDoneSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const startTime = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const beepStart = startTime + i * 0.35;
      gain.gain.setValueAtTime(0, beepStart);
      gain.gain.linearRampToValueAtTime(0.3, beepStart + 0.02);
      gain.gain.linearRampToValueAtTime(0, beepStart + 0.28);
      osc.start(beepStart);
      osc.stop(beepStart + 0.3);
    }
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // Se kommentar over – best-effort.
  }
}

interface CookModeProps {
  recipeId: string;
  title: string;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  onClose: () => void;
  lang: Lang;
  /** Valgfri ekstra rad rett under fremdriftslinjen i header – brukt av
   * MultiCookMode.tsx (Fase 5 – Experience, 5.17) til å vise en
   * rette-bytter mellom flere retter i samme måltid. Udefinert ved vanlig
   * ett-oppskrift-bruk (RecipeInteractive.tsx) – ingen visuell endring der.
   * Bevisst en enkel slot fremfor å bygge flere-retter-logikk inn i denne
   * fila, som ellers allerede bærer timere/talestyring/wake lock for ÉN
   * oppskrift om gangen. */
  headerExtra?: ReactNode;
}

export function CookMode({ recipeId, title, ingredientGroups, steps, onClose, lang, headerExtra }: CookModeProps) {
  const { state, toggleIngredient, toggleStep, setCurrentStepIndex } = useCookModeState(recipeId);
  const {
    isSupported: wakeLockSupported,
    isInsecureContext: wakeLockInsecureContext,
    request: requestWakeLock,
    release: releaseWakeLock,
  } = useWakeLock();
  const [showIngredients, setShowIngredients] = useState(false);
  const [showTimers, setShowTimers] = useState(false);
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

  const allIngredientItems = useMemo(
    () => ingredientGroups.flatMap((g) => g.items.map((item) => ({ ...item, groupTitle: g.title }))),
    [ingredientGroups],
  );

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
        <p className="text-sm font-medium uppercase tracking-wider text-clay">
          {t(lang, "cookMode.stepOf", { current: currentIndex + 1, total: steps.length })}
          {currentStep.groupTitle ? ` · ${currentStep.groupTitle}` : ""}
        </p>

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
            onClick={() =>
              startTimer(
                t(lang, "cookMode.timerStepLabel", { number: currentIndex + 1 }),
                currentStep.id,
                suggestedDurationMs,
              )
            }
            className="mx-auto mt-3 flex items-center gap-2 text-sm font-medium text-clay hover:text-clay-dark"
          >
            <ClockIcon className="h-4 w-4" />
            {t(lang, "cookMode.startTimerForStep", { minutes: Math.round(suggestedDurationMs / 60_000) })}
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
            <ul className="space-y-1">
              {allIngredientItems.map((item) => {
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
