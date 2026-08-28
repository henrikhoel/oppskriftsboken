"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GuideCategory } from "@/lib/types";
import { createGuideCategory, deleteGuideCategory, saveEnglishGuideCategoryName } from "@/lib/actions/guide-categories";
import { slugify } from "@/lib/utils/slug";
import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";

/**
 * Speiler CategoryManager.tsx (oppskrift-kategorier) tett, men UTEN
 * "Generer med AI"-knappen for det engelske navnet – se filheaderen til
 * lib/actions/guide-categories.ts for hvorfor: bevisst manuelt i denne
 * fasen, kan legges til senere ved behov.
 */
function GuideCategoryRow({
  category,
  onDelete,
  isDeleting,
}: {
  category: GuideCategory;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [nameEn, setNameEn] = useState(category.nameEn ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleSave() {
    setRowError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const result = await saveEnglishGuideCategoryName(category.id, nameEn);
      if (!result.success) {
        setRowError(result.error ?? "Kunne ikke lagre engelsk navn.");
        return;
      }
      setNotice("Lagret.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ink">{category.name}</p>
        <p className="text-xs text-ink-faint">/hvordan-gjor-jeg-det/kategori/{category.slug}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Engelsk navn"
          aria-label={`Engelsk navn for kategorien ${category.name}`}
          className="w-36 rounded-lg border border-line-strong bg-cream px-2.5 py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-dark disabled:opacity-50"
        >
          {isSaving ? "Lagrer …" : "Lagre"}
        </button>
        {notice && <span className="text-xs text-ink-faint">{notice}</span>}

        <button
          type="button"
          onClick={() => onDelete(category.id)}
          disabled={isDeleting}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-clay-light hover:text-clay-dark disabled:opacity-50"
          aria-label={`Slett kategorien ${category.name}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {rowError && <p className="w-full text-xs text-clay-dark sm:hidden">{rowError}</p>}
    </li>
  );
}

export function GuideCategoryManager({ categories }: { categories: GuideCategory[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await createGuideCategory({ name: trimmed, slug: slugify(trimmed) });
      if (!result.success) {
        setError(result.error ?? "Kunne ikke opprette kategori");
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteGuideCategory(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="guide-category-name" className="mb-1.5 block text-sm font-medium text-ink">
            Ny kategori
          </label>
          <input
            id="guide-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. Grunnteknikker"
            className="w-full rounded-xl border border-line-strong bg-paper px-4 py-2.5 text-ink focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={isPending || !name.trim()}>
          Legg til
        </Button>
      </form>

      {error && <p className="text-sm text-clay-dark">{error}</p>}

      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
        {categories.map((category) => (
          <GuideCategoryRow key={category.id} category={category} onDelete={handleDelete} isDeleting={isPending} />
        ))}
      </ul>
    </div>
  );
}
