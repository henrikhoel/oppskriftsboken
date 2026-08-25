import type { RecipeStep } from "@/lib/types";
import { DEFAULT_STEP_MINUTES, parseStepDurationMs } from "@/lib/kitchen-intelligence/timers";

/**
 * REVERSE COOKING TIMELINE ("Middag kl. …") – ren, deterministisk regning.
 * Går BAKLENGS fra et ønsket spisetidspunkt: summerer varigheten til alle
 * steg (tolket fra teksten via parseStepDurationMs, eller et anslag der
 * ingenting kan tolkes), og regner ut hvilket klokkeslett hvert steg bør
 * starte for at retten er ferdig i tide.
 *
 * Bevisst SEKVENSIELL i denne fasen – steg regnes ett etter ett, ingen
 * automatisk oppdaging av at f.eks. "stek i ovnen" og "kutt salat" kan
 * gjøres SAMTIDIG. Det er en egen, AI-drevet forbedring (se
 * lib/actions/kitchen-intelligence.ts -> getParallelTaskHints) som kan
 * korte ned den sekvensielle tidslinjen når/hvis brukeren ber om det, ikke
 * noe denne kalkulatoren gjetter på selv – en for optimistisk automatisk
 * sammenslåing av steg ville gitt et tidspunkt som ikke er til å stole på,
 * som er verre enn et forsiktig (litt for tidlig) estimat.
 */

const DEFAULT_PREP_MINUTES = 10;

export interface TimelineStepEntry {
  stepId: string;
  stepNumber: number;
  /** "HH:mm" – tidspunktet dette steget bør starte. */
  startClockTime: string;
  durationMinutes: number;
  /** true = varigheten er et generelt anslag (DEFAULT_STEP_MINUTES), ikke
   * tolket fra selve stegteksten – lar UI-et signalisere at tallet er
   * usikkert og kan justeres. */
  isEstimated: boolean;
}

export interface CookingTimeline {
  readyAt: string;
  /** Når forberedelser (mise en place) bør starte, dersom det er forskjell
   * fra selve steg 1 – null dersom det ikke er noen forberedelsestid å
   * legge til. */
  prepStartClockTime: string | null;
  steps: TimelineStepEntry[];
  totalMinutes: number;
}

function parseClockTime(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Normaliserer til 0–1439 (kan "pakke" over midnatt begge veier – naturlig
 * for en tidslinje som regnes baklengs og fint kan starte kvelden før). */
function formatClockTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * @param steps Oppskriftens steg, i rekkefølge.
 * @param readyAt Ønsket spisetidspunkt, "HH:mm".
 * @param options.prepTimeMinutes Oppskriftens oppgitte forberedelsestid
 *   (Recipe.prepTimeMinutes) – null/undefined bruker DEFAULT_PREP_MINUTES.
 * @param options.durationOverridesMs Bruker-justerte varigheter per steg-id
 *   (fra RecipeSession/CookMode), forrang foran tekst-tolkning.
 */
export function computeReverseCookingTimeline(
  steps: RecipeStep[],
  readyAt: string,
  options?: { prepTimeMinutes?: number | null; durationOverridesMs?: Record<string, number> },
): CookingTimeline | null {
  const readyMinutes = parseClockTime(readyAt);
  if (readyMinutes == null || steps.length === 0) return null;

  const overrides = options?.durationOverridesMs ?? {};
  const entries = steps.map((step) => {
    const overrideMs = overrides[step.id];
    const parsedMs = overrideMs ?? parseStepDurationMs(step.text);
    const isEstimated = overrideMs == null && parsedMs == null;
    const durationMinutes = isEstimated ? DEFAULT_STEP_MINUTES : Math.round((parsedMs as number) / 60_000);
    return { step, durationMinutes, isEstimated };
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const firstStepStart = readyMinutes - totalMinutes;

  let cursor = firstStepStart;
  const timelineSteps: TimelineStepEntry[] = entries.map((e) => {
    const entry: TimelineStepEntry = {
      stepId: e.step.id,
      stepNumber: e.step.stepNumber,
      startClockTime: formatClockTime(cursor),
      durationMinutes: e.durationMinutes,
      isEstimated: e.isEstimated,
    };
    cursor += e.durationMinutes;
    return entry;
  });

  const prepMinutes = options?.prepTimeMinutes ?? DEFAULT_PREP_MINUTES;
  const prepStartClockTime = prepMinutes > 0 ? formatClockTime(firstStepStart - prepMinutes) : null;

  return {
    readyAt: formatClockTime(readyMinutes),
    prepStartClockTime,
    steps: timelineSteps,
    totalMinutes,
  };
}
