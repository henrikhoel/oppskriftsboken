"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Guide, GuideCategory } from "@/lib/types";
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS, type Difficulty } from "@/lib/config";
import { createGuide, updateGuide, suggestGuideSlug } from "@/lib/actions/guides";
import { slugify } from "@/lib/utils/slug";
import { newGuideStep, type FormGuideStep } from "@/lib/admin-form-types";
import { GuideStepsEditor } from "@/components/admin/GuideStepsEditor";
import { Button } from "@/components/ui/Button";

/**
 * Admin-skjema for én "Hvordan gjør jeg det?"-guide – speiler
 * RecipeForm.tsx sin grunnstruktur (Field/inputClass-mønster, samme faste
 * bunn-knapperad, samme create/update-forgrening basert på om `guide` er
 * gitt), men UTEN oppskriftsskjemaets AI-drevne seksjoner (import fra
 * lenke, AI-utkast, tidsestimering osv.) – guider fylles inn manuelt i
 * denne fasen, se filheaderen til lib/actions/guide-categories.ts for
 * samme bevisste avgrensning.
 */

function guideToFormSteps(guide?: Guide | null): FormGuideStep[] {
  if (!guide || guide.steps.length === 0) return [newGuideStep()];
  return guide.steps.map((s) => ({
    key: s.id,
    text: s.text,
    textEn: s.textEn ?? "",
    note: s.note ?? "",
    noteEn: s.noteEn ?? "",
    durationMinutes: s.durationMinutes != null ? String(s.durationMinutes) : "",
    temperature: s.temperature ?? "",
  }));
}

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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

/** Enkel "én linje = ett element"-tekstboks for lister som quick-answer/
 * tips/pass på/søketermer/alias – langt raskere å fylle ut manuelt enn en
 * egen legg-til/slett-rad-editor per linje for felter av denne typen (korte,
 * frittstående setninger uten intern struktur, i motsetning til stegene). */
