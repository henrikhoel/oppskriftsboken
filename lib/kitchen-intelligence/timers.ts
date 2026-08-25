import type { RecipeSessionTimer } from "@/lib/kitchen-intelligence/types";

/**
 * TIDTAKER-MOTOR + STEG-VARIGHET-PARSER. Ren, deterministisk logikk – ingen
 * AI involvert (se den overordnede deterministisk-vs-AI-fordelingen i
 * lib/kitchen-intelligence/types.ts sin filheader). "Flere samtidige
 * oppgaver kan gjøres parallelt"-VARSLINGEN (hvilke steg som faktisk kan
 * gjøres samtidig) er derimot AI – se lib/actions/kitchen-intelligence.ts.
 *
 * Tidtakere lagres som (durationMs, startedAtMs, pausedRemainingMs) i stedet
 * for et løpende "sekunder igjen"-tall, nettopp for å unngå klokke-drift:
 * gjenværende tid regnes alltid ut FRA klokkeslett (`remainingMs(timer,
 * Date.now())`), så en fane som har vært i bakgrunnen eller en telefon som
 * har vært låst gir fortsatt riktig svar med det samme UI-et spør igjen.
 */

/** Fallback-varighet (minutter) for steg der ingen varighet kan tolkes fra
 * teksten – brukt av Reverse Cooking Timeline (timeline.ts) for et rimelig
 * anslag på "aktiv tid" (kutting, røring, plukke frem osv.). */
export const DEFAULT_STEP_MINUTES = 4;

interface DurationMatch {
  ms: number;
  /** Start-/sluttposisjon i teksten – brukt til å avgjøre om to angivelser
   * hører sammen (se sammenslåingen i parseStepDurationMs under). */
  index: number;
  end: number;
}

const HOUR_WORDS = "timer?|timen|hours?|hrs?";
// NB: norsk entall/flertall er IKKE bare "+r" for disse to ("minutt" ->
// "minutter", "sekund" -> "sekunder", ikke "minutte"/"sekunde") – i
// motsetning til "time" -> "timer" under, som faktisk bare legger på "r".
// (?:er)? dekker derfor både entall og flertall her.
const MINUTE_WORDS = "minutt(?:er)?|min\\.?|minutes?|mins?";
const SECOND_WORDS = "sekund(?:er)?|sek\\.?|seconds?|secs?";

/** Tall som tallord ELLER siffer, inkl. norsk komma-desimal og enkle
 * områder ("20-25", "20 til 25") – ved område brukes gjennomsnittet. */
const NUMBER = "(\\d+(?:[.,]\\d+)?)";
const RANGE_SEP = "(?:\\s*(?:[-–]|til|to)\\s*(\\d+(?:[.,]\\d+)?))?";

function buildUnitRegex(words: string): RegExp {
  return new RegExp(`${NUMBER}${RANGE_SEP}\\s*(?:${words})\\b`, "gi");
}

const HOUR_RE = buildUnitRegex(HOUR_WORDS);
const MINUTE_RE = buildUnitRegex(MINUTE_WORDS);
const SECOND_RE = buildUnitRegex(SECOND_WORDS);

function collectMatches(text: string, regex: RegExp, msPerUnit: number): DurationMatch[] {
  const matches: DurationMatch[] = [];
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const a = Number(match[1].replace(",", "."));
    const b = match[2] ? Number(match[2].replace(",", ".")) : null;
    const value = b != null ? (a + b) / 2 : a;
    if (Number.isFinite(value) && value > 0) {
      matches.push({ ms: value * msPerUnit, index: match.index, end: match.index + match[0].length });
    }
  }
  return matches;
}

/** Maks avstand (tegn) mellom to angivelser for at de regnes som ETT
 * sammenhengende tidsuttrykk ("1 time OG 20 minutter") fremfor to separate
 * angivelser – romslig nok til bindeord som " og "/" and " pluss litt slark,
 * men kort nok til at to helt separate setninger ikke slås sammen. */
const ADJACENT_MERGE_MAX_GAP = 12;

