import { difficultyLabel, formatMinutes, formatMinutesRange } from "@/lib/utils/format";
import type { Difficulty } from "@/lib/config";

/**
 * Metadata-raden (forberedelse/tilberedning/totalt/porsjoner/nivå) – tidligere
 * fem separate bokser (rounded-card, border, bg-paper), som kjentes tunge og
 * dashboard-aktige ut i heroen (designforbedring 31.08.2026, spesifikasjonens
 * punkt 3). Erstattet med ÉN rolig horisontal rad: ren typografi + tynne
 * vertikale skillelinjer i stedet for bokser.
 *
 * RETTET/FORENKLET 31.08.2026 (to runder tilbakemelding): en tidligere
 * versjon tvang alle fem elementene på én linje med `lg:flex-nowrap`
 * uansett bredde – med lengre norske labels ("Forberedelse"/
 * "Tilberedning") og fem hele elementer + ikoner rakk de ikke plass i den
 * ~520–540px brede tekstkolonnen i heroen, og rant utenfor kolonnen og
 * oppå selve bildet ("R'en i porsjoner treffer bildet"). Deretter fjernet
 * jeg tvangen (ren flex-wrap) for å unngå kollisjon – men da brøt raden
 * ofte til to linjer selv der det var nok plass, og Henrik ønsket dem
 * heller "rett ved siden av hverandre".
 *
 * Løsningen nå: ikonene er tatt bort (de sto for mye av bredden per
 * element uten å tilføre lesbarhet – ren typografi er nok), og selve
 * elementene er dermed smale nok til at alle fem faktisk får plass på én
 * linje i den brede xl-heroen (`xl:flex-nowrap`, KUN fra xl – der
 * tekstkolonnen er en garantert fast 520px, så regnestykket faktisk
 * stemmer). Under xl (dvs. lg-laget, 1024–1279px, der tekstkolonnen er
 * fleksibel og kan bli ganske smal) beholdes vanlig flex-wrap som et
 * sikkerhetsnett – wrapper trygt til to linjer i stedet for å risikere å
 * kollidere med bildet igjen. Den ekstra bredden ikonene ga fra seg er
 * brukt til litt mer luft mellom hvert element (sm:pl-6 i stedet for
 * pl-5), som var det andre alternativet Henrik nevnte.
 */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight sm:border-l sm:border-line sm:pl-6 sm:first:border-0 sm:first:pl-0">
      <span className="whitespace-nowrap font-serif text-base text-ink sm:text-lg lg:text-lg">{value}</span>
      <span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
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
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4 py-1 sm:gap-x-0 lg:justify-between lg:gap-x-6 lg:py-2 xl:flex-nowrap">
      <MetaItem label={labels.prep} value={formatMinutes(prepTimeMinutes, lang)} />
      <MetaItem label={labels.cook} value={formatMinutesRange(cookTimeMinutes, cookTimeMinutesMax, lang)} />
      <MetaItem label={labels.total} value={formatMinutes(totalTimeMinutes, lang)} />
      <MetaItem label={labels.servings} value={String(servings)} />
      <MetaItem label={labels.level} value={difficultyLabel(difficulty, lang)} />
    </div>
  );
}
