"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Category, Recipe } from "@/lib/types";
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS, type Difficulty } from "@/lib/config";
import {
  createRecipe,
  updateRecipe,
  generateEnglishTitleDescription,
  saveEnglishTitleDescription,
  generateTasteProfile,
  generateNutritionInfo,
} from "@/lib/actions/recipes";
import { importRecipeFromUrl } from "@/lib/actions/recipe-import";
import { TASTE_DIMENSIONS, type TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { NUTRITION_FIELDS, type NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import { slugify } from "@/lib/utils/slug";
import {
  newIngredientGroup,
  newStep,
  makeKey,
  type FormIngredientGroup,
  type FormStep,
} from "@/lib/admin-form-types";
import { IngredientGroupsEditor } from "@/components/admin/IngredientGroupsEditor";
import { StepsEditor } from "@/components/admin/StepsEditor";
import { ImageUploadField, type ImageValue } from "@/components/admin/ImageUploadField";
import { TagInput } from "@/components/admin/TagInput";
import { Button } from "@/components/ui/Button";

function recipeToFormGroups(recipe?: Recipe | null): FormIngredientGroup[] {
  if (!recipe || recipe.ingredientGroups.length === 0) return [newIngredientGroup()];
  return recipe.ingredientGroups.map((g) => ({
    key: g.id,
    title: g.title ?? "",
    items: g.items.map((i) => ({
      key: i.id,
      amount: i.amount ?? "",
      unit: i.unit ?? "",
      name: i.name,
      note: i.note ?? "",
    })),
  }));
}

function recipeToFormSteps(recipe?: Recipe | null): FormStep[] {
  if (!recipe || recipe.steps.length === 0) return [newStep()];
  return recipe.steps.map((s) => ({ key: s.id, groupTitle: s.groupTitle ?? "", text: s.text }));
}

export function RecipeForm({
  recipe,
  categories,
}: {
  recipe?: Recipe | null;
  categories: Category[];
}) {
  const router = useRouter();
  const isEditing = Boolean(recipe);

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [slug, setSlug] = useState(recipe?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [heroImage, setHeroImage] = useState<ImageValue | null>(
    recipe?.heroImageUrl ? { url: recipe.heroImageUrl, alt: recipe.heroImageAlt ?? "" } : null,
  );
  const [heroImageIsAiGenerated, setHeroImageIsAiGenerated] = useState(
    recipe?.heroImageIsAiGenerated ?? false,
  );
  const [galleryImages, setGalleryImages] = useState<ImageValue[]>(
    recipe?.images.map((img) => ({ url: img.url, alt: img.alt ?? "" })) ?? [],
  );
  const [categoryId, setCategoryId] = useState(recipe?.category?.id ?? "");
  const [tags, setTags] = useState<string[]>(recipe?.tags.map((t) => t.name) ?? []);
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [prepTime, setPrepTime] = useState<string>(
    recipe?.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : "",
  );
  const [cookTime, setCookTime] = useState<string>(
    recipe?.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : "",
  );
  const [totalTime, setTotalTime] = useState<string>(
    recipe?.totalTimeMinutes != null ? String(recipe.totalTimeMinutes) : "",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(recipe?.difficulty ?? "middels");
  const [groups, setGroups] = useState<FormIngredientGroup[]>(recipeToFormGroups(recipe));
  const [steps, setSteps] = useState<FormStep[]>(recipeToFormSteps(recipe));
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [tips, setTips] = useState(recipe?.tips ?? "");
  const [source, setSource] = useState(recipe?.source ?? "");
  const [isPublished, setIsPublished] = useState(recipe?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(recipe?.isFeatured ?? false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // "Importer fra lenke" – KUN for nye oppskrifter (isEditing=false). Henter
  // en ekstern oppskriftsside server-side og fyller ut resten av skjemaet
  // automatisk (se lib/actions/recipe-import.ts sin filheader for hvordan
  // deterministisk JSON-LD-parsing og AI spiller sammen). Skriver ALDRI til
  // databasen selv – fyller kun ut skjemafeltene under, akkurat som om du
  // hadde skrevet dem inn for hånd. Du må fortsatt trykke
  // "Opprett oppskrift" nederst for å faktisk lagre, og bør gå gjennom
  // feltene først (spesielt ved lav treffsikkerhet, se importWarning).
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);

  async function handleImport() {
    setImportError(null);
    setImportWarning(null);
    setIsImporting(true);
    try {
      const draft = await importRecipeFromUrl(
        importUrl,
        categories.map((c) => ({ id: c.id, name: c.name })),
      );

      setTitle(draft.title);
      if (!slugTouched) setSlug(slugify(draft.title));
      setDescription(draft.description);
      if (draft.heroImageUrl) {
        setHeroImage({ url: draft.heroImageUrl, alt: draft.title });
        setHeroImageIsAiGenerated(false);
      }
      if (draft.categoryId) setCategoryId(draft.categoryId);
      if (draft.tags.length > 0) setTags(draft.tags);
      if (draft.servings != null) setServings(draft.servings);
      setPrepTime(draft.prepTimeMinutes != null ? String(draft.prepTimeMinutes) : "");
      setCookTime(draft.cookTimeMinutes != null ? String(draft.cookTimeMinutes) : "");
      setTotalTime(draft.totalTimeMinutes != null ? String(draft.totalTimeMinutes) : "");
      setDifficulty(draft.difficulty);
      setGroups(
        draft.ingredientGroups.map((g) => ({
          key: makeKey(),
          title: g.title ?? "",
          items: g.items.map((i) => ({ key: makeKey(), amount: i.amount, unit: i.unit, name: i.name, note: i.note })),
        })),
      );
      setSteps(
        draft.steps.map((s) => ({ key: makeKey(), groupTitle: s.groupTitle ?? "", text: s.text })),
      );
      setSource(draft.source);
      if (draft.warning) setImportWarning(draft.warning);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Kunne ikke importere oppskriften. Prøv igjen.");
    } finally {
      setIsImporting(false);
    }
  }

  // Engelsk tittel/beskrivelse (recipes.title_en/description_en) – vises i
  // lister/forsiden når besøkende bytter til engelsk (se
  // lib/utils/format.ts -> localizedTitle/localizedDescription). Eget,
  // frittstående lite skjema (ikke en del av hovedskjemaets submit) siden
  // det lagrer seg selv med det samme, uavhengig av om resten av
  // oppskriften endres.
  const [titleEn, setTitleEn] = useState(recipe?.titleEn ?? "");
  const [descriptionEn, setDescriptionEn] = useState(recipe?.descriptionEn ?? "");
  const [isGeneratingEnglish, setIsGeneratingEnglish] = useState(false);
  const [isSavingEnglish, setIsSavingEnglish] = useState(false);
  const [englishError, setEnglishError] = useState<string | null>(null);
  const [englishSavedNotice, setEnglishSavedNotice] = useState<string | null>(null);

  async function handleGenerateEnglish() {
    if (!recipe) return;
    setEnglishError(null);
    setEnglishSavedNotice(null);
    setIsGeneratingEnglish(true);
    try {
      const result = await generateEnglishTitleDescription(recipe.id, { title, description });
      if (!result.success) {
        setEnglishError(result.error ?? "Kunne ikke generere engelsk tekst.");
        return;
      }
      setTitleEn(result.titleEn ?? "");
      setDescriptionEn(result.descriptionEn ?? "");
      setEnglishSavedNotice("Generert og lagret.");
    } finally {
      setIsGeneratingEnglish(false);
    }
  }

  async function handleSaveEnglish() {
    if (!recipe) return;
    setEnglishError(null);
    setEnglishSavedNotice(null);
    setIsSavingEnglish(true);
    try {
      const result = await saveEnglishTitleDescription(recipe.id, { titleEn, descriptionEn });
      if (!result.success) {
        setEnglishError(result.error ?? "Kunne ikke lagre engelsk tekst.");
        return;
      }
      setEnglishSavedNotice("Lagret.");
    } finally {
      setIsSavingEnglish(false);
    }
  }

  // Smaksprofil (Fase 4 – Smak) – forhåndsgenerert og lagret fast på
  // oppskriften (recipes.taste_profile), IKKE en live per-besøk AI-
  // beregning – se filheaderen i lib/kitchen-intelligence/taste.ts. Bruker
  // (som handleGenerateEnglish over) skjemaets NÅVÆRENDE, evt. ulagrede
  // felt – lar deg justere ingredienser og generere på nytt uten å måtte
  // lagre hele oppskriften først.
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(recipe?.tasteProfile ?? null);
  const [isGeneratingTaste, setIsGeneratingTaste] = useState(false);
  const [tasteError, setTasteError] = useState<string | null>(null);

  async function handleGenerateTasteProfile() {
    if (!recipe) return;
    setTasteError(null);
    setIsGeneratingTaste(true);
    try {
      const ingredientNames = groups.flatMap((g) => g.items.map((i) => i.name.trim())).filter(Boolean);
      const result = await generateTasteProfile(recipe.id, { title, description, ingredientNames });
      if (!result.success || !result.tasteProfile) {
        setTasteError(result.error ?? "Kunne ikke generere smaksprofil.");
        return;
      }
      setTasteProfile(result.tasteProfile);
    } finally {
      setIsGeneratingTaste(false);
    }
  }

  // Næringsinnhold (kalori-/makro-oversikt) – samme
  // admin-genererer-og-lagrer-fast-mønster som smaksprofilen over, men vises
  // bak en "vis"-knapp på selve oppskriftssiden i stedet for alltid synlig
  // (se NutritionPanel.tsx). I MOTSETNING til smaksprofilen sender vi her
  // med de FAKTISKE MENGDENE (amount/unit), ikke bare ingrediensnavnene –
  // se filheaderen til generateNutritionInfo i lib/actions/recipes.ts.
  const [nutritionInfo, setNutritionInfo] = useState<NutritionInfo | null>(recipe?.nutritionInfo ?? null);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);

  async function handleGenerateNutrition() {
    if (!recipe) return;
    setNutritionError(null);
    setIsGeneratingNutrition(true);
    try {
      const ingredients = groups
        .flatMap((g) => g.items)
        .map((i) => ({ amount: i.amount.trim() || null, unit: i.unit.trim() || null, name: i.name.trim() }))
        .filter((i) => i.name !== "");
      const result = await generateNutritionInfo(recipe.id, { title, description, servings, ingredients });
      if (!result.success || !result.nutritionInfo) {
        setNutritionError(result.error ?? "Kunne ikke generere næringsinnhold.");
        return;
      }
      setNutritionInfo(result.nutritionInfo);
    } finally {
      setIsGeneratingNutrition(false);
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      slug: slug || slugify(title),
      description,
      heroImageUrl: heroImage?.url ?? "",
      heroImageAlt: heroImage?.alt || null,
      heroImageIsAiGenerated: heroImage ? heroImageIsAiGenerated : false,
      categoryId: categoryId || "",
      tagNames: tags,
      images: galleryImages
        .filter((img) => img.url.trim() !== "")
        .map((img) => ({ url: img.url, alt: img.alt || null })),
      servings: Number(servings) || 1,
      prepTimeMinutes: prepTime === "" ? null : Number(prepTime),
      cookTimeMinutes: cookTime === "" ? null : Number(cookTime),
      totalTimeMinutes: totalTime === "" ? null : Number(totalTime),
      difficulty,
      ingredientGroups: groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({
            amount: i.amount || null,
            unit: i.unit || null,
            name: i.name,
            note: i.note || null,
          })),
      })),
      steps: steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text })),
      notes: notes || null,
      tips: tips || null,
      source: source || null,
      isPublished,
      isFeatured,
    };

    if (payload.ingredientGroups.every((g) => g.items.length === 0)) {
      setError("Legg til minst én ingrediens.");
      return;
    }
    if (payload.steps.length === 0) {
      setError("Legg til minst ett steg.");
      return;
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateRecipe(recipe!.id, payload)
        : await createRecipe(payload);

      if (!result.success) {
        setError(result.error ?? "Noe gikk galt. Prøv igjen.");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-16">
      {!isEditing && (
        <section className="space-y-3 rounded-card border border-line bg-paper p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-xl text-ink">Importer fra lenke</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Lim inn en lenke til en oppskrift på en annen nettside – resten av skjemaet under fylles ut
              automatisk. Amerikanske mål (cups/oz/lb/°F) konverteres til norske kjøkkenmål (dl/g/kg/°C),
              avrundet til naturlige tall. Gå gjennom (og juster om nødvendig) før du oppretter oppskriften.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={isImporting}
              className={inputClass}
            />
            <Button type="button" variant="outline" onClick={handleImport} disabled={isImporting || !importUrl.trim()}>
              {isImporting ? "Henter …" : "Hent oppskrift"}
            </Button>
          </div>
          {importError && <p className="text-sm text-clay-dark">{importError}</p>}
          {importWarning && <p className="text-xs text-clay-dark">{importWarning}</p>}
        </section>
      )}

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Grunnleggende</h2>

        <Field label="Tittel" htmlFor="title">
          <input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Slug (URL)" htmlFor="slug" hint="Genereres automatisk fra tittelen, men kan endres manuelt.">
          <input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Kort beskrivelse" htmlFor="description">
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="Hovedbilde"
            value={heroImage}
            onChange={setHeroImage}
            isAiGenerated={heroImageIsAiGenerated}
            onAiGeneratedChange={setHeroImageIsAiGenerated}
            aiGenerate={{
              title,
              description,
              ingredientNames: groups.flatMap((g) => g.items.map((i) => i.name)).filter(Boolean),
            }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Flere bilder</p>
          <div className="space-y-4">
            {galleryImages.map((img, index) => (
              <ImageUploadField
                key={index}
                label={`Bilde ${index + 2}`}
                value={img}
                onChange={(next) => {
                  if (!next) {
                    setGalleryImages(galleryImages.filter((_, i) => i !== index));
                  } else {
                    setGalleryImages(galleryImages.map((g, i) => (i === index ? next : g)));
                  }
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setGalleryImages([...galleryImages, { url: "", alt: "" }])}
              className="text-sm font-medium text-clay hover:text-clay-dark"
            >
              + Legg til bilde
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="category">
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">Ingen kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags" htmlFor="tags">
            <TagInput tags={tags} onChange={setTags} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">Engelsk tittel/beskrivelse</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Vises i lister og på forsiden når besøkende bytter til engelsk. Ingredienser/steg
              oversettes fortsatt automatisk med AI på selve oppskriftssiden, uendret av dette.
            </p>
          </div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateEnglish}
              disabled={isGeneratingEnglish || isSavingEnglish}
            >
              {isGeneratingEnglish ? "Genererer …" : "Generer med AI"}
            </Button>
          )}
        </div>

        {isEditing ? (
          <>
            <Field label="Engelsk tittel" htmlFor="titleEn">
              <input
                id="titleEn"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Engelsk beskrivelse" htmlFor="descriptionEn">
              <textarea
                id="descriptionEn"
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </Field>
            {englishError && <p className="text-sm text-clay-dark">{englishError}</p>}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSaveEnglish}
                disabled={isSavingEnglish || isGeneratingEnglish}
              >
                {isSavingEnglish ? "Lagrer …" : "Lagre engelsk tekst"}
              </Button>
              {englishSavedNotice && <span className="text-xs text-ink-faint">{englishSavedNotice}</span>}
            </div>
          </>
        ) : (
          <p className="text-xs italic text-ink-faint">
            Opprett og lagre oppskriften først – deretter kan du generere en engelsk variant her.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">Smaksprofil</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Vises fast, langt oppe på oppskriftssiden – IKKE noe besøkende laster inn selv. Generer
              (eller regenerer) her etter at ingrediensene under er fylt ut.
            </p>
          </div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateTasteProfile}
              disabled={isGeneratingTaste}
            >
              {isGeneratingTaste ? "Genererer …" : tasteProfile ? "Generer på nytt" : "Generer smaksprofil"}
            </Button>
          )}
        </div>

        {isEditing ? (
          <>
            {tasteError && <p className="text-sm text-clay-dark">{tasteError}</p>}
            {tasteProfile ? (
              <div className="space-y-2 rounded-xl border border-line bg-cream-dark/40 p-3.5">
                <p className="text-xs italic leading-relaxed text-ink-soft">{tasteProfile.summary}</p>
                {tasteProfile.summaryEn && (
                  <p className="text-xs italic leading-relaxed text-ink-faint">{tasteProfile.summaryEn}</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 sm:grid-cols-3">
                  {TASTE_DIMENSIONS.map((dim) => (
                    <div key={dim.id} className="flex items-center justify-between text-xs text-ink-soft">
                      <span>{dim.id}</span>
                      <span className="font-medium text-ink">{tasteProfile.dimensions[dim.id]}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs italic text-ink-faint">Ingen smaksprofil generert ennå.</p>
            )}
          </>
        ) : (
          <p className="text-xs italic text-ink-faint">
            Opprett og lagre oppskriften først – deretter kan du generere en smaksprofil her.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">Næringsinnhold</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Vises bak en "Vis næringsinnhold"-knapp på oppskriftssiden, ikke fast synlig – de som ikke vil
              se det trenger ikke. Generer (eller regenerer) her etter at ingredienser/porsjoner under er
              fylt ut, siden mengdene brukes direkte i beregningen.
            </p>
          </div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateNutrition}
              disabled={isGeneratingNutrition}
            >
              {isGeneratingNutrition ? "Genererer …" : nutritionInfo ? "Generer på nytt" : "Generer næringsinnhold"}
            </Button>
          )}
        </div>

        {isEditing ? (
          <>
            {nutritionError && <p className="text-sm text-clay-dark">{nutritionError}</p>}
            {nutritionInfo ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-line bg-cream-dark/40 p-3.5 sm:grid-cols-4">
                {NUTRITION_FIELDS.map((field) => (
                  <div key={field.id} className="flex items-center justify-between text-xs text-ink-soft">
                    <span>{field.id}</span>
                    <span className="font-medium text-ink">
                      {nutritionInfo[field.id]} {field.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-ink-faint">Ingen næringsinnhold generert ennå.</p>
            )}
          </>
        ) : (
          <p className="text-xs italic text-ink-faint">
            Opprett og lagre oppskriften først – deretter kan du generere næringsinnhold her.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Tid og porsjoner</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Porsjoner" htmlFor="servings">
            <input
              id="servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Forberedelse (min)" htmlFor="prep">
            <input
              id="prep"
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tilberedning (min)" htmlFor="cook">
            <input
              id="cook"
              type="number"
              min={0}
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Totalt (min)" htmlFor="total">
            <input
              id="total"
              type="number"
              min={0}
              value={totalTime}
              onChange={(e) => setTotalTime(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
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
      </section>

      <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="mb-4 font-serif text-xl text-ink">Ingredienser</h2>
        <IngredientGroupsEditor groups={groups} onChange={setGroups} />
      </section>

      <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="mb-4 font-serif text-xl text-ink">Fremgangsmåte</h2>
        <StepsEditor steps={steps} onChange={setSteps} />
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Notater og kilde</h2>
        <Field label="Notater" htmlFor="notes">
          <textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <Field label="Tips" htmlFor="tips">
          <textarea id="tips" value={tips ?? ""} onChange={(e) => setTips(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <Field label="Kilde / opprinnelse" htmlFor="source">
          <input id="source" value={source ?? ""} onChange={(e) => setSource(e.target.value)} className={inputClass} />
        </Field>
      </section>

      <section className="flex flex-wrap items-center gap-6 rounded-card border border-line bg-paper p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Publisert
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Vis som utvalgt på forsiden
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-clay-light px-4 py-3 text-sm text-clay-dark">
          {error}
        </p>
      )}

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-card border border-line bg-paper/95 p-4 shadow-card-hover backdrop-blur">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin")}>
          Avbryt
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Lagrer …" : isEditing ? "Lagre endringer" : "Opprett oppskrift"}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-line-strong bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none";

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