/**
 * Tolker den mest sannsynlige "vent i X"-varigheten fra en stegtekst, uten
 * AI. Finner alle time-/minutt-/sekund-angivelser i teksten, slår sammen
 * naboende angivelser til én varighet (så "stek i 1 time og 20 minutter"
 * blir 80 minutter, ikke bare de 60 fra "1 time"), og returnerer deretter
 * den STØRSTE sammenslåtte gruppen – heuristikk: den lengste sammenhengende
 * angivelsen i et steg er som regel selve tilberedningstiden, mens en kort,
 * atskilt biangivelse lenger unna i samme setning ("vent 30 sekunder før du
 * snur") sjeldnere er det brukeren vil sette en synlig kjøkkentimer på.
 *
 * Returnerer null dersom ingen tidsangivelse ble funnet – da faller
 * kallende kode tilbake til DEFAULT_STEP_MINUTES (timeline.ts) eller lar
 * brukeren sette varigheten manuelt (CookMode.tsx).
 */
export function parseStepDurationMs(text: string): number | null {
  if (!text) return null;
  const all = [
    ...collectMatches(text, HOUR_RE, 3_600_000),
    ...collectMatches(text, MINUTE_RE, 60_000),
    ...collectMatches(text, SECOND_RE, 1_000),
  ].sort((a, b) => a.index - b.index);
  if (all.length === 0) return null;

  const groupSums: number[] = [];
  let currentSum = all[0].ms;
  let prevEnd = all[0].end;
  for (let i = 1; i < all.length; i++) {
    const m = all[i];
    if (m.index - prevEnd <= ADJACENT_MERGE_MAX_GAP) {
      currentSum += m.ms;
    } else {
      groupSums.push(currentSum);
      currentSum = m.ms;
    }
    prevEnd = m.end;
  }
  groupSums.push(currentSum);

  return Math.round(Math.max(...groupSums));
}

/** Oppretter og starter en ny tidtaker med det samme. */
export function createTimer(
  id: string,
  label: string,
  stepId: string | null,
  durationMs: number,
  nowMs: number,
): RecipeSessionTimer {
  return { id, label, stepId, durationMs, startedAtMs: nowMs, pausedRemainingMs: null };
}

/** Gjenværende tid akkurat nå, uansett om timeren kjører eller er pauset. */
export function remainingMs(timer: RecipeSessionTimer, nowMs: number): number {
  if (timer.pausedRemainingMs != null) return timer.pausedRemainingMs;
  if (timer.startedAtMs == null) return timer.durationMs;
  return Math.max(0, timer.durationMs - (nowMs - timer.startedAtMs));
}

export function isTimerExpired(timer: RecipeSessionTimer, nowMs: number): boolean {
  return remainingMs(timer, nowMs) <= 0;
}

export function isTimerPaused(timer: RecipeSessionTimer): boolean {
  return timer.pausedRemainingMs != null;
}

export function pauseTimer(timer: RecipeSessionTimer, nowMs: number): RecipeSessionTimer {
  if (isTimerPaused(timer)) return timer;
  return { ...timer, pausedRemainingMs: remainingMs(timer, nowMs), startedAtMs: null };
}

/** Gjenopptar en pauset timer. Merk: `durationMs` blir her satt til den
 * gjenværende tiden ved pause-tidspunktet (ikke den opprinnelige totale
 * varigheten) – timeren teller uansett riktig ned videre, men "opprinnelig
 * varighet" går tapt ved pause/gjenoppta. Uproblematisk siden tidtakere er
 * korte, per-økt objekter uten historikk-krav. */
export function resumeTimer(timer: RecipeSessionTimer, nowMs: number): RecipeSessionTimer {
  if (!isTimerPaused(timer)) return timer;
  return { ...timer, durationMs: timer.pausedRemainingMs ?? timer.durationMs, startedAtMs: nowMs, pausedRemainingMs: null };
}

/** "mm:ss", eller "t:mm:ss" for timer-lange nedtellinger. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
