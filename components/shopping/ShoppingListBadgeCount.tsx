"use client";

import { useShoppingList } from "@/lib/hooks/useShoppingList";

/** Liten tallboble som viser antall uavhukede varer på handlelisten. */
export function ShoppingListBadgeCount() {
  const { entries, hydrated } = useShoppingList();
  const count = entries.filter((e) => !e.checked).length;

  if (!hydrated || count === 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-cream">
      {count > 99 ? "99+" : count}
    </span>
  );
}
