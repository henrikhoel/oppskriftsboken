"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { RecipeStep } from "@/lib/types";
import { computeReverseCookingTimeline, type CookingTimeline } from "@/lib/kitchen-intelligence/timeline";
import { groupInfoByStepId } from "@/lib/kitchen-intelligence/parallel-tasks";
import { getParallelTaskHints, type ParallelTaskGroup } from "@/lib/actions/kitchen-intelligence";
import { ParallelTaskBadge } from "@/components/recipe/ParallelTaskBadge";
import { ChevronDownIcon, ClockIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Når bør jeg starte?" – Reverse Cooking Timeline, se
 * lib/kitchen-intelligence/timeline.ts. Vises som et lukket, foldet-ut-panel
 * (progressiv disclosure, jf. spec §14) rett over "Start å lage mat"-knappen
 * i RecipeInteractive.tsx – naturlig sted, siden det ER beslutningen "når
 * setter jeg i gang", tatt FØR man går inn i selve Cook Mode.
 *
 * Selve tidsregningen (computeReverseCookingTimeline) er 100 % deterministisk
 * og kjører synkront i nettleseren. "Se hva som kan gjøres samtidig" er et
 * eget, valgfritt AI-kall (getParallelTaskHints, cachet server-side) –
 * lastes kun inn dersom brukeren aktivt ber om det, ikke automatisk.
 */
export function CookingTimelinePanel({
  recipeId,
  steps,
  prepTimeMinutes,
  lang,
  onTimelineChange,
  onParallelGroupsChange,
}: {
  recipeId: string;
  steps: RecipeStep[];
  prepTimeMinutes: number | null;
  lang: Lang;
  /** Kalles med det nyeste beregnede resultatet (eller null når ingen
   * tidsplan er regnet ut ennå/lenger) – lar RecipeInteractive.tsx vise
   * samme klokkeslett inline under hvert steg i fremgangsmåten, i stedet
   * for at tidsplanen kun finnes inne i dette panelet. */
  onTimelineChange?: (timeline: CookingTimeline | null) => void;
  /** Samme idé som onTimelineChange, for "kan gjøres samtidig"-forslagene –
   * lar RecipeInteractive.tsx vise den samme bokstav-merkingen (se
   * lib/kitchen-intelligence/parallel-tasks.ts) inline i fremgangsmåten. */
  onParallelGroupsChange?: (groups: ParallelTaskGroup[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [readyAt, setReadyAt] = useState("");
  const [timeline, setTimeline] = useState<CookingTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parallelGroups, setParallelGroups] = useState<ParallelTaskGroup[] | null>(null);
  const [parallelLoading, setParallelLoading] = useState(false);
  const [parallelError, setParallelError] = useState<string | null>(null);

  // Nullstiller en beregnet tidsplan når selve stegene bytter identitet
  // (bytte av språk/variant/målesystem gir nye steg-id-er) – en gammel
  // tidsplan pekte da uansett på steg-id-er som ikke lenger finnes, så den
  // ville vist ingenting nyttig i RecipeInteractive.tsx sine inline-merker.
  // Ber brukeren regne ut på nytt fremfor å risikere et misvisende resultat.
  useEffect(() => {
    setTimeline(null);
    setParallelGroups(null);
    setError(null);
    onTimelineChange?.(null);
    onParallelGroupsChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const stepToGroupInfo = groupInfoByStepId(parallelGroups);

  function handleCompute() {
    const result = computeReverseCookingTimeline(steps, readyAt, { prepTimeMinutes });
    if (!result) {
      setError(t(lang, "recipeDetail.timelineInvalidTime"));
      setTimeline(null);
      onTimelineChange?.(null);
      return;
    }
    setError(null);
    setTimeline(result);
    setParallelGroups(null);
    onParallelGroupsChange?.(null);
    setParallelError(null);
    onTimelineChange?.(result);
  }

  async function handleParallelHints() {
    setParallelLoading(true);
    setParallelError(null);
    try {
      const groups = await getParallelTaskHints(
        recipeId,
        steps.map((s) => ({ id: s.id, stepNumber: s.stepNumber, text: s.text })),
        lang,
      );
      setParallelGroups(groups);
      onParallelGroupsChange?.(groups);
    } catch (err) {
      setParallelError(err instanceof Error ? err.message : t(lang, "recipeDetail.timelineParallelError"));
    } finally {
      setParallelLoading(false);
    }
  }

  if (steps.length === 0) return null;

  return (
    <div className="rounded-card border border-line bg-cream-dark/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <ClockIcon className="h-4 w-4 text-clay" />
          {t(lang, "recipeDetail.timelineHeading")}
        </span>
        <ChevronDownIcon className={clsx("h-4 w-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-ink-faint">{t(lang, "recipeDetail.timelineIntro")}</p>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-ink-faint">{t(lang, "recipeDetail.timelineReadyLabel")}</span>
              <input
                type="time"
                value={readyAt}
                onChange={(e) => setReadyAt(e.target.value)}
                // text-base på mobil (unngår iOS-innzooming ved fokus, gjelder
                // også type="time"-input).
                className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink sm:text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleCompute}
              className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-clay-dark"
            >
              {t(lang, "recipeDetail.timelineButton")}
            </button>
          </div>
          {error && <p className="text-xs text-clay-dark">{error}</p>}

          {timeline && (
            <div className="space-y-2 border-t border-line pt-3">
              {timeline.prepStartClockTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{t(lang, "recipeDetail.timelinePrepLabel")}</span>
                  <span className="font-serif text-base text-ink">{timeline.prepStartClockTime}</span>
                </div>
              )}
              <ul className="space-y-1.5">
                {timeline.steps.map((s) => {
                  const groupInfo = stepToGroupInfo.get(s.stepId);
                  return (
                    <li key={s.stepId} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        {t(lang, "cookMode.timerStepLabel", { number: s.stepNumber })}
                        {s.isEstimated ? " *" : ""}
                        {groupInfo && <ParallelTaskBadge info={groupInfo} lang={lang} />}
                      </span>
                      <span className="font-serif text-base text-ink">{s.startClockTime}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-medium">
                <span className="text-ink">{t(lang, "recipeDetail.timelineReadyAtLabel")}</span>
                <span className="font-serif text-lg text-clay-dark">{timeline.readyAt}</span>
              </div>
              {timeline.steps.some((s) => s.isEstimated) && (
                <p className="text-[11px] text-ink-faint">* {t(lang, "recipeDetail.timelineEstimatedNote")}</p>
              )}

              {!parallelGroups && (
                <button
                  type="button"
                  onClick={handleParallelHints}
                  disabled={parallelLoading}
                  className="mt-1 text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
                >
                  {parallelLoading
                    ? t(lang, "recipeDetail.timelineParallelLoading")
                    : t(lang, "recipeDetail.timelineParallelButton")}
                </button>
              )}
              {parallelError && <p className="text-xs text-clay-dark">{parallelError}</p>}
              {parallelGroups && (
                <div className="mt-2 space-y-1.5 border-t border-line pt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t(lang, "recipeDetail.timelineParallelHeading")}
                  </p>
                  {parallelGroups.length === 0 ? (
                    <p className="text-xs text-ink-faint">{t(lang, "recipeDetail.timelineParallelNone")}</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-ink-soft">
                      {parallelGroups.map((group, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <ParallelTaskBadge
                            info={{ letter: String.fromCharCode(65 + i), note: group.note }}
                            lang={lang}
                          />
                          <span>{group.note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
