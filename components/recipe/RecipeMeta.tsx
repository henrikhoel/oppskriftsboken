import { difficultyLabel, formatMinutes, formatMinutesRange } from "@/lib/utils/format";
import type { Difficulty } from "@/lib/config";

/**
 * Metadata-raden (forberedelse/tilberedning/totalt/porsjoner/nivå) – tidligere
 * fem separate bokser (rounded-card, border, bg-paper), som kjentes tunge og
 * dashboard-aktige ut i heroen (designforbedring 31.08.2026, spesifikasjonens
 * punkt 3). Erstattet med ÉN rolig horisontal rad: ren typografi + tynne
 * vertikale skillelinjer i stedet for bokser.
 *
 * TRE runder finjustering 31.08.2026: (1) tvunget én-linje med
 * `lg:flex-nowrap` uansett bredde rant utenfor kolonnen og oppå bildet
 * ("R'en i porsjoner treffer bildet"). (2) Fjernet ikonene + strammet inn
 * for å faktisk FÅ plass på én linje – fungerte for korte verdier, men
 * "Avansert" (lengre enn "Middels") rant fortsatt utenfor og traff bildet
 * på nytt, fordi den underliggende bredden fortsatt var et rent gjetteverk
 * uten en ekte nettleser å måle i.
 *
 * LØSNING (3): fra lg og opp er raden nå et ekte CSS-grid med fem LIKE
 * brede kolonner (`grid-cols-5`, `minmax(0,1fr)` under panseret) i stedet
 * for flex – bredden på hver kolonne er da MATEMATISK garantert (akkurat
 * 1/5 av tilgjengelig bredde), ikke avhengig av hvor lang teksten i den
 * TILFELDIGVIS er. `truncate` (+ `min-w-0`, nødvendig for at truncate skal
 * virke i en grid-celle) på verdi/label er et siste sikkerhetsnett for et
 * ekstremt langt ord – klippes da med "…" i stedet for å flyte utenfor,
 * ALDRI over på bildet, uansett hva slags oppskrift-metadata som kommer
 * (også fremtidige, ukjente verdier). Selve teksten er også gjort tydelig
 * mindre fra lg ("den teksten må være mye mindre") – ren typografisk
 * finjustering, ingen endring i hva som vises. Under lg (mobil/nettbrett,
 * der bildet uansett ligger OVER teksten, ikke ved siden av) er den gamle
 * flex-wrap-oppførselen beholdt uendret – der er det aldri noen
 * kollisjonsrisiko å beskytte mot.
 */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 sm:border-l sm:border-line sm:pl-6 sm:first:border-0 sm:first:pl-0 lg:pl-4">
      <p className="truncate font-serif text-base text-ink sm:text-lg lg:text-sm">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-ink-faint lg:text-[9px]">{label}</p>
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
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4 py-1 sm:gap-x-0 lg:grid lg:grid-cols-5 lg:items-start lg:gap-x-4 lg:gap-y-0 lg:py-2">
      <MetaItem label={labels.prep} value={formatMinutes(prepTimeMinutes, lang)} />
      <MetaItem label={labels.cook} value={formatMinutesRange(cookTimeMinutes, cookTimeMinutesMax, lang)} />
      <MetaItem label={labels.total} value={formatMinutes(totalTimeMinutes, lang)} />
      <MetaItem label={labels.servings} value={String(servings)} />
      <MetaItem label={labels.level} value={difficultyLabel(difficulty, lang)} />
    </div>
  );
}
