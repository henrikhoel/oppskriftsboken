"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { uploadRecipeImage } from "@/lib/actions/upload";
import { generateRecipeHeroImage } from "@/lib/actions/ai";
import { ImageIcon, SparklesIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";

export interface ImageValue {
  url: string;
  alt: string;
}

/** Kontekst brukt til å bygge AI-bilde-prompten – kun relevant når
 * `aiGenerate` er satt (dvs. kun for oppskriftens hovedbilde). */
export interface AiGenerateContext {
  title: string;
  description: string;
  ingredientNames: string[];
}

export function ImageUploadField({
  value,
  onChange,
  label,
  altPlaceholder,
  isAiGenerated,
  onAiGeneratedChange,
  aiGenerate,
}: {
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  label: string;
  altPlaceholder?: string;
  /** true = gjeldende `value` er et AI-generert plassholderbilde, ikke et ekte foto. */
  isAiGenerated?: boolean;
  onAiGeneratedChange?: (isAiGenerated: boolean) => void;
  /** Sett kun på hovedbildet – viser "Generer AI-bilde"-knappen når dette finnes. */
  aiGenerate?: AiGenerateContext;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadRecipeImage(formData);
      if (!result.success || !result.url) {
        setError(result.error ?? "Opplasting feilet");
        return;
      }
      // Et ekte opplastet bilde erstatter alltid et ev. AI-plassholderbilde.
      onAiGeneratedChange?.(false);
      onChange({ url: result.url, alt: value?.alt ?? "" });
    });

    e.target.value = "";
  }

  function handleGenerateClick() {
    if (!aiGenerate) return;
    setError(null);

    startGenerating(async () => {
      const result = await generateRecipeHeroImage(aiGenerate);
      if (!result.success || !result.url) {
        setError(result.error ?? "Kunne ikke generere bilde");
        return;
      }
      onAiGeneratedChange?.(true);
      onChange({ url: result.url, alt: value?.alt ?? aiGenerate.title });
    });
  }

  function handleRemove() {
    onAiGeneratedChange?.(false);
    onChange(null);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      <div className="flex items-start gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-cream-dark">
          {value?.url ? (
            <Image src={value.url} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          {(isPending || isGenerating) && (
            <div className="absolute inset-0 flex items-center justify-center bg-cream/60 text-center text-ink text-xs">
              {isGenerating ? "Genererer …" : "Laster opp …"}
            </div>
          )}
          {isAiGenerated && value?.url && !isPending && !isGenerating && (
            <div className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-cream/80 px-2 py-0.5 text-[10px] font-medium text-ink">
              <SparklesIcon className="h-3 w-3" />
              AI-generert
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending || isGenerating}
              className="flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-xs font-medium text-ink hover:bg-cream-dark disabled:opacity-50"
            >
              <UploadIcon className="h-3.5 w-3.5" />
              {value ? "Bytt bilde" : "Last opp"}
            </button>
            {aiGenerate && (
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isPending || isGenerating}
                title="Genererer et midlertidig AI-bilde av retten, frem til du legger inn et ekte foto"
                className="flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-xs font-medium text-ink hover:bg-cream-dark disabled:opacity-50"
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                {isGenerating ? "Genererer …" : "Generer AI-bilde"}
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending || isGenerating}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-ink-faint hover:bg-clay-light hover:text-clay-dark disabled:opacity-50"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Fjern
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={handleFileChange}
          />
          {aiGenerate && isAiGenerated && value?.url && (
            <p className="text-xs text-ink-faint">
              Dette er et AI-generert plassholderbilde. Last opp et ekte foto når du har et.
            </p>
          )}
          {value && (
            <input
              type="text"
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder={altPlaceholder ?? "Alt-tekst (beskrivelse av bildet)"}
              aria-label="Alt-tekst for bildet"
              // text-base på mobil (unngår iOS-innzooming ved fokus).
              className="w-full rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-xs"
            />
          )}
          {error && <p className="text-xs text-clay-dark">{error}</p>}
        </div>
      </div>
    </div>
  );
}
