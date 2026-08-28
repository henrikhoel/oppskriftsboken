"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { getStepTimerLabels } from "@/lib/actions/kitchen-intelligence";
import {
  computeMealTaskStream,
  type ExistingMealCourseSlot,
  type MealCourseRole,
  type MealCourseSlot,
} from "@/lib/kitchen-intelligence";
import { useMealCookModeState } from "@/lib/hooks/useMealCookModeState";
import { useCookModeTimers } from "@/lib/hooks/useCookModeTimers";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useVoiceCommands } from "@/lib/hooks/useVoiceCommands";
import { playTimerDoneSound } from "@/lib/utils/timer-sound";
import { formatShoppingAmount } from "@/lib/utils/shopping-list";
import { scaleAmount } from "@/lib/utils/scale";
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
import {
  formatDuration,
  isTimerExpired,
  isTimerPaused,
  parseStepDurationMs,
  remainingMs,
} from "@/lib/kitchen-intelligence/timers";
import type { IngredientGroup, RecipeStep } from "@/lib/types";
import { t, type Lang } from "@/lib/i18n";

/**
 * COOK MODE FOR EN HEL MENY (Fase 5-finale, 5.16/5.17) – ERSTATTER den
 * tidligere dish-switcher-implementasjonen (bytt-hvilken-oppskrifts-CookMode-
 * er-montert). Denne versjonen orkestrerer ÉN flat, kronologisk sortert
 * oppgavestrøm på tvers av ALLE rettene i menyen (se computeMealTaskStream i
 * lib/kitchen-intelligence/meal-timeline.ts) – brukeren ser "det neste
 * riktige jeg bør gjøre på kjøkkenet", ikke "stegene i én oppskrift, så
 * stegene i den neste" (spesifikasjonens presise formulering, 5.16).
 *
 * `currentTaskIndex` peker inn i DENNE ene, flate listen (ikke per-rett
 * indekser) – navigasjon (knapper, piltaster, talekommandoer) flytter denne
 * ene indeksen, akkurat som CookMode.tsx gjør med `currentStepIndex` mot
 * `steps[]`. Egen, meny-scoped tilstand (useMealCookModeState, nøkkelert på
 * `mealId` – IKKE recipeId) og egne, meny-scoped tidtakere
 * (useCookModeTimers kalt med en syntetisk `meal:${mealId}`-nøkkel i stedet
 * for en ekte recipeId – funksjonen bryr seg kun om selve nøkkelstrengen).
 * useWakeLock/useVoiceCommands gjenbrukes helt uendret (bekreftet generiske,
 * ingen oppskrift-kobling) – se lib/hooks-filene deres.
 *
 * Ingen fremdriftsindikator "per rett" i hovedvisningen – i stedet ÉN samlet
 * "Oppgave X av Y"-linje for HELE måltidet, pluss et lite tidsstempel per
 * oppgave. Bevisst enkelt (5.17: "Brukeren skal se NESTE relevante handling,
 * ikke hele prosjektplanen samtidig") i SELVE hovedvisningen.
 *
 * TO NAVIGASJONSHJELPEMIDLER LAGT TIL 26.08.2026 (bruker-tilbakemelding: den
 * rene, flate strømmen alene gjorde det tregt å orientere seg – "må bla mye"
 * for å komme fra én rett til en annen):
 *   1. Rette-faner rett under header (jumpToDish) – hopper `currentTaskIndex`
 *      til NESTE ugjorte oppgave for den valgte retten (eller til rettens
 *      FØRSTE oppgave hvis alt allerede er gjort). Endrer ALDRI selve
 *      rekkefølgen i `tasks` – kun hvor i den ene, flate listen man ser på
 *      akkurat nå, så den kronologiske tidsplanen på tvers av retter forblir
 *      autoritativ.
 *   2. "Se alle gjøremål"-panel (showAllTasks) – viser HELE oppgavestrømmen
 *      på én gang for oversikt/hopp-til-hvilken-som-helst-oppgave, men
 *      erstatter ALDRI hovedvisningen sitt "vis kun det neste"-prinsipp over;
 *      panelet er noe brukeren aktivt henter frem, ikke default-visningen.
 *
 * Krever et gyldig `readyAt` (ønsket spisetidspunkt) for i det hele tatt å
 * kunne bygge oppgavestrømmen – se `noReadyAt`-tilstanden under, som ber
 * brukeren sette tidspunktet i tidslinje-seksjonen først, i stedet for å
 * krasje eller vise en tom skjerm.
 */

