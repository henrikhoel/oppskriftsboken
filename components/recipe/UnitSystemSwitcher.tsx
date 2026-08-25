"use client";

import { clsx } from "clsx";
import { t, type Lang } from "@/lib/i18n";
import type { UnitSystem } from "@/lib/utils/units";

/** Metrisk/US-bryter for én enkelt oppskriftsside. I MOTSETNING til
 * NO/EN-språkbryteren er dette et rent lokalt, ikke-lagret valg (ingen
 * cookie) – nullstilles til metrisk hver gang siden lastes på nytt. */
export function UnitSystemSwitcher({
  value,
  onChange,
  lang,
  className,
}: {
  value: UnitSystem;
  onChange: (next: UnitSystem) => void;
  lang: Lang;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={t(lang, "recipeDetail.unitsAria")}
      className={clsx(
        "flex items-center gap-0.5 rounded-full border border-line-strong bg-paper p-0.5 text-xs font-semibold",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange("metric")}
        aria-pressed={value === "metric"}
        className={clsx(
          "rounded-full px-2.5 py-1.5 transition-colors",
          value === "metric" ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-dark",
        )}
      >
        {t(lang, "recipeDetail.unitsMetric")}
      </button>
      <button
        type="button"
        onClick={() => onChange("us")}
        aria-pressed={value === "us"}
        className={clsx(
          "rounded-full px-2.5 py-1.5 transition-colors",
          value === "us" ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-dark",
        )}
      >
        {t(lang, "recipeDetail.unitsUs")}
      </button>
    </div>
  );
}
