"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import { ChevronDownIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Næringsinnhold" (kalori-/makro-oversikt) – forhåndsgenerert i admin (se
 * lib/kitchen-intelligence/nutrition.ts sin filheader), IKKE et AI-kall her.
 * Bevisst skjult bak en "Vis næringsinnhold"-knapp, ULIKT TasteProfileDisplay
 * som alltid vises – Henrik 25.08.2026: "jeg vil likevel at det skal være en
 * knapp de kan trykke på for å få den informasjonen, for det er ikke alle
 * som vil ha det". Ren klientside-toggle av data som allerede er lastet inn
 * med resten av siden (server-rendret, sendt som prop) – å trykke knappen
 * koster INGENTING (ikke noe nytt nettverkskall), i motsetning til f.eks.
 * den gamle (nå fjernede) live smaksprofil-panelet.
 */
export function NutritionPanel({ nutrition, lang }: { nutrition: NutritionInfo; lang: Lang }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-line bg-cream-dark/40 p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="font-serif text-base text-ink">{t(lang, "nutrition.heading")}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-clay">
          {open ? t(lang, "nutrition.hide") : t(lang, "nutrition.show")}
          <ChevronDownIcon className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-ink-faint">{t(lang, "nutrition.perServing")}</p>

          <dl className="divide-y divide-line text-sm">
            <NutritionRow label={t(lang, "nutrition.calories")} value={`${nutrition.calories} kcal`} />
            <NutritionRow label={t(lang, "nutrition.fat")} value={`${nutrition.fat} g`} />
            <NutritionRow label={t(lang, "nutrition.saturatedFat")} value={`${nutrition.saturatedFat} g`} indent />
            <NutritionRow label={t(lang, "nutrition.carbs")} value={`${nutrition.carbs} g`} />
            <NutritionRow label={t(lang, "nutrition.sugar")} value={`${nutrition.sugar} g`} indent />
            <NutritionRow label={t(lang, "nutrition.fiber")} value={`${nutrition.fiber} g`} />
            <NutritionRow label={t(lang, "nutrition.protein")} value={`${nutrition.protein} g`} />
            <NutritionRow label={t(lang, "nutrition.salt")} value={`${nutrition.salt} g`} />
          </dl>

          <p className="text-[11px] italic leading-relaxed text-ink-faint">{t(lang, "nutrition.disclaimer")}</p>
        </div>
      )}
    </div>
  );
}

function NutritionRow({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className={clsx("flex items-center justify-between py-1.5", indent && "pl-4")}>
      <dt className={clsx("text-ink-soft", indent && "text-xs text-ink-faint")}>{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
