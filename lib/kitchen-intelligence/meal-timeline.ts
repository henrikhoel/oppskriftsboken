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
