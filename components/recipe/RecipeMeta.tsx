import type { ReactNode } from "react";
import { ClockIcon, GaugeIcon, UsersIcon } from "@/components/ui/icons";
import { difficultyLabel, formatMinutes, formatMinutesRange } from "@/lib/utils/format";
import type { Difficulty } from "@/lib/config";

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-card border border-line bg-paper px-3 py-3.5 text-center sm:px-4">
      <span className="text-ink-faint">{icon}</span>
      <span className="font-serif text-base text-ink sm:text-lg">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
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
  /** Valgfri øvre grense for et intervall, se lib/types.ts. */
  cookTimeMinutesMax?: number | null;
  totalTimeMinutes: number | null;
  servings: number;
  difficulty: Difficulty;
  lang?: "no" | "en";
}) {
  const labels = META_LABELS[lang];
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      <MetaItem icon={<ClockIcon className="h-5 w-5" />} label={labels.prep} value={formatMinutes(prepTimeMinutes, lang)} />
      <MetaItem icon={<ClockIcon className="h-5 w-5" />} label={labels.cook} value={formatMinutesRange(cookTimeMinutes, cookTimeMinutesMax, lang)} />
      <MetaItem icon={<ClockIcon className="h-5 w-5" />} label={labels.total} value={formatMinutes(totalTimeMinutes, lang)} />
      <MetaItem icon={<UsersIcon className="h-5 w-5" />} label={labels.servings} value={String(servings)} />
      <MetaItem icon={<GaugeIcon className="h-5 w-5" />} label={labels.level} value={difficultyLabel(difficulty, lang)} />
    </div>
  );
}