function LineListField({
  label,
  htmlFor,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} hint="Én linje per element.">
      <textarea
        id={htmlFor}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} resize-y`}
      />
    </Field>
  );
}

export function GuideForm({
  guide,
  categories,
  relatedCandidates,
}: {
  guide?: Guide | null;
  categories: GuideCategory[];
  /** Alle ANDRE guider (id/tittel) – ekskluderer denne guiden selv, filtrert
   * av kallende side (app/admin/(dashboard)/guider/[id]/page.tsx /
   * .../ny/page.tsx), til "relaterte guider"-avkrysningslisten under. */
  relatedCandidates: { id: string; title: string }[];
}) {
  const router = useRouter();
  const isEditing = Boolean(guide);

  const [title, setTitle] = useState(guide?.title ?? "");
  const [titleEn, setTitleEn] = useState(guide?.titleEn ?? "");
  const [slug, setSlug] = useState(guide?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [intro, setIntro] = useState(guide?.intro ?? "");
  const [introEn, setIntroEn] = useState(guide?.introEn ?? "");
  const [quickAnswerLines, setQuickAnswerLines] = useState((guide?.quickAnswerLines ?? []).join("\n"));
  const [quickAnswerLinesEn, setQuickAnswerLinesEn] = useState((guide?.quickAnswerLinesEn ?? []).join("\n"));
  const [categoryId, setCategoryId] = useState(guide?.category?.id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(guide?.difficulty ?? "enkel");
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState<string>(
    guide?.estimatedTimeMinutes != null ? String(guide.estimatedTimeMinutes) : "",
  );
  const [estimatedTimeMinutesMax, setEstimatedTimeMinutesMax] = useState<string>(
    guide?.estimatedTimeMinutesMax != null ? String(guide.estimatedTimeMinutesMax) : "",
  );
  const [steps, setSteps] = useState<FormGuideStep[]>(guideToFormSteps(guide));
  const [tips, setTips] = useState((guide?.tips ?? []).join("\n"));
  const [tipsEn, setTipsEn] = useState((guide?.tipsEn ?? []).join("\n"));
  const [warnings, setWarnings] = useState((guide?.warnings ?? []).join("\n"));
  const [warningsEn, setWarningsEn] = useState((guide?.warningsEn ?? []).join("\n"));
  const [searchTerms, setSearchTerms] = useState((guide?.searchTerms ?? []).join("\n"));
  const [searchTermsEn, setSearchTermsEn] = useState((guide?.searchTermsEn ?? []).join("\n"));
  const [aliases, setAliases] = useState((guide?.aliases ?? []).join("\n"));
  const [aliasesEn, setAliasesEn] = useState((guide?.aliasesEn ?? []).join("\n"));
  const [relatedGuideIds, setRelatedGuideIds] = useState<string[]>(guide?.relatedGuides.map((r) => r.id) ?? []);
  const [isPublished, setIsPublished] = useState(guide?.isPublished ?? false);
  const [isDemo, setIsDemo] = useState(guide?.isDemo ?? false);

  const [isSuggestingSlug, setIsSuggestingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleTitleBlur() {
    if (slugTouched || !title.trim()) return;
    setIsSuggestingSlug(true);
    try {
      const suggested = await suggestGuideSlug(title, guide?.id);
      setSlug(suggested);
    } finally {
      setIsSuggestingSlug(false);
    }
  }

  function toggleRelated(id: string) {
    setRelatedGuideIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      titleEn: titleEn.trim() || null,
      slug: slug || slugify(title),
      intro,
      introEn: introEn.trim() || null,
      quickAnswerLines: linesToArray(quickAnswerLines),
      quickAnswerLinesEn: linesToArray(quickAnswerLinesEn),
      categoryId: categoryId || null,
      difficulty,
      estimatedTimeMinutes: estimatedTimeMinutes === "" ? null : Number(estimatedTimeMinutes),
      estimatedTimeMinutesMax: estimatedTimeMinutesMax === "" ? null : Number(estimatedTimeMinutesMax),
      steps: steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({
          text: s.text,
          textEn: s.textEn.trim() || null,
          note: s.note.trim() || null,
          noteEn: s.noteEn.trim() || null,
          durationMinutes: s.durationMinutes === "" ? null : Number(s.durationMinutes),
          temperature: s.temperature.trim() || null,
        })),
      tips: linesToArray(tips),
      tipsEn: linesToArray(tipsEn),
      warnings: linesToArray(warnings),
      warningsEn: linesToArray(warningsEn),
      searchTerms: linesToArray(searchTerms),
      searchTermsEn: linesToArray(searchTermsEn),
      aliases: linesToArray(aliases),
      aliasesEn: linesToArray(aliasesEn),
      relatedGuideIds,
      isPublished,
      isDemo,
    };

    if (payload.steps.length === 0) {
      setError("Legg til minst ett steg.");
      return;
    }

    startTransition(async () => {
      const result = isEditing ? await updateGuide(guide!.id, payload) : await createGuide(payload);

      if (!result.success) {
        setError(result.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }

      router.push("/admin/guider");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-28">
      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Tittel og slug</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tittel (norsk)" htmlFor="title">
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="F.eks. Koke poteter"
              className={inputClass}
            />
          </Field>
          <Field label="Tittel (engelsk, valgfritt)" htmlFor="titleEn">
            <input
              id="titleEn"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="F.eks. Boil potatoes"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Slug" htmlFor="slug" hint={isSuggestingSlug ? "Foreslår …" : "Brukes i URL-en, f.eks. /hvordan-gjor-jeg-det/koke-poteter"}>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Intro (norsk)" htmlFor="intro">
            <textarea id="intro" value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className={`${inputClass} resize-y`} />
          </Field>
          <Field label="Intro (engelsk, valgfritt)" htmlFor="introEn">
            <textarea id="introEn" value={introEn} onChange={(e) => setIntroEn(e.target.value)} rows={2} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Kort svar</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LineListField label="Norsk" htmlFor="quickAnswer" value={quickAnswerLines} onChange={setQuickAnswerLines} placeholder={"Små poteter: ca. 15 min\nMellomstore poteter: ca. 20 min"} />
          <LineListField label="Engelsk" htmlFor="quickAnswerEn" value={quickAnswerLinesEn} onChange={setQuickAnswerLinesEn} />
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Kategori, nivå og tid</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Kategori" htmlFor="category">
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Ingen</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vanskelighetsgrad" htmlFor="difficulty">
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className={inputClass}
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DIFFICULTY_LABELS[level]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tid, fra (min)" htmlFor="timeMin">
            <input
              id="timeMin"
              type="number"
              min={0}
              value={estimatedTimeMinutes}
              onChange={(e) => setEstimatedTimeMinutes(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tid, til (min, valgfritt)" htmlFor="timeMax">
            <input
              id="timeMax"
              type="number"
              min={0}
              value={estimatedTimeMinutesMax}
              onChange={(e) => setEstimatedTimeMinutesMax(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Steg</h2>
        <GuideStepsEditor steps={steps} onChange={setSteps} />
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Tips og pass på</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LineListField label="Tips (norsk)" htmlFor="tips" value={tips} onChange={setTips} />
          <LineListField label="Tips (engelsk)" htmlFor="tipsEn" value={tipsEn} onChange={setTipsEn} />
          <LineListField label="Pass på (norsk)" htmlFor="warnings" value={warnings} onChange={setWarnings} />
          <LineListField label="Pass på (engelsk)" htmlFor="warningsEn" value={warningsEn} onChange={setWarningsEn} />
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Søk</h2>
        <p className="text-xs text-ink-faint">
          Søketermer er frie fraser folk kan søke på (f.eks. «vannete saus»). Alias er navn/synonymer for
          selve begrepet (f.eks. «innbakning» for roux) og vektes høyere i søket.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LineListField label="Søketermer (norsk)" htmlFor="searchTerms" value={searchTerms} onChange={setSearchTerms} />
          <LineListField label="Søketermer (engelsk)" htmlFor="searchTermsEn" value={searchTermsEn} onChange={setSearchTermsEn} />
          <LineListField label="Alias (norsk)" htmlFor="aliases" value={aliases} onChange={setAliases} />
          <LineListField label="Alias (engelsk)" htmlFor="aliasesEn" value={aliasesEn} onChange={setAliasesEn} />
        </div>
      </section>

      {relatedCandidates.length > 0 && (
        <section className="space-y-3 rounded-card border border-line bg-paper p-5 sm:p-6">
          <h2 className="font-serif text-xl text-ink">Relaterte guider</h2>
          <div className="flex flex-wrap gap-2">
            {relatedCandidates.map((candidate) => {
              const checked = relatedGuideIds.includes(candidate.id);
              return (
                <label
                  key={candidate.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    checked ? "border-clay bg-clay-light text-clay-dark" : "border-line-strong text-ink-soft hover:bg-cream-dark"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleRelated(candidate.id)} className="h-3.5 w-3.5 accent-clay" />
                  {candidate.title}
                </label>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-6 rounded-card border border-line bg-paper p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-clay" />
          Publisert
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} className="h-4 w-4 accent-clay" />
          Demo/placeholder-guide
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
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/guider")}>
            Avbryt
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Lagrer …" : isEditing ? "Lagre endringer" : "Opprett guide"}
          </Button>
        </div>
      </div>
    </form>
  );
}
