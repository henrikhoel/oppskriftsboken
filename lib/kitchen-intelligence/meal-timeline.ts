import { computeReverseCookingTimeline, type CookingTimeline } from "@/lib/kitchen-intelligence/timeline";
import type { MealCourseRole } from "@/lib/kitchen-intelligence/types";
import type { RecipeStep } from "@/lib/types";

/**
 * HEL-MENY-TIMELINE (Fase 5 – Experience, 5.8). Bygger DIREKTE på den
 * eksisterende, ett-oppskrift-reverse-timelinen (timeline.ts) – regner ut
 * hver retts EGEN reverse-tidslinje mot DET SAMME ønskede spisetidspunktet,
 * og slår dem sammen til én kronologisk startliste for hele måltidet.
 *
 * Bevisst IKKE et forsøk på å modellere delt kjøkkenkapasitet (kun én
 * stekeovn, én komfyr, én kokk) – det er en vesentlig vanskeligere
 * planleggingsoppgave (ressurs-skedulering, ikke bare regning) som ligger
 * utenfor hva denne kalkulatoren gir seg ut for å løse. Det denne GIR: en
 * ærlig oversikt over når HVER rett for seg selv må starte for å bli ferdig
 * i tide, sortert slik at brukeren ser hva som må startes FØRST på tvers av
 * hele menyen. Samme "bevisst sekvensiell, ingen automatisk
 * samtidighet-gjetting"-holdning som selve steg-timelinen i timeline.ts.
 *
 * Porsjonstall er BEVISST ikke med i beregningen – computeReverseCookingTimeline
 * bryr seg kun om steg-tekst og forberedelsestid, ikke porsjoner (tilberedningstid
 * endrer seg normalt ikke nevneverdig med porsjonstall for en hjemme-middag).
 */

export interface MealTimelineDishInput {
  slotId: string;
  role: MealCourseRole;
  title: string;
  steps: RecipeStep[];
  prepTimeMinutes: number | null;
}

export interface MealTimelineDishEntry {
  slotId: string;
  role: MealCourseRole;
  title: string;
  timeline: CookingTimeline;
}

export interface MealTimeline {
  readyAt: string;
  /** Sortert kronologisk – retten som må startes FØRST står øverst. */
  dishes: MealTimelineDishEntry[];
  /** Det tidligste tidspunktet blant alle rettene – "start her" i praksis.
   * Null kun dersom `dishes` er tom. */
  earliestStartClockTime: string | null;
}

/** Minutter siden midnatt for et "HH:mm"-klokkeslett, for sortering. Samme
 * kjente begrensning som formatClockTime i timeline.ts: en tidslinje som
 * "pakker" over midnatt (svært lang forberedelsestid) kan i sjeldne
 * tilfeller sortere feil, siden vi ikke har noen dato å forankre mot – kun
 * selve klokkeslettet. Aksepteres bevisst, se filheaderen over. */
function clockMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function dishStartClockTime(entry: MealTimelineDishEntry): string {
  return entry.timeline.prepStartClockTime ?? entry.timeline.steps[0]?.startClockTime ?? entry.timeline.readyAt;
}

/**
 * @param dishes Rettene i menyen som faktisk finnes som ekte oppskrifter
 *   (kun "existing"-slots har steg å regne på – "suggested"-forslag har
 *   ingen tidslinje, samme begrunnelse som kombinert handleliste hopper
 *   over dem). Retter uten noen steg (tom liste) hoppes stille over.
 * @param readyAt Menyens ønskede spisetidspunkt, "HH:mm".
 */
export function computeMealTimeline(dishes: MealTimelineDishInput[], readyAt: string): MealTimeline | null {
  const entries: MealTimelineDishEntry[] = [];

  for (const dish of dishes) {
    const timeline = computeReverseCookingTimeline(dish.steps, readyAt, {
      prepTimeMinutes: dish.prepTimeMinutes,
    });
    if (!timeline) continue;
    entries.push({ slotId: dish.slotId, role: dish.role, title: dish.title, timeline });
  }

  if (entries.length === 0) return null;

  entries.sort((a, b) => clockMinutes(dishStartClockTime(a)) - clockMinutes(dishStartClockTime(b)));

  return {
    readyAt: entries[0].timeline.readyAt,
    dishes: entries,
    earliestStartClockTime: dishStartClockTime(entries[0]),
  };
}

