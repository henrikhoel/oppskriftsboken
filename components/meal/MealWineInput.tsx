"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { identifyWineFromImage } from "@/lib/actions/wine-match";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { CameraIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * "VINEN DIN" (10.09.2026) – vin brukeren ALLEREDE HAR, skrevet inn eller
 * fotografert, og knyttet til menyplanen. Skilt tydelig fra AI-ens egen
 * vinSTIL-anbefaling for HELE menyen (allerede live via
 * EveningExperience.tsx → getEveningCuration, "I GLASSET"-kapittelet) –
 * denne komponenten legger IKKE til noen AI-vurdering, kun et rent
 * fritekst/foto-felt lagret direkte på session.wine (se setMealWine i
 * lib/kitchen-intelligence/meal-session.ts).
 *
 * Samme foto-opplastingsmønster som BeverageMatchChecker i
 * components/recipe/DrinkPairingSection.tsx (resizeImageFileToJpegBase64 +
 * midlertidig blob-forhåndsvisning), men mot den enklere, dedikerte
 * identifyWineFromImage (lib/actions/wine-match.ts) – kun leser etiketten,
 * gjør INGEN katalog-matching (det finnes allerede en annen funksjon for
 * det, matchWineToRecipesFromImage, som ikke passer her).
 *
 * "Kontrollert" av kalleren (MealView.tsx) – ren `wine`/`onChange`-prop,
 * ingen egen useMealSession-tilkobling her.
 */
export function MealWineInput({
  wine,
  onChange,
  lang,
}: {
  wine: { name: string } | null;
  onChange: (wine: { name: string } | null) => void;
  lang: Lang;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function startEditing() {
    setName(wine?.name ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onChange({ name: name.trim() });
    setEditing(false);
  }

  function handlePhotoButtonClick() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setIsAnalyzingPhoto(true);
    try {
      const { base64Data, mediaType } = await resizeImageFileToJpegBase64(file);
      const result = await identifyWineFromImage({ mediaType, base64Data }, lang);
      onChange(result);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "wine.photoError"));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }

  if (wine && !editing) {
    return (
      <div className="border-t border-line pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {t(lang, "mealWineInput.heading")}
        </p>
        <p className="mt-1.5 font-serif text-base text-ink">{t(lang, "mealWineInput.current", { name: wine.name })}</p>
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={startEditing} className="text-xs font-medium text-clay hover:text-clay-dark">
            {t(lang, "mealWineInput.change")}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
          >
            {t(lang, "mealWineInput.remove")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-6">
      <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {t(lang, "mealWineInput.heading")}
      </label>
      <p className="mt-1 text-xs text-ink-faint">{t(lang, "mealWineInput.description")}</p>

      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(lang, "mealWineInput.placeholder")}
          // text-base på mobil (unngår iOS-innzooming ved fokus).
          className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none sm:flex-1 sm:text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handlePhotoButtonClick}
            disabled={isAnalyzingPhoto}
            aria-label={t(lang, "wine.photoAria")}
            title={t(lang, "wine.photoAria")}
            className="flex shrink-0 items-center justify-center rounded-lg border border-line-strong bg-cream px-3 py-2 text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={isAnalyzingPhoto || !name.trim()}
            className="shrink-0 rounded-lg bg-clay px-3.5 py-2 text-xs font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {t(lang, "mealWineInput.addButton")}
          </button>
        </div>
      </form>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

      {photoPreview && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob-forhåndsvisning, ikke egnet for next/image */}
          <img src={photoPreview} alt="" className="h-12 w-12 rounded-lg border border-line-strong object-cover" />
          {isAnalyzingPhoto ? (
            <p className="text-xs text-ink-faint">{t(lang, "wine.analyzingPhoto")}</p>
          ) : (
            <button
              type="button"
              onClick={handlePhotoButtonClick}
              className="text-xs font-medium text-clay hover:text-clay-dark"
            >
              {t(lang, "wine.retakePhoto")}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-clay-dark">{error}</p>}

      {wine && editing && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-xs font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-clay-dark"
        >
          {t(lang, "mealWineInput.cancel")}
        </button>
      )}
    </div>
  );
}
