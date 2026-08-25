"use client";

import type { ReactNode } from "react";
import {
  newIngredientGroup,
  newIngredientItem,
  type FormIngredientGroup,
  type FormIngredientItem,
} from "@/lib/admin-form-types";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

function updateAt<T>(list: T[], index: number, next: T): T[] {
  const copy = [...list];
  copy[index] = next;
  return copy;
}

function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function IngredientGroupsEditor({
  groups,
  onChange,
}: {
  groups: FormIngredientGroup[];
  onChange: (groups: FormIngredientGroup[]) => void;
}) {
  function updateGroup(index: number, next: FormIngredientGroup) {
    onChange(updateAt(groups, index, next));
  }

  function updateItem(groupIndex: number, itemIndex: number, next: FormIngredientItem) {
    const group = groups[groupIndex];
    updateGroup(groupIndex, { ...group, items: updateAt(group.items, itemIndex, next) });
  }

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={group.key} className="rounded-card border border-line bg-cream/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={group.title}
              onChange={(e) => updateGroup(groupIndex, { ...group, title: e.target.value })}
              placeholder={`Gruppenavn (valgfritt, f.eks. «Saus»)`}
              aria-label={`Navn på ingrediensgruppe ${groupIndex + 1}`}
              className="flex-1 rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <IconButton
              label="Flytt gruppe opp"
              onClick={() => onChange(moveAt(groups, groupIndex, -1))}
              disabled={groupIndex === 0}
            >
              <ArrowUpIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Flytt gruppe ned"
              onClick={() => onChange(moveAt(groups, groupIndex, 1))}
              disabled={groupIndex === groups.length - 1}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Slett gruppe"
              onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))}
              disabled={groups.length === 1}
              danger
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="space-y-2">
            {group.items.map((item, itemIndex) => (
              <div
                key={item.key}
                className="grid grid-cols-[3.5rem_4rem_1fr_1fr_auto] items-center gap-1.5 sm:grid-cols-[4rem_5rem_1fr_1fr_auto]"
              >
                <input
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, amount: e.target.value })
                  }
                  placeholder="200"
                  aria-label="Mengde"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <input
                  value={item.unit}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, unit: e.target.value })
                  }
                  placeholder="g"
                  aria-label="Enhet"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <input
                  value={item.name}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, name: e.target.value })
                  }
                  placeholder="Ingrediens"
                  aria-label="Ingrediensnavn"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <input
                  value={item.note}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, note: e.target.value })
                  }
                  placeholder="Kommentar"
                  aria-label="Kommentar til ingrediens"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateGroup(groupIndex, {
                      ...group,
                      items: group.items.filter((_, i) => i !== itemIndex),
                    })
                  }
                  disabled={group.items.length === 1}
                  aria-label="Slett ingrediens"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-clay-light hover:text-clay-dark disabled:opacity-30"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => updateGroup(groupIndex, { ...group, items: [...group.items, newIngredientItem()] })}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-clay hover:text-clay-dark"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Legg til ingrediens
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...groups, newIngredientGroup()])}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-cream-dark"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Legg til ingrediensgruppe
      </button>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
        danger ? "text-ink-faint hover:bg-clay-light hover:text-clay-dark" : "text-ink-faint hover:bg-cream-dark hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
