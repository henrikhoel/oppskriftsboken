"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import type { GuideSummary } from "@/lib/types";
import { setGuidePublished, deleteGuide } from "@/lib/actions/guides";
import { Badge } from "@/components/ui/Badge";
import { TrashIcon } from "@/components/ui/icons";

/** Speiler AdminRecipeRow.tsx – én rad i guide-oversikten
 * (app/admin/(dashboard)/guider/page.tsx). Ingen bilde-thumbnail her
 * (guider har ingen hero-bilder), ellers samme publiser-veksle/rediger/
 * slett-mønster. */
export function AdminGuideRow({ guide }: { guide: GuideSummary }) {
  const [isPublished, setIsPublished] = useState(guide.isPublished);
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  function handleTogglePublish() {
    const next = !isPublished;
    setIsPublished(next);
    startTransition(async () => {
      try {
        await setGuidePublished(guide.id, next);
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
      await deleteGuide(guide.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/guider/${guide.id}`} className="truncate font-medium text-ink hover:text-clay">
          {guide.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          {guide.category && <span>{guide.category.name}</span>}
          {guide.isDemo && <Badge tone="mustard">Demo</Badge>}
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
        href={`/admin/guider/${guide.id}`}
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
