"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "@/components/ui/icons";
import type { CookModeLinkQueueItem } from "@/lib/data/cookmode-link-review";
import {
  approveAllReadyCookModeLinks,
  approveCookModeLinks,
  getCookModeLinkReview,
  regenerateCookModeLinkSuggestion,
  runCookModeLinkBatch,
  type CookModeLinkReviewRecipe,
} from "@/lib/actions/cookmode-link-review";
import type { CookModeLinkFlags, CookModeLinkStatus } from "@/lib/utils/cookmode-link-status";
import type { IngredientGroup, RecipeStep } from "@/lib/types";

type StatusFilter = "all" | "unprocessed" | "needs_review" | "ready" | "missing";

const STATUS_LABEL: Record<CookModeLinkStatus, string> = {
  ready: "Klar",
  needs_review: "Bør sjekkes",
  missing: "Mangler koblinger",
};

const STATUS_DOT: Record<CookModeLinkStatus, string> = {
  ready: "bg-olive",
  needs_review: "bg-clay",
  missing: "bg-ink-faint",
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "needs_review", label: "Bør sjekkes" },
  { value: "missing", label: "Mangler koblinger" },
  { value: "ready", label: "Klar" },
  { value: "unprocessed", label: "Ikke kjørt" },
  { value: "all", label: "Alle" },
];

