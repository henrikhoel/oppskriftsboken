"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import {
  createCategory,
  deleteCategory,
  generateEnglishCategoryName,
  saveEnglishCategoryName,
} from "@/lib/actions/categories";
import { slugify } from "@/lib/utils/slug";
import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";

/**
 * Én kategori-rad, inkl. det engelske navnet (categories.name_en) – vises i
 * lister/forsiden/kategorisider når besøkende bytter til engelsk (se
 * lib/utils/format.ts -> localizedCategoryName). Eget frittstående
 * mini-skjema per rad (lagrer seg selv med det samme), samme mønster som
 * "Engelsk tittel/beskrivelse" i RecipeForm.tsx.
 */
function CategoryRow({
  category,
  onDelete,
  isDeleting,
}: {
  category: Category;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [nameEn, setNameEn] = useState(category.nameEn ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleGenerate() {
    setRowError(null);
    setNotice(null);
    setIsGenerating(true);
    try {
      const result = await generateEnglishCategoryName(category.id, category.name);
      if (!result.success) {
        setRowError(result.error ?? "Kunne ikke generere engelsk navn.");
        return;
      }
      setNameEn(result.nameEn ?? "");
      setNotice("Lagret.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    setRowError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const result = await saveEnglishCategoryName(category.id, nameEn);
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
        <p className="text-xs text-ink-faint">/kategori/{category.slug}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Engelsk navn"
          aria-label={`Engelsk navn for kategorien ${category.name}`}
          className="w-36 rounded-lg border border-line-strong bg-cream px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || isSaving}
          className="rounded-full px-2.5 py-1.5 text-xs font-medium text-clay transition-colors hover:bg-cream-dark hover:text-clay-dark disabled:opacity-50"
        >
          {isGenerating ? "Genererer …" : "Generer med AI"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isGenerating || isSaving}
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

export function CategoryManager({ categories }: { categories: Category[] }) {
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
      const result = await createCategory({ name: trimmed, slug: slugify(trimmed) });
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
      await deleteCategory(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-ink">
            Ny kategori
          </label>
          <input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. Supper"
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
          <CategoryRow key={category.id} category={category} onDelete={handleDelete} isDeleting={isPending} />
        ))}
      </ul>
    </div>
  );
}
