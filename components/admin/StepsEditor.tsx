"use client";

import { newStep, type FormStep } from "@/lib/admin-form-types";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function StepsEditor({
  steps,
  onChange,
}: {
  steps: FormStep[];
  onChange: (steps: FormStep[]) => void;
}) {
  function updateStep(index: number, next: FormStep) {
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
            <input
              value={step.groupTitle}
              onChange={(e) => updateStep(index, { ...step, groupTitle: e.target.value })}
              placeholder="Delsteg-gruppe (valgfritt, f.eks. «Saus»)"
              aria-label={`Gruppenavn for steg ${index + 1}`}
              className="w-full rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <textarea
              value={step.text}
              onChange={(e) => updateStep(index, { ...step, text: e.target.value })}
              placeholder="Beskriv steget …"
              aria-label={`Tekst for steg ${index + 1}`}
              rows={2}
              className="w-full resize-y rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
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
        onClick={() => onChange([...steps, newStep()])}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Legg til steg
      </button>
    </div>
  );
}
