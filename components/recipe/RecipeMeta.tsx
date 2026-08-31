import type { ReactNode } from "react";
import { ClockIcon, GaugeIcon, UsersIcon } from "@/components/ui/icons";
import { difficultyLabel, formatMinutes, formatMinutesRange } from "@/lib/utils/format";
import type { Difficulty } from "@/lib/config";

/**
 * Metadata-raden (forberedelse/tilberedning/totalt/porsjoner/nivå) – tidligere
 * fem separate bokser (rounded-card, border, bg-paper), som kjentes tunge og
 * dashboard-aktige ut i heroen (designforbedring 31.08.2026, spesifikasjonens
 * punkt 3). Erstattet med ÉN rolig horisontal rad: ren typografi + tynne
 * vertikale skillelinjer i stedet for bokser. Skillelinjene kommer først fra
 * sm og opp, der raden alltid har plass til å stå på én linje – på mobil
 * bryter den fritt over flere linjer (flex-wrap), og en skillelinje midt i
 * en brutt rad ville sett feil ut, så der er det kun luft (gap) mellom hvert
 * element.
 */
function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:border-l sm:border-line sm:pl-6 sm:first:border-0 sm:first:pl-0">
      <span className="text-ink-faint">{icon}</span>
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-sm text-ink sm:text-base">{value}</span>
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
      </span>
    </div>
  );
}

const META_LABELS = {
  no: { prep: "Forberedelse", cook: "Tilberedning", total: "Totalt", servings: "Porsjoner", level: "Nivå" },
  en: { prep: "Prep", cook: "Cook", total: "Total", servings: "Servings", level: "Level" },
} as const;

export function RecipeMeta({
  prepTimeMinutes,
  cookTimeMinutes,
  cookTimeMinutesMax,
  totalTimeMinutes,
  servings,
  difficulty,
  lang = "no",
}: {
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cookTimeMinutesMax?: number | null;
  totalTimeMinutes: number | null;
  servings: number;
  difficulty: Difficulty;
  lang?: "no" | "en";
}) {
  const labels = META_LABELS[lang];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-0">
      <MetaItem icon={<ClockIcon className="h-4 w-4" />} label={labels.prep} value={formatMinutes(prepTimeMinutes, lang)} />
      <MetaItem
        icon={<ClockIcon className="h-4 w-4" />}
        label={labels.cook}
        value={formatMinutesRange(cookTimeMinutes, cookTimeMinutesMax, lang)}
      />
      <MetaItem icon={<ClockIcon className="h-4 w-4" />} label={labels.total} value={formatMinutes(totalTimeMinutes, lang)} />
      <MetaItem icon={<UsersIcon className="h-4 w-4" />} label={labels.servings} value={String(servings)} />
      <MetaItem icon={<GaugeIcon className="h-4 w-4" />} label={labels.level} value={difficultyLabel(difficulty, lang)} />
    </div>
  );
}
