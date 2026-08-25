"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { createTimer, pauseTimer, remainingMs, resumeTimer } from "@/lib/kitchen-intelligence/timers";
import type { RecipeSessionTimer } from "@/lib/kitchen-intelligence/types";

/**
 * Flere-samtidige-tidtakere for Cook Mode. Egen, liten localStorage-nøkkel
 * (`oppskriftsboken:timers:${recipeId}`) – BEVISST separat fra den fulle
 * RecipeSession (lib/hooks/useRecipeSession.ts), som ennå ikke er koblet
 * inn i Cook Mode (se filhead i useRecipeSession.ts). Når en senere fase
 * kobler resten av RecipeSession inn i Cook Mode, kan denne slås sammen med
 * den – timers-feltet i RecipeSession har allerede nøyaktig samme form
 * (RecipeSessionTimer[]), så det er en ren flytting av lagringssted den
 * dagen, ingen ny datamodell.
 *
 * `now` oppdateres hvert sekund og er det eneste som trigger re-render for
 * selve nedtellingen – gjenværende tid regnes alltid ut fra klokkeslett
 * (remainingMs), aldri ved å telle ned en lagret verdi, se timers.ts.
 */
export function useCookModeTimers(recipeId: string) {
  const [timers, setTimers, hydrated] = useLocalStorage<RecipeSessionTimer[]>(
    `oppskriftsboken:timers:${recipeId}`,
    [],
  );
  const [now, setNow] = useState<number>(() => Date.now());
  const previouslyExpiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = useCallback(
    (label: string, stepId: string | null, durationMs: number) => {
      const id = `timer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setTimers((prev) => [...prev, createTimer(id, label, stepId, durationMs, Date.now())]);
    },
    [setTimers],
  );

  const pause = useCallback(
    (timerId: string) => {
      setTimers((prev) => prev.map((timer) => (timer.id === timerId ? pauseTimer(timer, Date.now()) : timer)));
    },
    [setTimers],
  );

  const resume = useCallback(
    (timerId: string) => {
      setTimers((prev) => prev.map((timer) => (timer.id === timerId ? resumeTimer(timer, Date.now()) : timer)));
    },
    [setTimers],
  );

  const remove = useCallback(
    (timerId: string) => {
      previouslyExpiredRef.current.delete(timerId);
      setTimers((prev) => prev.filter((timer) => timer.id !== timerId));
    },
    [setTimers],
  );

  /** Kaller `onExpire` NØYAKTIG ÉN GANG per tidtaker, idet den går fra
   * "kjører" til "utløpt" – kalleren (CookMode.tsx) bruker dette til å
   * spille en varsellyd, uten å måtte holde styr på det selv eller risikere
   * at lyden spilles på hvert eneste sekund-tick etterpå. */
  function notifyNewlyExpired(onExpire: (timer: RecipeSessionTimer) => void) {
    for (const timer of timers) {
      const expired = remainingMs(timer, now) <= 0 && timer.startedAtMs != null;
      if (expired && !previouslyExpiredRef.current.has(timer.id)) {
        previouslyExpiredRef.current.add(timer.id);
        onExpire(timer);
      }
      if (!expired) {
        previouslyExpiredRef.current.delete(timer.id);
      }
    }
  }

  return { timers, hydrated, now, start, pause, resume, remove, notifyNewlyExpired };
}
