"use client";

import { clsx } from "clsx";
import { useShoppingList } from "@/lib/hooks/useShoppingList";
import { formatShoppingAmount } from "@/lib/utils/shopping-list";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ShoppingBagIcon, TrashIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function ShoppingListView({ lang }: { lang: Lang }) {
  const { entries, hydrated, toggleChecked, removeEntry, clearChecked, clearAll } =
    useShoppingList();

  if (!hydrated) {
    return null;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagIcon className="h-10 w-10" />}
        title={t(lang, "shoppingPage.emptyTitle")}
        description={t(lang, "shoppingPage.emptyDescription")}
      />
    );
  }

  const checkedCount = entries.filter((e) => e.checked).length;
  const uncheckedFirst = [...entries].sort((a, b) => Number(a.checked) - Number(b.checked));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-faint">
          {lang === "en"
            ? `${entries.length - checkedCount} of ${entries.length} remaining`
            : `${entries.length - checkedCount} av ${entries.length} gjenstår`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearChecked} disabled={checkedCount === 0}>
            {t(lang, "shoppingPage.clearChecked")}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            {t(lang, "shoppingPage.clearAll")}
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
        {uncheckedFirst.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={entry.checked}
                onChange={() => toggleChecked(entry.id)}
                className="h-5 w-5 shrink-0 accent-clay"
              />
              <span className={clsx("text-sm sm:text-base", entry.checked && "text-ink-faint line-through")}>
                <span className="font-medium text-ink">
                  {formatShoppingAmount(entry)}{" "}
                </span>
                <span className={entry.checked ? "" : "text-ink"}>{entry.name}</span>
                {entry.fromRecipes.length > 0 && (
                  <span className="block text-xs text-ink-faint">
                    {t(lang, "shoppingPage.from")}: {entry.fromRecipes.join(", ")}
                  </span>
                )}
              </span>
            </label>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label={t(lang, "shoppingPage.removeAria", { name: entry.name })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-cream-dark hover:text-clay-dark"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
