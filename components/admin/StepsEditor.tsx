"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { newStep, type FormIngredientGroup, type FormStep } from "@/lib/admin-form-types";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/**
 * "Ingredienser i dette steget" (07.10.2026) – admin-UI for RecipeStep.
 * ingredientItemIds (se filheaderen der i lib/types.ts): en avkrysningsliste
 * over ALLE ingredienser i skjemaet akkurat nå, gruppert likt
 * IngredientGroupsEditor.tsx, slik at admin kan krysse av NØYAKTIG hvilke
 * linjer (ikke bare navn) dette steget bruker. Viser mengde+enhet+navn+
 * notat for hver rad – samme visningsform som selve ingredienslisten – så
 * admin kjenner raden igjen selv om flere rader har likt navn (f.eks. "smør"
 * både til steking og i en saus, med ulik mengde).
 *
 * Bevisst en EGEN, kollapset seksjon PER steg (lukket som standard) fremfor
 * alltid synlig: de fleste steg bruker 0-3 ingredienser, og en full
 * avkrysningsliste under HVERT ENESTE steg hele tiden ville gjort et
 * skjema med mange steg uoversiktlig. Antall valgte vises på selve
 * åpne/lukke-knappen slik at admin ser status uten å måtte åpne den.
 */
function StepIngredientLinks({
  groups,
  selectedKeys,
  onChange,
}: {
  groups: FormIngredientGroup[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const namedGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.name.trim() !== "") }))
    .filter((g) => g.items.length > 0);
  const selected = new Set(selectedKeys);

  function toggle(key: string) {
    onChange(selected.has(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]);
  }

  if (namedGroups.length === 0) {
    return (
      <p className="mt-2 text-xs text-ink-faint">
        Legg til ingredienser i listen over først for å kunne koble dem til dette steget.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-clay hover:text-clay-dark"
      >
        <ChevronDownIcon className={clsx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {selectedKeys.length === 0
          ? "Ingredienser i dette steget (ingen koblet)"
          : `Ingredienser i dette steget (${selectedKeys.length} koblet)`}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-line bg-cream/50 p-3">
          {namedGroups.map((group) => (
            <div key={group.key}>
              {group.title && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.title}</p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-ink hover:bg-cream-dark">
                      <input
                        type="checkbox"
                        checked={selected.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="h-3.5 w-3.5 shrink-0 accent-clay"
                      />
                      <span>
                        {[item.amount, item.unit].filter((v) => v.trim() !== "").join(" ")} {item.name}
                        {item.note ? ` (${item.note})` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepsEditor({
  steps,
  onChange,
  groups,
}: {
  steps: FormStep[];
  onChange: (steps: FormStep[]) => void;
  /** Valgfri – kun den HOVEDSAKELIGE fremgangsmåten (ikke vegetarvarianten,
   * se bruksstedene i RecipeForm.tsx) har ekte, lagrede ingrediens-id-er å
   * koble til (se filheaderen til FormStep.ingredientItemKeys i
   * lib/admin-form-types.ts) – uten denne proppen rendres ingen
   * "Ingredienser i dette steget"-seksjon i det hele tatt. */
  groups?: FormIngredientGroup[];
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
              // text-base på mobil (unngår iOS-innzooming ved fokus, se
              // WinePairing.tsx), krymper igjen til text-xs fra sm:.
              className="w-full rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-xs"
            />
            <textarea
              value={step.text}
              onChange={(e) => updateStep(index, { ...step, text: e.target.value })}
              placeholder="Beskriv steget …"
              aria-label={`Tekst for steg ${index + 1}`}
              rows={2}
              className="w-full resize-y rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
            />
            {groups && (
              <StepIngredientLinks
                groups={groups}
                selectedKeys={step.ingredientItemKeys}
                onChange={(keys) => updateStep(index, { ...step, ingredientItemKeys: keys })}
              />
            )}
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