function StatusBadge({ status }: { status: CookModeLinkStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[11px] font-medium text-ink-faint">
        Ikke kjørt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1 text-[11px] font-medium text-ink">
      <span className={clsx("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Admin skal se den LEVENDE koblingen hvis den allerede finnes (manuelt
 * satt fra før, eller en tidligere godkjenning) – kun når INGEN steg har
 * noen levende kobling i det hele tatt faller vi tilbake til batch sitt
 * utkast. Unngår at et åpnet utkast stille overskriver koblinger en admin
 * allerede har satt opp via den vanlige StepsEditor.tsx. */
function buildInitialStepLinks(detail: CookModeLinkReviewRecipe): Record<string, string[]> {
  const hasAnyLive = detail.steps.some((s) => (s.ingredientItemIds ?? []).length > 0);
  const source = hasAnyLive
    ? Object.fromEntries(detail.steps.map((s) => [s.id, s.ingredientItemIds ?? []]))
    : (detail.suggestion?.stepSuggestions ?? {});
  return Object.fromEntries(detail.steps.map((s) => [s.id, [...(source[s.id] ?? [])]]));
}

function stepReasons(stepId: string, flags: CookModeLinkFlags | undefined): string[] {
  if (!flags) return [];
  const reasons: string[] = [];
  if (flags.ambiguousPhraseStepIds.includes(stepId)) reasons.push("Teksten bruker en tvetydig frase (f.eks. «resten av»)");
  if (flags.uncertainStepIds.includes(stepId)) reasons.push("AI-en var usikker på dette forslaget");
  return reasons;
}

function RecipeLevelFlags({ flags }: { flags: CookModeLinkFlags }) {
  const reasons: string[] = [];
  if (flags.hasDuplicateIngredientNames) {
    reasons.push("To eller flere ingredienslinjer i oppskriften har samme navn – sjekk at koblingene under peker på riktig linje.");
  }
  if (flags.hasSharedIngredientAcrossSteps) {
    reasons.push("Minst én ingrediens er koblet til flere steg – helt lovlig hvis den faktisk brukes flere steder, men verdt å dobbeltsjekke.");
  }
  if (reasons.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-clay/30 bg-clay-light/40 px-3 py-2.5 text-xs text-clay-dark">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <ul className="space-y-1">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

function StepLinkEditor({
  index,
  step,
  ingredientGroups,
  selectedIds,
  onToggle,
  reasons,
}: {
  index: number;
  step: RecipeStep;
  ingredientGroups: IngredientGroup[];
  selectedIds: string[];
  onToggle: (itemId: string) => void;
  reasons: string[];
}) {
  const selected = new Set(selectedIds);
  const namedGroups = ingredientGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.name.trim() !== "") }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className={clsx(
        "rounded-xl border p-3",
        reasons.length > 0 ? "border-clay/40 bg-clay-light/20" : "border-line bg-cream/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-light font-serif text-xs text-clay-dark">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          {step.groupTitle && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-clay">{step.groupTitle}</p>
          )}
          <p className="text-sm text-ink">{step.text}</p>
          {reasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-1.5 text-[11px] text-clay-dark">
                  <AlertIcon className="h-3 w-3 shrink-0" /> {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-2.5 space-y-2.5 pl-8">
        {namedGroups.length === 0 && <p className="text-xs text-ink-faint">Ingen ingredienser i oppskriften ennå.</p>}
        {namedGroups.map((group) => (
          <div key={group.id}>
            {group.title && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-ink hover:bg-cream-dark">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => onToggle(item.id)}
                      className="h-3.5 w-3.5 shrink-0 accent-clay"
                    />
                    <span>
                      {[item.amount, item.unit].filter((v) => v && v.trim() !== "").join(" ")} {item.name}
                      {item.note ? ` (${item.note})` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Selve review-tavlen (07.10.2026) – se filheaderen i
 * app/admin/(dashboard)/cook-mode-koblinger/page.tsx for hele bakgrunnen.
 * Eier: filter-state, hvilken oppskrift som er åpen, dens lokale
 * (ikke-lagrede) avkrysninger, samt to "løkkende" batch-handlinger (kjør
 * AI-forslag for ikke-behandlede / godkjenn alle "Klar") som kaller sin
 * Server Action gjentatte ganger til ingenting gjenstår, siden ingen enkelt
 * forespørsel trygt kan behandle 300+ oppskrifter innenfor et vanlig
 * serverless-tidsavbrudd (se runCookModeLinkBatch sin filheader i
 * lib/actions/cookmode-link-review.ts).
 */
export function CookModeLinkReviewBoard({ initialQueue }: { initialQueue: CookModeLinkQueueItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [filter, setFilter] = useState<StatusFilter>("needs_review");

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CookModeLinkReviewRecipe | null>(null);
  const [stepLinks, setStepLinks] = useState<Record<string, string[]>>({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchFailed, setBatchFailed] = useState<{ id: string; title: string; error: string }[]>([]);
  const stopBatchRef = useRef(false);

  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkDone, setBulkDone] = useState(0);
  const stopBulkRef = useRef(false);

  const counts = useMemo(() => {
    const c = { all: queue.length, unprocessed: 0, ready: 0, needs_review: 0, missing: 0 };
    for (const item of queue) {
      if (item.status === null) c.unprocessed++;
      else c[item.status]++;
    }
    return c;
  }, [queue]);

  const filteredIds = useMemo(() => {
    return queue
      .filter((item) => {
        if (filter === "all") return true;
        if (filter === "unprocessed") return item.status === null;
        return item.status === filter;
      })
      .map((item) => item.id);
  }, [queue, filter]);

  const currentIndexInFilter = currentId ? filteredIds.indexOf(currentId) : -1;

  const loadRecipe = useCallback(async (id: string) => {
    setCurrentId(id);
    setDetail(null);
    setDetailError(null);
    setIsLoadingDetail(true);
    try {
      const result = await getCookModeLinkReview(id);
      if (!result) {
        setDetailError("Fant ikke oppskriften.");
        return;
      }
      setDetail(result);
      setStepLinks(buildInitialStepLinks(result));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Kunne ikke hente oppskriften.");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  function goToOffset(offset: number) {
    if (filteredIds.length === 0) return;
    const base = currentIndexInFilter >= 0 ? currentIndexInFilter : -1;
    const nextIndex = Math.min(Math.max(base + offset, 0), filteredIds.length - 1);
    const nextId = filteredIds[nextIndex];
    if (nextId) void loadRecipe(nextId);
  }

  // Åpner automatisk FØRSTE oppskrift i et nytt filter (Henriks "åpne neste
  // oppskrift som bør sjekkes") – uten dette måtte admin alltid klikke seg
  // inn i listen manuelt selv rett etter å ha byttet fane.
  useEffect(() => {
    if (filteredIds.length === 0) {
      setCurrentId(null);
      setDetail(null);
      return;
    }
    if (!currentId || !filteredIds.includes(currentId)) {
      void loadRecipe(filteredIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredIds.join("|")]);

  function updateQueueItem(item: CookModeLinkQueueItem) {
    setQueue((prev) => prev.map((q) => (q.id === item.id ? item : q)));
  }

  async function handleApprove() {
    if (!detail) return;
    setIsApproving(true);
    setDetailError(null);
    try {
      const result = await approveCookModeLinks(detail.id, stepLinks);
      updateQueueItem(result);
      goToOffset(1);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Kunne ikke lagre koblingene.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRegenerate() {
    if (!detail) return;
    setIsRegenerating(true);
    setDetailError(null);
    try {
      const result = await regenerateCookModeLinkSuggestion(detail.id);
      setDetail(result);
      setStepLinks(buildInitialStepLinks(result));
      updateQueueItem({
        id: result.id,
        slug: result.slug,
        title: result.title,
        status: result.status,
        linkedStepCount: result.steps.filter((s) => (s.ingredientItemIds ?? []).length > 0).length,
        totalStepCount: result.steps.length,
      });
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Kunne ikke generere forslag på nytt.");
    } finally {
      setIsRegenerating(false);
    }
  }

  // De to løkkene under kaller bevisst Server Action-en på nytt for hver
  // bolk (fremfor ett kjempekall) – se filheaderen over. Et tak på 200
  // runder er kun et sikkerhetsnett mot en evt. logikkfeil som får
  // `remaining` til aldri å nå 0, ikke en reell begrensning for 300+
  // oppskrifter (10/bolk x 200 = 2000).
  async function handleRunBatch() {
    setIsBatchRunning(true);
    setBatchDone(0);
    setBatchFailed([]);
    stopBatchRef.current = false;
    try {
      for (let i = 0; i < 200; i++) {
        if (stopBatchRef.current) break;
        const result = await runCookModeLinkBatch(10);
        setQueue((prev) => prev.map((item) => result.processed.find((p) => p.id === item.id) ?? item));
        setBatchDone((n) => n + result.processed.length);
        if (result.failed.length > 0) setBatchFailed((prev) => [...prev, ...result.failed]);
        if (result.remaining === 0 || result.processed.length === 0) break;
      }
    } finally {
      setIsBatchRunning(false);
    }
  }

  async function handleApproveAllReady() {
    setIsBulkApproving(true);
    setBulkDone(0);
    stopBulkRef.current = false;
    try {
      for (let i = 0; i < 200; i++) {
        if (stopBulkRef.current) break;
        const result = await approveAllReadyCookModeLinks(25);
        setQueue((prev) => prev.map((item) => result.approved.find((p) => p.id === item.id) ?? item));
        setBulkDone((n) => n + result.approved.length);
        if (result.remaining === 0 || result.approved.length === 0) break;
      }
    } finally {
      setIsBulkApproving(false);
    }
  }

  function toggleItem(stepId: string, itemId: string) {
    setStepLinks((prev) => {
      const current = prev[stepId] ?? [];
      const next = current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId];
      return { ...prev, [stepId]: next };
    });
  }

  // "Godkjenn alle klare" (Henrik: "jeg primært skal kvalitetssikre
  // tvilstilfellene, ikke manuelt koble alle oppskrifter fra bunnen av") –
  // teller status="ready" oppskrifter UANSETT om utkastet faktisk er
  // skrevet til den levende koblingen ennå (se isSuggestionAlreadyApplied i
  // lib/actions/cookmode-link-review.ts, som gjør den faktiske filtreringen
  // server-side); dette tallet er derfor et øvre anslag admin ser FØR
  // kjøring, ikke et løfte om nøyaktig så mange skrivinger.
  const readyCount = counts.ready;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-paper p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleRunBatch()}
          disabled={isBatchRunning || counts.unprocessed === 0}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          {isBatchRunning ? `Kjører batch … (${batchDone} behandlet)` : `Kjør batch for ${counts.unprocessed} ikke-kjørte`}
        </Button>
        {isBatchRunning && (
          <button
            type="button"
            onClick={() => (stopBatchRef.current = true)}
            className="text-xs font-medium text-ink-faint hover:text-clay-dark"
          >
            Stopp
          </button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleApproveAllReady()}
          disabled={isBulkApproving || readyCount === 0}
        >
          <CheckIcon className="h-3.5 w-3.5" />
          {isBulkApproving ? `Godkjenner … (${bulkDone} godkjent)` : `Godkjenn alle klare (${readyCount})`}
        </Button>
        {isBulkApproving && (
          <button
            type="button"
            onClick={() => (stopBulkRef.current = true)}
            className="text-xs font-medium text-ink-faint hover:text-clay-dark"
          >
            Stopp
          </button>
        )}

        {batchFailed.length > 0 && (
          <p className="w-full text-xs text-clay-dark">
            {batchFailed.length} oppskrift(er) feilet under batch-kjøringen – prøv dem igjen senere (de forblir «Ikke
            kjørt»).
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === tab.value ? "bg-clay text-cream" : "bg-cream-dark text-ink-soft hover:bg-cream-dark/70",
            )}
          >
            {tab.label} ({counts[tab.value]})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-card border border-line bg-paper p-2">
          {filteredIds.length === 0 && <p className="p-3 text-sm text-ink-faint">Ingen oppskrifter i dette filteret.</p>}
          {filteredIds.map((id) => {
            const item = queue.find((q) => q.id === id);
            if (!item) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void loadRecipe(id)}
                className={clsx(
                  "flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  id === currentId ? "bg-clay-light text-clay-dark" : "text-ink hover:bg-cream-dark",
                )}
              >
                <span className="truncate font-medium">{item.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                  <StatusBadge status={item.status} />
                  {item.totalStepCount > 0 && (
                    <span>
                      {item.linkedStepCount}/{item.totalStepCount} steg koblet
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-card border border-line bg-paper p-5">
          {!currentId && <p className="text-sm text-ink-faint">Velg en oppskrift i listen til venstre.</p>}
          {currentId && isLoadingDetail && <p className="text-sm text-ink-faint">Laster …</p>}
          {currentId && !isLoadingDetail && detailError && !detail && <p className="text-sm text-clay-dark">{detailError}</p>}

          {currentId && !isLoadingDetail && detail && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl text-ink">{detail.title}</h2>
                  <a
                    href={`/admin/oppskrifter/${detail.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-clay hover:text-clay-dark"
                  >
                    Åpne hele oppskriften i redigering →
                  </a>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {detail.suggestion?.flags && <RecipeLevelFlags flags={detail.suggestion.flags} />}

              <div className="space-y-4">
                {detail.steps.map((step, index) => (
                  <StepLinkEditor
                    key={step.id}
                    index={index}
                    step={step}
                    ingredientGroups={detail.ingredientGroups}
                    selectedIds={stepLinks[step.id] ?? []}
                    onToggle={(itemId) => toggleItem(step.id, itemId)}
                    reasons={stepReasons(step.id, detail.suggestion?.flags)}
                  />
                ))}
              </div>

              {detailError && <p className="text-sm text-clay-dark">{detailError}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => goToOffset(-1)} disabled={currentIndexInFilter <= 0}>
                    <ChevronLeftIcon className="h-4 w-4" /> Forrige
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => goToOffset(1)}
                    disabled={currentIndexInFilter < 0 || currentIndexInFilter >= filteredIds.length - 1}
                  >
                    Neste <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleRegenerate()} disabled={isRegenerating}>
                    {isRegenerating ? "Genererer …" : "Generer forslag på nytt"}
                  </Button>
                </div>
                <Button type="button" variant="primary" size="sm" onClick={() => void handleApprove()} disabled={isApproving}>
                  <CheckIcon className="h-3.5 w-3.5" />
                  {isApproving ? "Lagrer …" : "Godkjenn og lagre"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