interface LoadedDish {
  slotId: string;
  recipeId: string;
  role: MealCourseRole;
  title: string;
  servings: number;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  prepTimeMinutes: number | null;
}

function scaleGroups(groups: IngredientGroup[], fromServings: number, toServings: number): IngredientGroup[] {
  if (fromServings <= 0 || fromServings === toServings) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      amount: scaleAmount(item.amount, fromServings, toServings),
    })),
  }));
}

export function MultiCookMode({
  mealId,
  mealTitle,
  slots,
  readyAt,
  onClose,
  lang,
}: {
  mealId: string;
  mealTitle: string;
  slots: MealCourseSlot[];
  readyAt: string;
  onClose: () => void;
  lang: Lang;
}) {
  const [dishes, setDishes] = useState<LoadedDish[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showTimers, setShowTimers] = useState(false);
  // "Se alle gjøremål" – se filheaderens punkt 2 over.
  const [showAllTasks, setShowAllTasks] = useState(false);

  const timerKey = `meal:${mealId}`;
  const { state, toggleTask, toggleIngredient, setCurrentTaskIndex } = useMealCookModeState(mealId);
  const {
    isSupported: wakeLockSupported,
    isInsecureContext: wakeLockInsecureContext,
    request: requestWakeLock,
    release: releaseWakeLock,
  } = useWakeLock();
  const {
    timers,
    now: timerNow,
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    remove: removeTimer,
    notifyNewlyExpired,
  } = useCookModeTimers(timerKey);

  useEffect(() => {
    let cancelled = false;
    const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");

    async function load() {
      try {
        const data = await getMealShoppingIngredients(existingSlots.map((s) => s.recipeId));
        const byId = new Map(data.map((d) => [d.recipeId, d]));

        const loaded = existingSlots
          .map((slot) => {
            const recipeData = byId.get(slot.recipeId);
            if (!recipeData || recipeData.steps.length === 0) return null;
            const entry: LoadedDish = {
              slotId: slot.id,
              recipeId: slot.recipeId,
              role: slot.role,
              title: slot.title,
              servings: slot.servings,
              ingredientGroups: scaleGroups(recipeData.ingredientGroups, recipeData.baseServings, slot.servings),
              steps: recipeData.steps,
              prepTimeMinutes: recipeData.prepTimeMinutes,
            };
            return entry;
          })
          .filter((d): d is LoadedDish => d !== null);

        if (!cancelled) setDishes(loaded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t(lang, "mealCookMode.error"));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tasks = useMemo(() => {
    if (!dishes) return null;
    return computeMealTaskStream(
      dishes.map((d) => ({
        slotId: d.slotId,
        role: d.role,
        title: d.title,
        steps: d.steps,
        prepTimeMinutes: d.prepTimeMinutes,
      })),
      readyAt,
    );
  }, [dishes, readyAt]);

  const currentIndex = tasks ? Math.min(state.currentTaskIndex, Math.max(tasks.length - 1, 0)) : 0;
  const currentTask = tasks ? tasks[currentIndex] : null;
  const progress = tasks && tasks.length > 0 ? ((currentIndex + 1) / tasks.length) * 100 : 0;

  const suggestedDurationMs = useMemo(
    () => (currentTask ? parseStepDurationMs(currentTask.text) : null),
    [currentTask],
  );

  // Korte tidtaker-navn ("Gryten koker") på tvers av ALLE rettene i menyen –
  // samme funksjon/idé som CookMode.tsx (se dens kommentar), her kalt én
  // gang per rett (egen cache-nøkkel per oppskrift) og slått sammen til ett
  // felles oppslag keyet på steg-id (globalt unike på tvers av retter).
  // `null` = ikke lastet ennå/feilet – faller da tilbake til "Steg N".
  const [stepTimerLabels, setStepTimerLabels] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!dishes) return;
    let cancelled = false;
    const perDish = dishes.map((dish) => {
      const timerWorthySteps = dish.steps
        .filter((s) => parseStepDurationMs(s.text) != null)
        .map((s) => ({ id: s.id, stepNumber: s.stepNumber, text: s.text }));
      if (timerWorthySteps.length === 0) return Promise.resolve<Record<string, string>>({});
      return getStepTimerLabels(dish.recipeId, timerWorthySteps, lang).catch(() => ({}) as Record<string, string>);
    });
    Promise.all(perDish).then((results) => {
      if (!cancelled) setStepTimerLabels(Object.assign({}, ...results));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishes, lang]);

  // Fremdrift PER RETT for rette-fanene – ren utledning fra tasks +
  // checkedTaskIds, ingen egen tilstand. `dishes` (ikke `tasks`) er kilden
  // til selve fane-listen/rekkefølgen, siden den alltid finnes så snart
  // oppskriftene er lastet (uavhengig av om `tasks` kunne beregnes – se
  // `noReadyAt`-tilstanden under).
  const dishProgress = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    if (!tasks) return map;
    for (const task of tasks) {
      const entry = map.get(task.slotId) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (state.checkedTaskIds.includes(task.taskId)) entry.done += 1;
      map.set(task.slotId, entry);
    }
    return map;
  }, [tasks, state.checkedTaskIds]);

  const runningTimerCount = timers.filter((timer) => !isTimerExpired(timer, timerNow) && !isTimerPaused(timer)).length;
  const anyTimerExpired = timers.some((timer) => isTimerExpired(timer, timerNow));

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

  useEffect(() => {
    notifyNewlyExpired(playTimerDoneSound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerNow, timers]);

  function speakCurrentTask() {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !currentTask) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentTask.text);
    utterance.lang = lang === "en" ? "en-US" : "nb-NO";
    window.speechSynthesis.speak(utterance);
  }

  function goNext() {
    if (!tasks) return;
    if (currentIndex < tasks.length - 1) setCurrentTaskIndex(currentIndex + 1);
  }
  function goPrev() {
    if (currentIndex > 0) setCurrentTaskIndex(currentIndex - 1);
  }

  // Rette-fanene (filheaderens punkt 1) – hopper til NESTE ugjorte oppgave
  // for den valgte retten, eller til rettens FØRSTE oppgave dersom alt
  // allerede er merket ferdig (i stedet for å ikke gjøre noe/havne feil sted
  // – gir alltid et forutsigbart, meningsfullt hopp).
  function jumpToDish(slotId: string) {
    if (!tasks) return;
    const nextUndone = tasks.findIndex(
      (task) => task.slotId === slotId && !state.checkedTaskIds.includes(task.taskId),
    );
    const target = nextUndone !== -1 ? nextUndone : tasks.findIndex((task) => task.slotId === slotId);
    if (target !== -1) setCurrentTaskIndex(target);
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
      if (command === "next") goNext();
      else if (command === "previous") goPrev();
      else if (command === "repeat") speakCurrentTask();
      else if (command === "markDone" && currentTask) toggleTask(currentTask.taskId);
    },
  });

  const allIngredientItems = useMemo(
    () =>
      (dishes ?? []).flatMap((dish) =>
        dish.ingredientGroups.flatMap((g) =>
          g.items.map((item) => ({ ...item, dishTitle: dish.title, ingredientKey: `${dish.slotId}:${item.id}` })),
        ),
      ),
    [dishes],
  );

  useEffect(() => {
    requestWakeLock();
    document.body.style.overflow = "hidden";
    return () => {
      releaseWakeLock();
      document.body.style.overflow = "";
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
  }, [currentIndex, tasks?.length]);

  if (error) {
    return (
      <FullScreenMessage onClose={onClose} lang={lang}>
        <p className="text-sm text-clay-dark">{error}</p>
      </FullScreenMessage>
    );
  }

  if (!dishes) {
    return (
      <FullScreenMessage onClose={onClose} lang={lang}>
        <p className="text-sm text-ink-faint">{t(lang, "mealCookMode.loading")}</p>
      </FullScreenMessage>
    );
  }

  if (dishes.length === 0) {
    return (
      <FullScreenMessage onClose={onClose} lang={lang}>
        <p className="text-sm text-ink-faint">{t(lang, "mealCookMode.noCookableDishes")}</p>
      </FullScreenMessage>
    );
  }

  if (!tasks || !currentTask) {
    return (
      <FullScreenMessage onClose={onClose} lang={lang}>
        <p className="text-sm text-ink-faint">{t(lang, "mealCookMode.noReadyAt")}</p>
      </FullScreenMessage>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, "cookMode.dialogAria", { title: mealTitle })}
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
          <p className="truncate font-serif text-base sm:text-lg">{mealTitle}</p>
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
          onClick={() => setShowAllTasks(true)}
          aria-label={t(lang, "mealCookMode.allTasksButtonAria")}
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

      {/* Rette-faner (filheaderens punkt 1) – horisontalt scrollbar rad,
       * én fane per rett i menyen (IKKE per oppgave). Aktiv fane = retten
       * gjeldende oppgave tilhører. Fjerner ALDRI en oppgave fra strømmen
       * eller endrer rekkefølgen – kun et raskt hopp til der man var i den
       * retten (jumpToDish). */}
      {dishes.length > 1 && (
        <div
          role="tablist"
          aria-label={t(lang, "mealCookMode.switcherAria")}
          className="flex gap-2 overflow-x-auto border-b border-ink/10 px-4 py-2.5 sm:px-6"
        >
          {dishes.map((dish) => {
            const active = currentTask.slotId === dish.slotId;
            const progress = dishProgress.get(dish.slotId);
            return (
              <button
                key={dish.slotId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => jumpToDish(dish.slotId)}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "border-clay bg-clay text-cream"
                    : "border-ink/20 text-ink/70 hover:bg-ink/5 hover:text-ink",
                )}
              >
                {dish.title}
                {progress && (
                  <span className={clsx("text-[10px]", active ? "text-cream/80" : "text-ink-faint")}>
                    {progress.done}/{progress.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
      {voiceInsecureContext && (
        <p className="bg-ink/5 px-4 py-1.5 text-center text-[11px] text-ink/50 sm:px-6">
          {t(lang, "cookMode.voiceInsecureContext")}
        </p>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-10 sm:py-10">
        <p className="text-sm font-medium uppercase tracking-wider text-clay">
          {t(lang, "mealCookMode.taskOf", { current: currentIndex + 1, total: tasks.length })}
          {" · "}
          {currentTask.startClockTime}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
          {t(lang, `mealBuilder.role.${currentTask.role}`)} · {currentTask.dishTitle}
        </p>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8">
          <p className="text-balance text-center font-serif text-2xl leading-snug sm:text-3xl md:text-4xl">
            {currentTask.text}
          </p>
        </div>

        <label className="mx-auto flex w-full max-w-2xl cursor-pointer items-center justify-center gap-3 rounded-full border border-ink/20 px-5 py-3 text-sm text-ink/85 transition-colors hover:bg-ink/5">
          <input
            type="checkbox"
            checked={state.checkedTaskIds.includes(currentTask.taskId)}
            onChange={() => toggleTask(currentTask.taskId)}
            className="h-5 w-5 shrink-0 accent-clay"
          />
          {t(lang, "cookMode.markDone")}
        </label>

        {suggestedDurationMs != null && (
          <button
            type="button"
            onClick={() =>
              startTimer(
                `${currentTask.dishTitle} · ${
                  stepTimerLabels?.[currentTask.stepId] ||
                  t(lang, "cookMode.timerStepLabel", { number: currentTask.stepNumber })
                }`,
                currentTask.taskId,
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
        {currentIndex < tasks.length - 1 ? (
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
                const checked = state.checkedIngredientIds.includes(item.ingredientKey);
                return (
                  <li key={item.ingredientKey}>
                    <label
                      className={clsx(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-cream-dark",
                        checked && "text-ink-faint line-through",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIngredient(item.ingredientKey)}
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
                        <span className="ml-1.5 text-xs text-ink-faint">· {item.dishTitle}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* "Se alle gjøremål" (filheaderens punkt 2) – samme mønster/prinsipp
       * som CookMode.tsx sitt tilsvarende panel (se kommentaren der for hele
       * resonnementet bak "eget panel, ikke den delte Drawer-primitiven"):
       * gjeldende oppgave gjentas kompakt øverst i panelet, slik at man ikke
       * mister den av syne mens man ser gjennom/hopper i resten av listen.
       * Her viser hver rad i tillegg rolle + rettens tittel (gjøremålene
       * kommer jo fra FLERE retter, ikke bare ett sett steg). */}
      {showAllTasks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(lang, "mealCookMode.allTasksTitle")}
          className="fixed inset-0 z-30 flex justify-end bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowAllTasks(false)}
        >
          <div className="flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-cream text-ink shadow-card-hover">
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
              <h3 className="font-serif text-lg">{t(lang, "mealCookMode.allTasksTitle")}</h3>
              <button
                type="button"
                onClick={() => setShowAllTasks(false)}
                aria-label={t(lang, "mealCookMode.closeAllTasksAria")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-cream-dark"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-ink/10 bg-cream-dark/40 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-clay">
                {t(lang, "mealCookMode.taskOf", { current: currentIndex + 1, total: tasks.length })}
                {" · "}
                {currentTask.startClockTime}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                {t(lang, `mealBuilder.role.${currentTask.role}`)} · {currentTask.dishTitle}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug sm:text-xl">{currentTask.text}</p>
            </div>

            <ul className="flex-1 overflow-y-auto px-3 py-3">
              {tasks.map((task, i) => {
                const active = i === currentIndex;
                const checked = state.checkedTaskIds.includes(task.taskId);
                return (
                  <li key={task.taskId}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTaskIndex(i);
                        setShowAllTasks(false);
                      }}
                      className={clsx(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        active ? "bg-clay/10" : "hover:bg-cream-dark",
                      )}
                    >
                      <span
                        className={clsx(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                          checked
                            ? "bg-olive text-cream"
                            : active
                              ? "bg-clay text-cream"
                              : "border border-ink/25 text-ink/70",
                        )}
                      >
                        {checked ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                          {task.startClockTime} · {t(lang, `mealBuilder.role.${task.role}`)} · {task.dishTitle}
                        </span>
                        <span
                          className={clsx(
                            "text-sm leading-snug",
                            checked && "text-ink-faint line-through",
                            active && !checked && "font-medium text-ink",
                          )}
                        >
                          {task.text}
                        </span>
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

/** Delt full-skjerm melding (laster/feil/tomt/ingen-tid) – samme mønster som
 * de fire nesten-identiske tilstandene i den forrige dish-switcher-
 * implementasjonen, samlet til ÉN liten hjelpekomponent i stedet for å
 * gjenta samme markup fire ganger. */
function FullScreenMessage({ onClose, lang, children }: { onClose: () => void; lang: Lang; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink"
    >
      {children}
      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
      >
        {t(lang, "mealCookMode.closeButton")}
      </button>
    </div>
  );
}
