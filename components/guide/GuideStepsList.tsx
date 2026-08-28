import type { GuideStep } from "@/lib/types";
import { formatMinutes } from "@/lib/utils/format";
import { localizedStepNote, localizedStepText } from "@/lib/utils/guide-format";
import { ClockIcon } from "@/components/ui/icons";
import { type Lang } from "@/lib/i18n";

/**
 * Nummererte "01/02/03"-steg – IKKE en tung sjekkliste/tabell, bare rolig
 * lesbar tekst i rekkefølge, med en liten, ikke-påtrengende tidtaker-/
 * temperatur-antydning når steget faktisk har det (GuideStep.durationMinutes/
 * temperature, se lib/types.ts). Ingen ekte "start timer"-knapp her ennå –
 * det er en fremtidig Cook Mode-kobling (spesifikasjon punkt 15/16), denne
 * komponenten viser kun DATAEN steget allerede har strukturert.
 */
export function GuideStepsList({ steps, lang = "no" }: { steps: GuideStep[]; lang?: Lang }) {
  if (steps.length === 0) return null;

  return (
    <ol className="flex flex-col gap-6">
      {steps.map((step) => {
        const note = localizedStepNote(step, lang);
        return (
          <li key={step.id} className="flex gap-4">
            <span className="mt-0.5 shrink-0 font-serif text-lg text-clay">
              {String(step.stepNumber).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <p className="text-base leading-relaxed text-ink">{localizedStepText(step, lang)}</p>
              {note && <p className="mt-1 text-sm text-ink-faint">{note}</p>}
              {(step.durationMinutes != null || step.temperature) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                  {step.durationMinutes != null && (
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {formatMinutes(step.durationMinutes, lang)}
                    </span>
                  )}
                  {step.temperature && <span>{step.temperature}</span>}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
