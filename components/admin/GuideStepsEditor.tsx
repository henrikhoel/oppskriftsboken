"use client";

import { newGuideStep, type FormGuideStep } from "@/lib/admin-form-types";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

/**
 * Steg-editor for "Hvordan gjør jeg det?"-guider – samme opp/ned/slett-
 * mønster som StepsEditor.tsx (oppskriftenes egen steg-editor), men med
 * guide-stegenes ekstra strukturerte felter (engelsk tekst, notat,
 * varighet, temperatur – se knowledge_guide_steps i migrasjon 0013). Egen
 * fil fra StepsEditor.tsx fordi formen faktisk er forskjellig (ingen
 * delsteg-gruppe, men flere felt per steg) – ikke verdt å tvinge de to inn
 * i én felles, generisk komponent for kun to bruksområder.
 */
function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

const inputClass =
  "w-full rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-xs";

export function GuideStepsEditor({
  steps,
  onChange,
}: {
  steps: FormGuideStep[];
  onChange: (steps: FormGuideStep[]) => void;
}) {
  function updateStep(index: number, next: FormGuideStep) {
    const copy = [...steps];
    copy[index] = next;
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.key} className="flex gap-2 rounded-card border border-line bg-cream/50 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-light font-serif text-sm text-clay-dark">
            {index + 1}
          </span>
          <div className="flex-1 space-y-2">
            <textarea
              value={step.text}
              onChange={(e) => updateStep(index, { ...step, text: e.target.value })}
              placeholder="Beskriv steget (norsk) …"
              aria-label={`Norsk tekst for steg ${index + 1}`}
              rows={2}
              className="w-full resize-y rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
            />
            <textarea
              value={step.textEn}
              onChange={(e) => updateStep(index, { ...step, textEn: e.target.value })}
              placeholder="Engelsk tekst (valgfritt) …"
              aria-label={`Engelsk tekst for steg ${index + 1}`}
              rows={2}
              className="w-full resize-y rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={step.note}
                onChange={(e) => updateStep(index, { ...step, note: e.target.value })}
                placeholder="Notat (valgfritt)"
                aria-label={`Notat for steg ${index + 1}`}
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={step.durationMinutes}
                onChange={(e) => updateStep(index, { ...step, durationMinutes: e.target.value })}
                placeholder="Varighet (min)"
                aria-label={`Varighet i minutter for steg ${index + 1}`}
                className={inputClass}
              />
              <input
                value={step.temperature}
                onChange={(e) => updateStep(index, { ...step, temperature: e.target.value })}
                placeholder="Temperatur (f.eks. 180°C)"
                aria-label={`Temperatur for steg ${index + 1}`}
                className={inputClass}
              />
            </div>
            <input
              value={step.noteEn}
              onChange={(e) => updateStep(index, { ...step, noteEn: e.target.value })}
              placeholder="Engelsk notat (valgfritt)"
              aria-label={`Engelsk notat for steg ${index + 1}`}
              className={inputClass}
            />
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => onChange(moveAt(steps, index, -1))}
              disabled={index === 0}
              aria-label="Flytt steg opp"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-dark disabled:opacity-30"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(moveAt(steps, index, 1))}
              disabled={index === steps.length - 1}
              aria-label="Flytt steg ned"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-dark disabled:opacity-30"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(steps.filter((_, i) => i !== index))}
              disabled={steps.length === 1}
              aria-label="Slett steg"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-clay-light hover:text-clay-dark disabled:opacity-30"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...steps, newGuideStep()])}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Legg til steg
      </button>
    </div>
  );
}
