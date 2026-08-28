"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  newIngredientGroup,
  newIngredientItem,
  type FormIngredientGroup,
  type FormIngredientItem,
} from "@/lib/admin-form-types";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, GripIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Drawer } from "@/components/ui/Drawer";

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

  // --- Dra-for-å-endre-rekkefølge på ingredienser (lagt til 26.08.2026,
  // ønsket av Henrik: "enkelt kunne endre rekkefølgen på ingrediensene,
  // typ med å trykke inn og bevege ingrediensen opp eller ned" – gjelder
  // på BÅDE mobil og Mac). Bruker Pointer Events (IKKE HTML5 sitt native
  // draggable-API, som ikke fungerer pålitelig med touch) – ETT samlet
  // hendelses-API for mus og touch, ingen ekstern dra-og-slipp-avhengighet.
  //
  // Kun INNAD i én ingrediensgruppe – en ingrediens kan ikke dras over i en
  // annen gruppe. Det matcher at selve GRUPPENE lenger ned kun flyttes med
  // opp/ned-piler (grupper er få og store – piler er greit der; enkelt-
  // ingredienser kan fort bli mange, der drag er mye raskere enn gjentatte
  // klikk).
  //
  // rowRefs: DOM-noden for hver ingrediensrad, nøkkel = item.key (globalt
  // unik på tvers av alle grupper, satt av kalleren i RecipeForm.tsx) –
  // brukes til å måle hvilken rad pekeren befinner seg over akkurat nå.
  // draggingKey: hvilken ingrediens som dras nå (null = ingen aktiv drag).
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  function reorderItemsForPointer(groupIndex: number, itemKey: string, clientY: number) {
    const group = groups[groupIndex];
    if (!group) return;
    const currentIndex = group.items.findIndex((i) => i.key === itemKey);
    if (currentIndex === -1) return;

    let targetIndex = group.items.length - 1;
    for (let i = 0; i < group.items.length; i++) {
      const el = rowRefs.current.get(group.items[i].key);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === currentIndex) return;
    const reordered = [...group.items];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    updateGroup(groupIndex, { ...group, items: reordered });
  }

  function handleDragPointerDown(e: ReactPointerEvent<HTMLButtonElement>, itemKey: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingKey(itemKey);
  }

  function handleDragPointerMove(e: ReactPointerEvent<HTMLButtonElement>, groupIndex: number, itemKey: string) {
    if (draggingKey !== itemKey) return;
    e.preventDefault();
    reorderItemsForPointer(groupIndex, itemKey, e.clientY);
  }

  function handleDragPointerEnd(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraggingKey(null);
  }

  // --- "Trykk på navnet for å redigere i en større boks" (26.08.2026 –
  // erstattet et første forsøk der navn/kommentar-feltene ble strukket ut
  // til egne fullbredde-rader direkte i listen, som Henrik meldte tilbake
  // ble "veldig stort og forvirrende"). I stedet er selve raden tilbake til
  // den opprinnelige, kompakte layouten – navnefeltet er nå en KNAPP som
  // viser (evt. avkortet) navn, og åpner et bunn-ark (samme Drawer-
  // primitiv som resten av appen bruker) med et stort tekstfelt og en
  // tydelig "Ferdig"-knapp med hake, akkurat slik Henrik beskrev det.
  const [editingItem, setEditingItem] = useState<{ groupIndex: number; itemIndex: number } | null>(null);
  const editingGroup = editingItem ? groups[editingItem.groupIndex] : null;
  const editingIngredient = editingItem ? editingGroup?.items[editingItem.itemIndex] : null;

  return (
    <div className="space-y-6">
      {/* Vanlig CSS her, IKKE Tailwinds grid-cols-[...]-brukssyntaks (26.08.2026
          – den seks-verdis brede versjonen (etter at dra-håndtaket ble lagt
          til som egen kolonne) ga tydeligvis IKKE et gyldig
          grid-template-columns-uttrykk i den faktiske bygde CSS-en, sett fra
          Henriks skjermbilde: hvert felt landet på sin egen fullbredde-rad
          i stedet for én kompakt rad – klassisk symptom på at selve
          "grid"-klassen traff (display: grid), men grid-cols-verdien falt
          bort (grid-template-columns: none, som gjør at ALT havner i én
          eneste implisitt kolonne). Skrevet som ekte CSS her i stedet, som
          er 100 % uavhengig av Tailwinds parsing av arbitrære verdier. */}
      <style>{`
        .ingredient-row {
          display: grid;
          grid-template-columns: 1.75rem 3.5rem 4rem 1fr 1fr auto;
          align-items: center;
          gap: 0.375rem;
        }
        @media (min-width: 640px) {
          .ingredient-row {
            grid-template-columns: 1.75rem 4rem 5rem 1fr 1fr auto;
          }
        }
      `}</style>
      {groups.map((group, groupIndex) => (
        <div key={group.key} className="rounded-card border border-line bg-cream/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={group.title}
              onChange={(e) => updateGroup(groupIndex, { ...group, title: e.target.value })}
              placeholder={`Gruppenavn (valgfritt, f.eks. «Saus»)`}
              aria-label={`Navn på ingrediensgruppe ${groupIndex + 1}`}
              // text-base på mobil (unngår iOS-innzooming ved fokus).
              className="flex-1 rounded-lg border border-line-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
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
                ref={(el) => {
                  if (el) rowRefs.current.set(item.key, el);
                  else rowRefs.current.delete(item.key);
                }}
                className={`ingredient-row rounded-lg transition-[opacity,box-shadow] ${
                  draggingKey === item.key ? "relative z-10 opacity-70 shadow-card" : ""
                }`}
              >
                <button
                  type="button"
                  onPointerDown={(e) => handleDragPointerDown(e, item.key)}
                  onPointerMove={(e) => handleDragPointerMove(e, groupIndex, item.key)}
                  onPointerUp={handleDragPointerEnd}
                  onPointerCancel={handleDragPointerEnd}
                  aria-label="Endre rekkefølge – trykk og dra opp eller ned"
                  style={{ touchAction: "none" }}
                  className={`flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-ink-faint hover:bg-cream-dark hover:text-ink active:cursor-grabbing ${
                    draggingKey === item.key ? "cursor-grabbing bg-cream-dark text-clay-dark" : ""
                  }`}
                >
                  <GripIcon className="h-4 w-4" />
                </button>
                <input
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, amount: e.target.value })
                  }
                  placeholder="200"
                  aria-label="Mengde"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
                />
                <input
                  value={item.unit}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, unit: e.target.value })
                  }
                  placeholder="g"
                  aria-label="Enhet"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
                />
                {/* Navnet er en KNAPP (ikke et inline tekstfelt) – trykk åpner
                    et stort redigeringsark under, se editingItem-state over.
                    Ser ellers ut som resten av feltene i raden. */}
                <button
                  type="button"
                  onClick={() => setEditingItem({ groupIndex, itemIndex })}
                  aria-label={`Rediger ingrediensnavn: ${item.name || "(tomt)"}`}
                  className="min-w-0 truncate rounded-lg border border-line-strong bg-paper px-2.5 py-2 text-left text-base text-ink focus:outline-none sm:text-sm"
                >
                  {item.name || <span className="text-ink-faint">Ingrediens</span>}
                </button>
                <input
                  value={item.note}
                  onChange={(e) =>
                    updateItem(groupIndex, itemIndex, { ...item, note: e.target.value })
                  }
                  placeholder="Kommentar"
                  aria-label="Kommentar til ingrediens"
                  className="min-w-0 rounded-lg border border-line-strong bg-paper px-2.5 py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm"
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

      <Drawer open={editingItem != null} onClose={() => setEditingItem(null)} title="Rediger ingrediensnavn">
        {editingItem && editingIngredient && (
          <div className="space-y-4">
            <input
              type="text"
              autoFocus
              value={editingIngredient.name}
              onChange={(e) => updateItem(editingItem.groupIndex, editingItem.itemIndex, { ...editingIngredient, name: e.target.value })}
              placeholder="Ingrediens"
              aria-label="Ingrediensnavn"
              className="w-full rounded-xl border border-line-strong bg-paper px-4 py-3 text-lg text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
            >
              <CheckIcon className="h-4 w-4" />
              Ferdig
            </button>
          </div>
        )}
      </Drawer>
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
