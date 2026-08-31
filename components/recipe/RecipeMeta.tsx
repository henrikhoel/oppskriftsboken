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
 *
 * Finjustert 31.08.2026 (venstrekolonne-raffinement): verdiene er nå tydelig
 * større fra lg og opp (fortsatt små, diskrete labels under) – "Gjør
 * metadata-seksjonen betydelig mer tilstedeværende". Raden bruker
 * lg:justify-between for å fylle HELE bredden av venstrekolonnen i heroen
 * (RecipeHero.tsx) i stedet for å pakke seg sammen mot venstre kant; selve
 * kant-/luft-tilførselen rundt raden (linje over + vertikal padding) styres
 * bevisst av RecipeHero.tsx sin wrapper, ikke her – denne komponenten er
 * fortsatt kun selve raden.
 *
 * RETTET 31.08.2026: hadde tidligere `lg:flex-nowrap`, som tvang alle fem
 * elementene til å stå på én linje UANSETT om de faktisk hadde plass –
 * med lengre norske labels ("Forberedelse"/"Tilberedning") og fem hele
 * elementer rakk de ikke plass i den ~520–540px brede tekstkolonnen, og
 * rant utenfor kolonnen og oppå selve bildet (rapportert av Henrik:
 * "R'en i porsjoner treffer bildet"). `flex-nowrap` fjernet igjen – raden
 * bruker nå vanlig flex-wrap, akkurat som på mobil, så den ALDRI kan
 * kollidere med bildet: står på én linje når det er plass (typisk
 * tilfelle på store skjermer), bryter ellers rolig til to linjer i
 * stedet for å flyte utenfor. whitespace-nowrap på selve
 * verdi-/label-tekstene hindrer at ETT enkelt element brekker midt i et
 * tall/ord.
 */
function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:border-l sm:border-line sm:pl-5 sm:first:border-0 sm:first:pl-0">
      <span className="text-ink-faint">{icon}</span>
      <span className="flex flex-col leading-tight">
        <span className="whitespace-nowrap font-serif text-base text-ink sm:text-lg lg:text-lg">{value}</span>
        <span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-ink-faint lg:text-[11px]">
          {label}
        </span>
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
  const iconClass = "h-4 w-4";
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-1 sm:gap-x-0 lg:justify-between lg:gap-x-5 lg:py-2">
      <MetaItem icon={<ClockIcon className={iconClass} />} label={labels.prep} value={formatMinutes(prepTimeMinutes, lang)} />
      <MetaItem
        icon={<ClockIcon className={iconClass} />}
        label={labels.cook}
        value={formatMinutesRange(cookTimeMinutes, cookTimeMinutesMax, lang)}
      />
      <MetaItem icon={<ClockIcon className={iconClass} />} label={labels.total} value={formatMinutes(totalTimeMinutes, lang)} />
      <MetaItem icon={<UsersIcon className={iconClass} />} label={labels.servings} value={String(servings)} />
      <MetaItem icon={<GaugeIcon className={iconClass} />} label={labels.level} value={difficultyLabel(difficulty, lang)} />
    </div>
  );
}
