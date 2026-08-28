"use client";

import { useState } from "react";
import { getMealShoppingIngredients } from "@/lib/actions/meal-shopping-list";
import { computeMealTimeline, type MealTimeline } from "@/lib/kitchen-intelligence";
import type { ExistingMealCourseSlot, MealCourseSlot } from "@/lib/kitchen-intelligence";
import { ClockIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * HEL-MENY-TIMELINE (Fase 5 – Experience, 5.8) – se computeMealTimeline i
 * lib/kitchen-intelligence/meal-timeline.ts for selve regnestykket (bygger
 * direkte på den eksisterende ett-oppskrift-reverse-timelinen). Henter
 * stegene for hver "existing"-rett via samme delte handling som
 * MealShoppingListSection (getMealShoppingIngredients, utvidet 25.08.2026
 * til også å returnere steg/forberedelsestid – se filheaderen der).
 *
 * `readyAt` leses/skrives DIREKTE til MealSession.desiredReadyAt (via
 * `onReadyAtChange`, koblet til useMealSession().setDesiredReadyAt i
 * MealView.tsx) – i motsetning til CookingTimelinePanel.tsx sin
 * ett-oppskrift-variant (som holder klokkeslettet i lokal, ikke-lagret
 * state) er dette bevisst PERSISTERT, siden et helt måltids ønskede
 * spisetidspunkt er noe man rimelig vil at skal huskes ved neste besøk på
 * samme meny.
 */
export function MealTimelineSection({
  slots,
  readyAt,
  onReadyAtChange,
  lang,
}: {
  slots: MealCourseSlot[];
  readyAt: string;
  onReadyAtChange: (value: string) => void;
  lang: Lang;
}) {
  const [timeline, setTimeline] = useState<MealTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingSlots = slots.filter((s): s is ExistingMealCourseSlot => s.source === "existing");

  if (existingSlots.length === 0) {
    return (
      <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-serif text-lg text-ink">
          <ClockIcon className="h-5 w-5 text-clay" />
          {t(lang, "mealTimeline.heading")}
        </h3>
        <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealTimeline.noExisting")}</p>
      </div>
    );
  }

  async function handleCompute() {
    setLoading(true);
    setError(null);
    setTimeline(null);
    try {
      if (!readyAt.trim()) {
        setError(t(lang, "recipeDetail.timelineInvalidTime"));
        return;
      }

      const data = await getMealShoppingIngredients(existingSlots.map((s) => s.recipeId));
      const byId = new Map(data.map((d) => [d.recipeId, d]));

      const dishes = existingSlots
        .map((slot) => {
          const recipeData = byId.get(slot.recipeId);
          if (!recipeData) return null;
          return {
            slotId: slot.id,
            role: slot.role,
            title: slot.title,
            steps: recipeData.steps,
            prepTimeMinutes: recipeData.prepTimeMinutes,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      const result = computeMealTimeline(dishes, readyAt);
      if (!result) {
        setError(t(lang, "mealTimeline.noSteps"));
        return;
      }
      setTimeline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealTimeline.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="flex items-center gap-2 font-serif text-lg text-ink">
        <ClockIcon className="h-5 w-5 text-clay" />
        {t(lang, "mealTimeline.heading")}
      </h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealTimeline.description")}</p>

      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-faint">{t(lang, "mealTimeline.readyLabel")}</span>
          <input
            type="time"
            value={readyAt}
            onChange={(e) => onReadyAtChange(e.target.value)}
            // text-base på mobil (unngår iOS-innzooming ved fokus).
            className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink sm:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleCompute}
          disabled={loading}
          className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {loading ? t(lang, "mealTimeline.loading") : t(lang, "mealTimeline.button")}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

      {timeline && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <ul className="space-y-2">
            {timeline.dishes.map((dish) => {
              const startClock = dish.timeline.prepStartClockTime ?? dish.timeline.steps[0]?.startClockTime ?? null;
              return (
                <li key={dish.slotId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {t(lang, `mealBuilder.role.${dish.role}`)}
                    </span>
                    <span className="text-ink">{dish.title}</span>
                    <span className="ml-1.5 text-xs text-ink-faint">
                      ({t(lang, "mealTimeline.totalMinutes", { minutes: dish.timeline.totalMinutes })})
                    </span>
                  </div>
                  <span className="shrink-0 font-serif text-base text-ink">{startClock}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-medium">
            <span className="text-ink">{t(lang, "mealTimeline.readyAtLabel")}</span>
            <span className="font-serif text-lg text-clay-dark">{timeline.readyAt}</span>
          </div>
        </div>
      )}
    </div>
  );
}
