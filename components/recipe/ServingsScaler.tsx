"use client";

import { clsx } from "clsx";
import { SERVING_OPTIONS } from "@/lib/config";
import { UsersIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

export function ServingsScaler({
  servings,
  onChange,
  lang = "no",
}: {
  servings: number;
  onChange: (value: number) => void;
  lang?: Lang;
}) {
  // Sørg for at oppskriftens faktiske grunnporsjoner alltid er valgbar,
  // selv om den ikke er blant standardalternativene (f.eks. 5 eller 7).
  const options = Array.from(new Set([...SERVING_OPTIONS, servings])).sort((a, b) => a - b);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-soft">
        <UsersIcon className="h-4 w-4" />
        <span>{t(lang, "servings.label")}</span>
      </div>
      <div
        role="group"
        aria-label={t(lang, "servings.chooseAria")}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={option === servings}
            className={clsx(
              "min-w-11 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              option === servings
                ? "border-clay bg-clay text-cream"
                : "border-line-strong bg-paper text-ink-soft hover:bg-cream-dark",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
