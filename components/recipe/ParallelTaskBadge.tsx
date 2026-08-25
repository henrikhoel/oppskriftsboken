import type { ParallelGroupInfo } from "@/lib/kitchen-intelligence/parallel-tasks";
import { t, type Lang } from "@/lib/i18n";

/**
 * Liten bokstav-merking ("A", "B", …) som viser at et steg er del av en
 * AI-foreslått "kan gjøres samtidig"-gruppe (se
 * lib/kitchen-intelligence/parallel-tasks.ts). Bevisst minimal – kun en
 * sirkel med én bokstav, ingen farge-koding eller ekstra tekst i selve
 * steg-linjen – selve forklaringen ligger i title/aria-label (hover/skjermleser)
 * og i den samlede listen under tidsplanen i CookingTimelinePanel.tsx.
 */
export function ParallelTaskBadge({ info, lang }: { info: ParallelGroupInfo; lang: Lang }) {
  return (
    <span
      title={info.note}
      aria-label={t(lang, "recipeDetail.timelineParallelBadgeAria", { note: info.note })}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-clay/50 text-[9px] font-semibold leading-none text-clay-dark"
    >
      {info.letter}
    </span>
  );
}
