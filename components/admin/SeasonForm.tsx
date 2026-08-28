"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SeasonWithIngredients } from "@/lib/types";
import { createSeason, updateSeason, suggestSeasonSlug } from "@/lib/actions/seasons";
import { slugify } from "@/lib/utils/slug";
import { newSeasonalIngredient, type FormSeasonalIngredient } from "@/lib/admin-form-types";
import { SeasonalIngredientsEditor } from "@/components/admin/SeasonalIngredientsEditor";
import { Button } from "@/components/ui/Button";

/**
 * Admin-skjema for én sesong ("I sesong") – speiler GuideForm.tsx sin
 * grunnstruktur (Field/inputClass-mønster, samme faste bunn-knapperad,
 * samme create/update-forgrening basert på om `season` er gitt). Råvarene
 * redigeres inni samme skjema, se filheaderen til lib/actions/seasons.ts
 * for hvorfor.
 */

const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "Mars" },
  { value: 4, label: "April" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function seasonToFormIngredients(season?: SeasonWithIngredients | null): FormSeasonalIngredient[] {
  if (!season || season.ingredients.length === 0) return [newSeasonalIngredient()];
  return season.ingredients.map((i) => ({
    key: i.id,
    slug: i.slug,
    nameNo: i.nameNo,
    nameEn: i.nameEn ?? "",
    aliases: i.aliases.join(", "),
    category: i.category,
    originGroup: i.originGroup,
    origin: i.origin,
    availableStartMonth: i.availableStartMonth != null ? String(i.availableStartMonth) : "",
    availableEndMonth: i.availableEndMonth != null ? String(i.availableEndMonth) : "",
    seasonStartMonth: i.seasonStartMonth != null ? String(i.seasonStartMonth) : "",
    seasonEndMonth: i.seasonEndMonth != null ? String(i.seasonEndMonth) : "",
    peakStartMonth: i.peakStartMonth != null ? String(i.peakStartMonth) : "",
    peakEndMonth: i.peakEndMonth != null ? String(i.peakEndMonth) : "",
    descriptionNo: i.descriptionNo ?? "",
    descriptionEn: i.descriptionEn ?? "",
    seasonNoteNo: i.seasonNoteNo ?? "",
    seasonNoteEn: i.seasonNoteEn ?? "",
    sourceName: i.sourceName ?? "",
    sourceUrl: i.sourceUrl ?? "",
    sourceNote: i.sourceNote ?? "",
    verifiedAt: i.verifiedAt ?? "",
  }));
}

const inputClass =
  "w-full rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-sm";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function SeasonForm({ season }: { season?: SeasonWithIngredients | null }) {
  const router = useRouter();
  const isEditing = Boolean(season);

  const [nameNo, setNameNo] = useState(season?.nameNo ?? "");
  const [nameEn, setNameEn] = useState(season?.nameEn ?? "");
  const [slug, setSlug] = useState(season?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [months, setMonths] = useState<number[]>(season?.months ?? []);
  const [introNo, setIntroNo] = useState(season?.introNo ?? "");
  const [introEn, setIntroEn] = useState(season?.introEn ?? "");
  const [ingredients, setIngredients] = useState<FormSeasonalIngredient[]>(seasonToFormIngredients(season));
  const [isPublished, setIsPublished] = useState(season?.isPublished ?? true);

  const [isSuggestingSlug, setIsSuggestingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleNameBlur() {
    if (slugTouched || !nameNo.trim()) return;
    setIsSuggestingSlug(true);
    try {
      const suggested = await suggestSeasonSlug(nameNo, season?.id);
      setSlug(suggested);
    } finally {
      setIsSuggestingSlug(false);
    }
  }

  function toggleMonth(month: number) {
    setMonths((prev) => (prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      nameNo,
      nameEn: nameEn.trim() || null,
      slug: slug || slugify(nameNo),
      months,
      introNo,
      introEn: introEn.trim() || null,
      isPublished,
      ingredients: ingredients
        .filter((i) => i.nameNo.trim() !== "")
        .map((i) => ({
          slug: i.slug.trim() || slugify(i.nameNo),
          nameNo: i.nameNo,
          nameEn: i.nameEn.trim() || null,
          aliases: i.aliases
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          category: i.category,
          originGroup: i.originGroup,
          origin: i.origin,
          availableStartMonth: i.availableStartMonth === "" ? null : Number(i.availableStartMonth),
          availableEndMonth: i.availableEndMonth === "" ? null : Number(i.availableEndMonth),
          seasonStartMonth: i.seasonStartMonth === "" ? null : Number(i.seasonStartMonth),
          seasonEndMonth: i.seasonEndMonth === "" ? null : Number(i.seasonEndMonth),
          peakStartMonth: i.peakStartMonth === "" ? null : Number(i.peakStartMonth),
          peakEndMonth: i.peakEndMonth === "" ? null : Number(i.peakEndMonth),
          descriptionNo: i.descriptionNo.trim() || null,
          descriptionEn: i.descriptionEn.trim() || null,
          seasonNoteNo: i.seasonNoteNo.trim() || null,
          seasonNoteEn: i.seasonNoteEn.trim() || null,
          sourceName: i.sourceName.trim() || null,
          sourceUrl: i.sourceUrl.trim() || null,
          sourceNote: i.sourceNote.trim() || null,
          verifiedAt: i.verifiedAt.trim() || null,
        })),
    };

    if (payload.months.length === 0) {
      setError("Velg minst én måned.");
      return;
    }

    startTransition(async () => {
      const result = isEditing ? await updateSeason(season!.id, payload) : await createSeason(payload);

      if (!result.success) {
        setError(result.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }

      router.push("/admin/sesonger");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-28">
      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Navn og slug</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Navn (norsk)" htmlFor="nameNo">
            <input
              id="nameNo"
              value={nameNo}
              onChange={(e) => setNameNo(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="F.eks. Sensommer"
              className={inputClass}
            />
          </Field>
          <Field label="Navn (engelsk, valgfritt)" htmlFor="nameEn">
            <input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="F.eks. Late summer"
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          label="Slug"
          htmlFor="slug"
          hint={isSuggestingSlug ? "Foreslår …" : "Brukes i URL-en, f.eks. /sesong/sensommer"}
        >
          <input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Måneder</h2>
        <p className="text-xs text-ink-faint">
          Hvilke kalendermåneder denne sesongen gjelder for. Avgjør når den vises som «gjeldende sesong».
        </p>
        <div className="flex flex-wrap gap-2">
          {MONTH_OPTIONS.map((m) => {
            const checked = months.includes(m.value);
            return (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  checked ? "border-clay bg-clay-light text-clay-dark" : "border-line-strong text-ink-soft hover:bg-cream-dark"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleMonth(m.value)} className="h-3.5 w-3.5 accent-clay" />
                {m.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Introtekst</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Norsk" htmlFor="introNo">
            <textarea
              id="introNo"
              value={introNo}
              onChange={(e) => setIntroNo(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label="Engelsk (valgfritt)" htmlFor="introEn">
            <textarea
              id="introEn"
              value={introEn}
              onChange={(e) => setIntroEn(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Råvarer</h2>
        <SeasonalIngredientsEditor ingredients={ingredients} onChange={setIngredients} seasonId={season?.id} />
      </section>

      <section className="flex flex-wrap items-center gap-6 rounded-card border border-line bg-paper p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-clay" />
          Publisert
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-3 text-sm text-clay-dark">
          {error}
        </p>
      )}

      <div
        className="fixed inset-x-0 z-40 border-t border-line bg-paper/95 shadow-card-hover backdrop-blur"
        style={{ bottom: "var(--bottom-nav-h, 0px)" }}
      >
        <div className="mx-auto flex max-w-3xl justify-end gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/sesonger")}>
            Avbryt
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Lagrer …" : isEditing ? "Lagre endringer" : "Opprett sesong"}
          </Button>
        </div>
      </div>
    </form>
  );
}
