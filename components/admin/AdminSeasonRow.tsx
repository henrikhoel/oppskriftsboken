"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import type { Season } from "@/lib/types";
import { setSeasonPublished, deleteSeason } from "@/lib/actions/seasons";
import { TrashIcon } from "@/components/ui/icons";

const MONTH_ABBR_NO = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

/** Speiler AdminGuideRow.tsx – én rad i sesong-oversikten
 * (app/admin/(dashboard)/sesonger/page.tsx). Samme publiser-veksle/
 * rediger/slett-mønster. */
export function AdminSeasonRow({ season }: { season: Season }) {
  const [isPublished, setIsPublished] = useState(season.isPublished);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  function handleTogglePublish() {
    const next = !isPublished;
    setIsPublished(next);
    startTransition(async () => {
      try {
        await setSeasonPublished(season.id, next);
        router.refresh();
      } catch {
        setIsPublished(!next);
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteSeason(season.id);
    });
  }

  const monthsLabel = [...season.months]
    .sort((a, b) => a - b)
    .map((m) => MONTH_ABBR_NO[m - 1])
    .join(", ");

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/sesonger/${season.id}`} className="truncate font-medium text-ink hover:text-clay">
          {season.nameNo}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          <span>{monthsLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleTogglePublish}
        disabled={isPending}
        aria-pressed={isPublished}
        className={clsx(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          isPublished ? "border-olive bg-olive-light text-olive-dark" : "border-line-strong bg-cream text-ink-faint",
        )}
      >
        {isPublished ? "Publisert" : "Utkast"}
      </button>

      <Link
        href={`/admin/sesonger/${season.id}`}
        className="shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-cream-dark"
      >
        Rediger
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={clsx(
          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          confirmingDelete ? "bg-clay-dark text-cream" : "text-ink-faint hover:bg-clay-light hover:text-clay-dark",
        )}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        {confirmingDelete ? "Bekreft sletting" : "Slett"}
      </button>
    </div>
  );
}
