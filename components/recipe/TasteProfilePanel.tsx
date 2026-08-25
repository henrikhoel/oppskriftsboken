"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { getTasteProfile } from "@/lib/actions/kitchen-intelligence";
import { TASTE_DIMENSIONS } from "@/lib/kitchen-intelligence/taste";
import { ChevronDownIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "Smaksprofil" (Fase 4 – Smak) – et lite, kollapset panel (progressiv
 * disclosure, samme mønster som CookingTimelinePanel.tsx) som viser hvor
 * søtt/salt/syrlig/bittert/umami/sterkt retten er, som seks korte stolper.
 * AI-kallet (getTasteProfile, cachet server-side) trigges først når panelet
 * faktisk åpnes for første gang – ikke automatisk ved sidelasting – slik at
 * en besøkende som aldri åpner panelet aldri koster et AI-kall.
 */
export function TasteProfilePanel({
  recipeId,
  title,
  description,
  ingredientNames,
  lang,
}: {
  recipeId: string;
  title: string;
  description: string;
  ingredientNames: string[];
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ dimensions: Record<string, number>; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Nullstiller dersom selve oppskriften/språket byttes under oss (samme
  // begrunnelse som i CookingTimelinePanel.tsx) – en gammel smaksprofil for
  // en ANNEN rett/språk ville vært direkte misvisende å stå igjen med.
  useEffect(() => {
    setProfile(null);
    setHasFetched(false);
    setError(null);
  }, [recipeId, lang]);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      const result = await getTasteProfile(recipeId, { title, description, ingredientNames }, lang);
      setProfile(result);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "tasteProfile.error"));
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !hasFetched && !loading) {
      fetchProfile();
    }
  }

  return (
    <div className="rounded-card border border-line bg-cream-dark/40 p-4">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-ink">{t(lang, "tasteProfile.heading")}</span>
        <ChevronDownIcon className={clsx("h-4 w-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && <p className="text-xs text-ink-faint">{t(lang, "tasteProfile.loading")}</p>}

          {!loading && error && (
            <p className="text-xs text-clay-dark">
              {error}{" "}
              <button type="button" onClick={fetchProfile} className="font-medium underline underline-offset-2">
                {t(lang, "tasteProfile.retry")}
              </button>
            </p>
          )}

          {!loading && profile && (
            <div className="space-y-2.5">
              <p className="text-xs italic leading-relaxed text-ink-soft">{profile.summary}</p>
              {TASTE_DIMENSIONS.map((dim) => {
                const value = profile.dimensions[dim.id] ?? 0;
                return (
                  <div key={dim.id} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs text-ink-faint">{t(lang, dim.labelKey)}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-clay" style={{ width: `${(value / 5) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