/**
 * KRYSSRETT STEG-TIDSLINJE / "TASK STREAM" (Fase 5-finale, 5.16/5.17) – der
 * computeMealTimeline over stopper på RETT-nivå (når må HVER RETT starte),
 * flater denne ut til STEG-nivå: hvert steg i hver rett blir sin egen
 * oppføring, med rettens EGEN reverse-tidslinje (samme
 * computeReverseCookingTimeline-kall) som kilde – deretter én global,
 * kronologisk sortering på tvers av ALLE rettene. Dette ER selve manuset
 * MultiCookMode.tsx bruker: "det neste riktige jeg bør gjøre på kjøkkenet",
 * ikke "stegene i én oppskrift" (spesifikasjonens presise formulering, 5.17).
 *
 * `taskId` (`${slotId}:${stepId}`) er stabil og unik på tvers av retter –
 * brukes direkte som nøkkel i useMealCookModeState sin `checkedTaskIds`.
 *
 * Samme bevisste begrensning som computeMealTimeline (se filheaderen over):
 * INGEN modellering av delt kjøkkenkapasitet (kun én ovn/komfyr) – kun en
 * ærlig, kronologisk rekkefølge på når hvert steg BØR starte om hver rett
 * lages for seg selv. Sortering ved likt klokkeslett er sekundært stabil på
 * rettens posisjon i `dishes`-arrayet (IKKE tilfeldig), slik at et refresh
 * eller ny beregning med samme input alltid gir samme rekkefølge.
 */
export interface MealTaskStreamEntry {
  taskId: string;
  slotId: string;
  role: MealCourseRole;
  dishTitle: string;
  stepId: string;
  stepNumber: number;
  text: string;
  startClockTime: string;
  durationMinutes: number;
  isEstimated: boolean;
}

export function computeMealTaskStream(dishes: MealTimelineDishInput[], readyAt: string): MealTaskStreamEntry[] | null {
  const tasks: MealTaskStreamEntry[] = [];

  for (const dish of dishes) {
    const timeline = computeReverseCookingTimeline(dish.steps, readyAt, {
      prepTimeMinutes: dish.prepTimeMinutes,
    });
    if (!timeline) continue;

    const stepById = new Map(dish.steps.map((step) => [step.id, step]));

    for (const entry of timeline.steps) {
      const step = stepById.get(entry.stepId);
      if (!step) continue;
      tasks.push({
        taskId: `${dish.slotId}:${entry.stepId}`,
        slotId: dish.slotId,
        role: dish.role,
        dishTitle: dish.title,
        stepId: entry.stepId,
        stepNumber: entry.stepNumber,
        text: step.text,
        startClockTime: entry.startClockTime,
        durationMinutes: entry.durationMinutes,
        isEstimated: entry.isEstimated,
      });
    }
  }

  if (tasks.length === 0) return null;

  // Primær: klokkeslett. Sekundær (likt klokkeslett): rettens rekkefølge i
  // `dishes` – se filheaderen over for hvorfor dette må være stabilt, ikke
  // avhengig av innbyrdes array-rekkefølge fra Array.prototype.sort alene
  // (som riktignok ER stabil i moderne JS-motorer, men vi vil ikke stole på
  // det implisitt når en eksplisitt tie-breaker er like billig å skrive).
  const dishOrder = new Map(dishes.map((dish, index) => [dish.slotId, index]));
  tasks.sort((a, b) => {
    const byClock = clockMinutes(a.startClockTime) - clockMinutes(b.startClockTime);
    if (byClock !== 0) return byClock;
    return (dishOrder.get(a.slotId) ?? 0) - (dishOrder.get(b.slotId) ?? 0);
  });

  return tasks;
}
