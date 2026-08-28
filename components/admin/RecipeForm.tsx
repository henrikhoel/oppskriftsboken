"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Category, Recipe } from "@/lib/types";
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS, type Difficulty } from "@/lib/config";
import {
  createRecipe,
  updateRecipe,
  generateEnglishTitleDescription,
  saveEnglishTitleDescription,
  generateTasteProfile,
  clearTasteProfile,
  generateNutritionInfo,
  clearNutritionInfo,
  generateVegetarianVariant,
  saveVegetarianVariant,
  clearVegetarianVariant,
  generateRecipeDraft,
  estimateRecipeTiming,
  generateRecipeTipsAndWarnings,
  generateRecipeDescription,
  suggestRecipeImprovements,
  integrateStepsWithImprovements,
  findRecipesByDishName,
  suggestIngredientGrouping,
} from "@/lib/actions/recipes";
import {
  importRecipeFromUrl,
  importRecipeFromCaptionText,
  extractCaptionTextFromImages,
} from "@/lib/actions/recipe-import";
import { resizeImageFileToJpegBase64 } from "@/lib/utils/image";
import { TASTE_DIMENSIONS, type TasteProfile } from "@/lib/kitchen-intelligence/taste";
import { NUTRITION_FIELDS, type NutritionInfo } from "@/lib/kitchen-intelligence/nutrition";
import type { VegetarianVariant, RecipeImprovementSuggestion, ExternalRecipeMatch } from "@/lib/types";
import { ExternalRecipeMatchCard } from "@/components/admin/ExternalRecipeMatchCard";
import { Drawer } from "@/components/ui/Drawer";
import { slugify } from "@/lib/utils/slug";
import {
  newIngredientGroup,
  newStep,
  makeKey,
  type FormIngredientGroup,
  type FormIngredientItem,
  type FormStep,
} from "@/lib/admin-form-types";
import { IngredientGroupsEditor } from "@/components/admin/IngredientGroupsEditor";
import { StepsEditor } from "@/components/admin/StepsEditor";
import { ImageUploadField, type ImageValue } from "@/components/admin/ImageUploadField";
import { TagInput } from "@/components/admin/TagInput";
import { Button } from "@/components/ui/Button";
import { useMealSession } from "@/lib/hooks/useMealSession";

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

/** Samme konvertering som recipeToFormGroups/recipeToFormSteps over, men for
 * den lagrede vegetarvarianten (VegetarianVariant, se lib/types.ts) – den
 * har ingen egne id-er (kun genereres/redigeres, aldri sortert/hentet fra
 * egne DB-rader slik hoved-ingrediensene/-stegene er), så hver rad får en
 * FERSK React-key via makeKey() uansett. */
function vegetarianToFormGroups(variant: VegetarianVariant | null | undefined): FormIngredientGroup[] {
  if (!variant || variant.ingredientGroups.length === 0) return [newIngredientGroup()];
  return variant.ingredientGroups.map((g) => ({
    key: makeKey(),
    title: g.title ?? "",
    items: g.items.map((i) => ({
      key: makeKey(),
      amount: i.amount ?? "",
      unit: i.unit ?? "",
      name: i.name,
      note: i.note ?? "",
    })),
  }));
}

function vegetarianToFormSteps(variant: VegetarianVariant | null | undefined): FormStep[] {
  if (!variant || variant.steps.length === 0) return [newStep()];
  return variant.steps.map((s) => ({ key: makeKey(), groupTitle: s.groupTitle ?? "", text: s.text }));
}

/** Formaterer cookTimeMinutes/cookTimeMinutesMax tilbake til teksten admin
 * skal se i "Tilberedning"-feltet – "5" for et vanlig tall, "5-7" for et
 * lagret intervall. Motstykket til parseMinutesRange() under. */
function formatMinutesRangeInput(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null) return "";
  if (max != null && max !== min) return `${min}-${max}`;
  return String(min);
}

/** Tolker teksten admin skrev i "Tilberedning"-feltet – enten ett tall ("20")
 * eller et intervall ("5-7", også med mellomrom rundt bindestreken). Ugyldig
 * tekst gir { min: null, max: null } (samme som et tomt felt). */
function parseMinutesRange(value: string): { min: number | null; max: number | null } {
  const trimmed = value.trim();
  if (trimmed === "") return { min: null, max: null };
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = Number(trimmed);
  return Number.isFinite(single) ? { min: single, max: null } : { min: null, max: null };
}

export function RecipeForm({
  recipe,
  categories,
  initialTitle,
  initialDescription,
  initialServings,
  fromMealId,
  fromSlotId,
  initialImportUrl,
}: {
  recipe?: Recipe | null;
  categories: Category[];
  /** Forhåndsutfylling fra et AI-foreslått rett-forslag i en meny – se
   * app/admin/(dashboard)/oppskrifter/ny/page.tsx sin filheader. Kun brukt
   * når det IKKE redigeres en eksisterende oppskrift (recipe er da alltid
   * null/undefined uansett siden lenken kun peker til "ny oppskrift"). */
  initialTitle?: string;
  initialDescription?: string;
  initialServings?: number;
  fromMealId?: string;
  fromSlotId?: string;
  /** Forhåndsutfylling fra et treff i "Finn oppskrifter andre steder" – se
   * app/admin/(dashboard)/oppskrifter/ny/page.tsx sin filheader. Starter
   * "Importer fra lenke" automatisk, se effekten ved importUrl-state under. */
  initialImportUrl?: string;
}) {
  const router = useRouter();
  const isEditing = Boolean(recipe);

  // Kobler denne oppskrift-lagringen til den opprinnelige menyen (kun ved
  // fromMealId – se replaceMealSlotContent-kallet i handleSubmit under).
  // Trygt å kalle uten fromMealId: useLocalStorage sin mount-effekt LESER
  // kun (skriver ingenting) når nøkkelen aldri blir aktivt satt av set().
  const { replaceContent: replaceMealSlotContent } = useMealSession(fromMealId ?? "", "");

  const [title, setTitle] = useState(recipe?.title ?? initialTitle ?? "");
  const [slug, setSlug] = useState(recipe?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [description, setDescription] = useState(recipe?.description ?? initialDescription ?? "");
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
  const [servings, setServings] = useState(recipe?.servings ?? initialServings ?? 4);
  const [prepTime, setPrepTime] = useState<string>(
    recipe?.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : "",
  );
  const [cookTime, setCookTime] = useState<string>(
    formatMinutesRangeInput(recipe?.cookTimeMinutes, recipe?.cookTimeMinutesMax),
  );
  const [totalTime, setTotalTime] = useState<string>(
    recipe?.totalTimeMinutes != null ? String(recipe.totalTimeMinutes) : "",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(recipe?.difficulty ?? "middels");
  const [groups, setGroups] = useState<FormIngredientGroup[]>(recipeToFormGroups(recipe));
  const [steps, setSteps] = useState<FormStep[]>(recipeToFormSteps(recipe));
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [tips, setTips] = useState(recipe?.tips ?? "");
  const [warnings, setWarnings] = useState(recipe?.warnings ?? "");
  const [source, setSource] = useState(recipe?.source ?? "");
  const [isPublished, setIsPublished] = useState(recipe?.isPublished ?? false);
  const [isFeatured, setIsFeatured] = useState(recipe?.isFeatured ?? false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // "Finn oppskrift" (27.08.2026, ønsket av Henrik: skriv inn en rett –
  // f.eks. «Pasta Carbonara» – og velg enten å finne EKTE oppskrifter på
  // nett (identisk mekanisme/kort som "Finn oppskrifter andre steder" på
  // "Hva kan jeg lage?", se ExternalRecipeMatchCard.tsx) eller å la AI-en
  // dikte opp en oppskrift (gjenbruker handleGenerateDraft under). KUN for
  // nye oppskrifter, samme begrensning som resten av seksjonene over.
  const [dishSearchName, setDishSearchName] = useState("");
  const [isSearchingDishRecipes, setIsSearchingDishRecipes] = useState(false);
  const [dishSearchError, setDishSearchError] = useState<string | null>(null);
  const [dishRecipeMatches, setDishRecipeMatches] = useState<ExternalRecipeMatch[] | null>(null);

  // "Importer fra lenke" – KUN for nye oppskrifter (isEditing=false). Henter
  // en ekstern oppskriftsside server-side og fyller ut resten av skjemaet
  // automatisk (se lib/actions/recipe-import.ts sin filheader for hvordan
  // deterministisk JSON-LD-parsing og AI spiller sammen). Skriver ALDRI til
  // databasen selv – fyller kun ut skjemafeltene under, akkurat som om du
  // hadde skrevet dem inn for hånd. Du må fortsatt trykke
  // "Opprett oppskrift" nederst for å faktisk lagre, og bør gå gjennom
  // feltene først (spesielt ved lav treffsikkerhet, se importWarning).
  const [importUrl, setImportUrl] = useState(initialImportUrl ?? "");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  // Se scroll-effekten ved initialImportUrl-useEffect-en under – sørger for
  // at last(nings)status/feilmelding for en AUTOMATISK import (fra "Opprett
  // som egen oppskrift") alltid er synlig med det samme, uten at admin må
  // huske å scrolle helt til toppen av et langt skjema.
  const importSectionRef = useRef<HTMLElement>(null);

  // Delt av handleImport (lenke) og handleCaptionImport (Instagram/TikTok-
  // bildetekst, se under) – begge fyller ut nøyaktig de samme skjemafeltene
  // fra et RecipeImportDraft, uansett hvilken vei draftet kom fra.
  function applyImportedDraft(draft: Awaited<ReturnType<typeof importRecipeFromUrl>>) {
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
    setSteps(draft.steps.map((s) => ({ key: makeKey(), groupTitle: s.groupTitle ?? "", text: s.text })));
    if (draft.source) setSource(draft.source);
  }

  /** `urlOverride` (27.08.2026, lagt til for "Finn oppskrift"-seksjonen – se
   * handleCreateFromDishMatch under): samme stale-closure-begrunnelse som
   * titleOverride på handleGenerateDraft over – en setImportUrl rett før i
   * SAMME handler ville ikke rukket å slå inn her ennå. */
  async function handleImport(urlOverride?: string) {
    const usedUrl = urlOverride ?? importUrl;
    setImportError(null);
    setImportWarning(null);
    setIsImporting(true);
    try {
      const draft = await importRecipeFromUrl(
        usedUrl,
        categories.map((c) => ({ id: c.id, name: c.name })),
      );
      applyImportedDraft(draft);
      if (draft.warning) setImportWarning(draft.warning);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Kunne ikke importere oppskriften. Prøv igjen.");
    } finally {
      setIsImporting(false);
    }
  }

  // Starter importen automatisk når siden lastes med initialImportUrl satt
  // (se filheaderen til denne funksjonen og initialImportUrl-proppen over) –
  // admin har allerede gjort et bevisst valg ved å trykke "Opprett som egen
  // oppskrift" på et eksternt treff, så det er ingen grunn til å kreve enda
  // et trykk her. Kjøres KUN én gang ved mount (tom avhengighetsliste er
  // bevisst – importUrl/handleImport endrer seg naturlig etter dette uten at
  // vi vil trigge en ny automatisk import).
  useEffect(() => {
    if (initialImportUrl && initialImportUrl.trim() !== "") {
      importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      void handleImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Finn oppskrifter på nett" i "Finn oppskrift"-seksjonen – se
   * dishSearchName-kommentaren over. */
  async function handleFindDishRecipes() {
    if (!dishSearchName.trim()) return;
    setDishSearchError(null);
    setIsSearchingDishRecipes(true);
    try {
      const result = await findRecipesByDishName({ dishName: dishSearchName });
      if (!result.success || !result.matches) {
        setDishSearchError(result.error ?? "Kunne ikke finne oppskrifter. Prøv igjen.");
        setDishRecipeMatches(null);
        return;
      }
      setDishRecipeMatches(result.matches);
    } catch (err) {
      setDishSearchError(err instanceof Error ? err.message : "Kunne ikke finne oppskrifter. Prøv igjen.");
      setDishRecipeMatches(null);
    } finally {
      setIsSearchingDishRecipes(false);
    }
  }

  /** "Opprett som egen oppskrift" på et treff i "Finn oppskrift"-seksjonen –
   * i MOTSETNING til samme lenke på "Hva kan jeg lage?" (som navigerer HIT,
   * se ExternalRecipeMatchCard.tsx sin filheader) er admin allerede på
   * denne siden, så den fyller "Importer fra lenke"-feltet og starter
   * importen direkte – urlOverride på handleImport unngår at den leser den
   * (ennå ikke oppdaterte) importUrl-staten. */
  function handleCreateFromDishMatch(match: ExternalRecipeMatch) {
    setImportUrl(match.url);
    void handleImport(match.url);
    importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** "Generer med AI" i "Finn oppskrift"-seksjonen – setter tittelen fra det
   * admin skrev inn der, og gjenbruker "Generer resten med AI" under helt
   * uendret (titleOverride unngår samme stale-closure-fallgruve som over). */
  function handleGenerateDishFromAi() {
    if (!dishSearchName.trim()) return;
    handleTitleChange(dishSearchName);
    void handleGenerateDraft(dishSearchName);
  }

  // "Lim inn bildetekst" – fallback for Instagram/TikTok-lenker der
  // automatisk henting over blir blokkert av plattformen (vanlig nok til at
  // dette er en reell, forventet vei inn – ikke bare en sjelden nødløsning).
  // Skjult bak en liten, tilbaketrukket "vis"-lenke (progressiv avdekking,
  // samme prinsipp som CookingTimelinePanel.tsx) siden de aller fleste
  // importer fortsatt skjer via selve lenkefeltet over.
  const [showCaptionPaste, setShowCaptionPaste] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionSourceUrl, setCaptionSourceUrl] = useState("");
  const [isImportingCaption, setIsImportingCaption] = useState(false);
  const [captionImportError, setCaptionImportError] = useState<string | null>(null);
  const [captionImportWarning, setCaptionImportWarning] = useState<string | null>(null);

  // "Last opp skjermbilde(r) av bildeteksten" – enda et hjelpemiddel inn i
  // SAMME tekstfelt over, for når admin har tatt bilde av bildeteksten i
  // stedet for å kopiere den. Skriver KUN inn i captionText (les/godkjenn-
  // før-du-stoler-på-det, samme prinsipp som resten av importflyten) –
  // trykker fortsatt "Hent oppskrift fra tekst" selv etterpå. Flere bilder
  // støttes (`multiple` på file-input) siden en lang bildetekst ofte ikke
  // får plass i ett skjermbilde – alle sendes inn SAMMEN i ett AI-kall (se
  // extractCaptionTextFromImages) slik at AI-en kan sette dem sammen selv.
  //
  // GJENBRUKT (26.08.2026, ønsket av Henrik: "kan man ta bilde av en
  // håndskrevet oppskrift?") for ETT ekstra kilde-alternativ: bilde(r) av en
  // håndskrevet oppskrift (oppskriftskort/notatbokside/lapp) – SAMME
  // tekstfelt og SAMME "Hent oppskrift fra tekst"-knapp under, men
  // `captionTextKind` husker hvilken kilde teksten kom fra sist, slik at
  // BÅDE selve bildelesingen (extractCaptionTextFromImages) OG den
  // etterfølgende AI-tolkningen (importRecipeFromCaptionText) bruker riktig
  // prompt – håndskrift leses og tolkes annerledes enn en Instagram-
  // bildetekst (se filhead-kommentarene i lib/actions/recipe-import.ts).
  const [captionTextKind, setCaptionTextKind] = useState<"caption" | "handwritten">("caption");
  const [isExtractingCaptionImages, setIsExtractingCaptionImages] = useState(false);
  const [captionImageError, setCaptionImageError] = useState<string | null>(null);

  async function handleCaptionImageUpload(files: FileList | null, kind: "caption" | "handwritten") {
    if (!files || files.length === 0) return;
    setCaptionImageError(null);
    setCaptionTextKind(kind);
    setIsExtractingCaptionImages(true);
    try {
      const images = await Promise.all(Array.from(files).map((file) => resizeImageFileToJpegBase64(file)));
      const text = await extractCaptionTextFromImages(
        images.map((img) => ({ mediaType: img.mediaType, base64Data: img.base64Data })),
        "no",
        kind,
      );
      setCaptionText(text);
    } catch (err) {
      setCaptionImageError(
        err instanceof Error
          ? err.message
          : kind === "handwritten"
            ? "Kunne ikke lese bildet/bildene. Prøv igjen."
            : "Kunne ikke lese skjermbildet/skjermbildene. Prøv igjen.",
      );
    } finally {
      setIsExtractingCaptionImages(false);
    }
  }

  async function handleCaptionImport() {
    setCaptionImportError(null);
    setCaptionImportWarning(null);
    setIsImportingCaption(true);
    try {
      const draft = await importRecipeFromCaptionText(
        captionText,
        captionSourceUrl,
        categories.map((c) => ({ id: c.id, name: c.name })),
        captionTextKind,
      );
      applyImportedDraft(draft);
      if (draft.warning) setCaptionImportWarning(draft.warning);
    } catch (err) {
      setCaptionImportError(err instanceof Error ? err.message : "Kunne ikke tolke bildeteksten. Prøv igjen.");
    } finally {
      setIsImportingCaption(false);
    }
  }

  // "Generer resten med AI" (26.08.2026 – ønsket av Henrik: "jeg vil ha
  // muligheten til å generere resten av oppskriften også, så jeg har noe mer
  // å jobbe ut ifra") – fyller ingredienser/steg/tid/vanskelighetsgrad fra
  // tittel+beskrivelse+porsjoner admin allerede har skrevet inn, se
  // filheaderen til generateRecipeDraft i lib/actions/recipes.ts. KUN for nye
  // oppskrifter (isEditing=false), samme begrensning som "Importer fra
  // lenke" over – erstatter (som den) HELE ingrediens-/steglisten uten
  // bekreftelsesdialog, siden det uansett kun er den tomme startraden som
  // står der ved en helt ny oppskrift i den vanlige brukerflyten.
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftGenerateError, setDraftGenerateError] = useState<string | null>(null);

  /** `titleOverride` (27.08.2026, lagt til for "Finn oppskrift"-seksjonen –
   * se handleFindDishRecipes under): brukes når kalleren nettopp har satt
   * `title` via setTitle i SAMME handler – React sin state er ikke
   * synkron, så et vanlig `title`-lesing rett etter setTitle ville fortsatt
   * sett den GAMLE verdien her. Faller tilbake til selve title-state når
   * ikke oppgitt (den vanlige "Generer resten med AI"-knappen lenger ned). */
  async function handleGenerateDraft(titleOverride?: string) {
    const usedTitle = titleOverride ?? title;
    setDraftGenerateError(null);
    setIsGeneratingDraft(true);
    try {
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
      const result = await generateRecipeDraft({ title: usedTitle, description, servings, categoryName });
      if (!result.success || !result.recipeDraft) {
        setDraftGenerateError(result.error ?? "Kunne ikke generere oppskriften.");
        return;
      }
      const draft = result.recipeDraft;
      setGroups(
        draft.ingredientGroups.map((g) => ({
          key: makeKey(),
          title: g.title ?? "",
          items: g.items.map((i) => ({
            key: makeKey(),
            amount: i.amount ?? "",
            unit: i.unit ?? "",
            name: i.name,
            note: i.note ?? "",
          })),
        })),
      );
      setSteps(draft.steps.map((s) => ({ key: makeKey(), groupTitle: s.groupTitle ?? "", text: s.text })));
      if (draft.prepTimeMinutes != null) setPrepTime(String(draft.prepTimeMinutes));
      if (draft.cookTimeMinutes != null) setCookTime(String(draft.cookTimeMinutes));
      setDifficulty(draft.difficulty);
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  // "Estimer tid og vanskelighetsgrad" (26.08.2026 – ønsket av Henrik: "når
  // jeg oppretter en oppskrift så vil jeg at den skal se gjennom
  // oppskriften, bruke informasjonen til å legge inn ca. tidsbruk ved
  // forberedelser, tilberedning osv, i tillegg til vanskelighetsgrad"). I
  // MOTSETNING til "Generer resten med AI" over dikter denne IKKE opp en
  // oppskrift – den leser ingrediensene/fremgangsmåten admin FAKTISK har
  // skrevet inn i skjemaet akkurat nå (uansett om den kom dit ved
  // håndskriving, import, eller "Generer resten med AI"), og fyller kun ut
  // tid+vanskelighetsgrad ut fra det. Virker like fint på en ny, ikke-lagret
  // oppskrift som på en admin redigerer – se filheaderen til
  // estimateRecipeTiming i lib/actions/recipes.ts.
  const [isEstimatingTiming, setIsEstimatingTiming] = useState(false);
  const [timingEstimateError, setTimingEstimateError] = useState<string | null>(null);

  async function handleEstimateTiming() {
    setTimingEstimateError(null);
    setIsEstimatingTiming(true);
    try {
      const ingredientGroups = groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name })),
      }));
      const stepsPayload = steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));

      const result = await estimateRecipeTiming({
        title,
        description,
        servings: Number(servings) || 1,
        ingredientGroups,
        steps: stepsPayload,
      });
      if (!result.success || !result.timingEstimate) {
        setTimingEstimateError(result.error ?? "Kunne ikke estimere tid og vanskelighetsgrad.");
        return;
      }
      const estimate = result.timingEstimate;
      if (estimate.prepTimeMinutes != null) setPrepTime(String(estimate.prepTimeMinutes));
      if (estimate.cookTimeMinutes != null) {
        setCookTime(formatMinutesRangeInput(estimate.cookTimeMinutes, estimate.cookTimeMinutesMax));
      }
      setDifficulty(estimate.difficulty);
    } finally {
      setIsEstimatingTiming(false);
    }
  }

  // "Generer tips og pass på" (27.08.2026 – ønsket av Henrik: "gjør sånn at
  // jeg kan generere tips og 'pass på' nederst på siden når jeg oppretter
  // eller redigerer oppskrifter"). Samme "les den FAKTISKE ingredienslisten
  // og fremgangsmåten, dikt ikke opp noe"-grunnlag som "Estimer tid og
  // vanskelighetsgrad" over – virker like fint på en ny, ikke-lagret
  // oppskrift som på en admin redigerer, se filheaderen til
  // generateRecipeTipsAndWarnings i lib/actions/recipes.ts. Fyller BEGGE
  // feltene fra ett kall; admin kan redigere begge fritt før lagring, akkurat
  // som når de skrives for hånd.
  const [isGeneratingTipsAndWarnings, setIsGeneratingTipsAndWarnings] = useState(false);
  const [tipsAndWarningsError, setTipsAndWarningsError] = useState<string | null>(null);

  async function handleGenerateTipsAndWarnings() {
    setTipsAndWarningsError(null);
    setIsGeneratingTipsAndWarnings(true);
    try {
      const ingredientGroups = groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name })),
      }));
      const stepsPayload = steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));

      const result = await generateRecipeTipsAndWarnings({
        title,
        description,
        ingredientGroups,
        steps: stepsPayload,
      });
      if (!result.success || !result.tipsAndWarnings) {
        setTipsAndWarningsError(result.error ?? "Kunne ikke generere tips og pass på.");
        return;
      }
      const { tips: generatedTips, warnings: generatedWarnings } = result.tipsAndWarnings;
      if (generatedTips) setTips(generatedTips);
      if (generatedWarnings) setWarnings(generatedWarnings);
      if (!generatedTips && !generatedWarnings) {
        setTipsAndWarningsError("Fant ikke noe spesifikt å foreslå for denne oppskriften.");
      }
    } finally {
      setIsGeneratingTipsAndWarnings(false);
    }
  }

  // "Generer kort beskrivelse" (27.08.2026 – ønsket av Henrik: "jeg vil også
  // kunne generere 'Kort beskrivelse' av retten etter å ha fylt ut resten").
  // Samme "les den FAKTISKE ingredienslisten og fremgangsmåten, dikt ikke
  // opp noe"-grunnlag som "Generer tips og pass på" over – se filheaderen
  // til generateRecipeDescription i lib/actions/recipes.ts. Erstatter
  // feltet direkte (admin kan redigere/forkaste resultatet fritt før
  // lagring, akkurat som når det skrives for hånd).
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionGenerateError, setDescriptionGenerateError] = useState<string | null>(null);

  async function handleGenerateDescription() {
    setDescriptionGenerateError(null);
    setIsGeneratingDescription(true);
    try {
      const ingredientGroups = groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name })),
      }));
      const stepsPayload = steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;

      const result = await generateRecipeDescription({
        title,
        ingredientGroups,
        steps: stepsPayload,
        categoryName,
      });
      if (!result.success || !result.description) {
        setDescriptionGenerateError(result.error ?? "Kunne ikke generere beskrivelse.");
        return;
      }
      setDescription(result.description);
    } finally {
      setIsGeneratingDescription(false);
    }
  }

  // "Forslag til forbedring" (27.08.2026 – ønsket av Henrik, idé som kom av
  // å importere en oppskrift via "Importer fra lenke" over, men fungerer
  // like fint på en helt håndskrevet oppskrift). Samme grunnlag som
  // "Estimer tid og vanskelighetsgrad" over (leser ingrediensene/
  // fremgangsmåten admin FAKTISK har skrevet inn akkurat nå) – men i stedet
  // for å fylle ut felter i skjemaet, vises forslagene i et eget ark
  // (Drawer) admin selv leser og bestemmer hva de vil endre for hånd. Se
  // filheaderen til RecipeImprovementSuggestion i lib/types.ts.
  const [isSuggestingImprovement, setIsSuggestingImprovement] = useState(false);
  const [improvementError, setImprovementError] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<RecipeImprovementSuggestion | null>(null);
  const [showImprovementDrawer, setShowImprovementDrawer] = useState(false);

  // "Implementer" (27.08.2026 – ønsket av Henrik: "jeg bør kunne velge hvem
  // av dem jeg vil implementere ... og ha en knapp som sier 'implementer'
  // sånn at det faktisk blir lagt til i oppskriften"). Forslagene i
  // `improvement` endres ALDRI selv (samme "kun et forslag"-prinsipp som
  // resten av appen) – i stedet holder vi to sett med nøkler på formen
  // "ing-{i}"/"method-{i}"/"tip-{i}" (samme indeks som i de tre listene i
  // `improvement`): hvilke admin har HUKET AV nå (selectedImprovementKeys),
  // og hvilke som allerede er lagt inn i skjemaet (implementedImprovementKeys
  // – samme "lagt til ✓, ikke fjern fra lista"-mønster som
  // addedMissingForIndices bruker i PantryMatchView.tsx). Ingredienstillegg
  // legges til som en ny rad i SISTE ingrediensgruppe, fremgangsmåte-forslag
  // som et nytt steg til slutt, og "Annet"-tips til "Tips"-feltet lenger ned
  // i skjemaet – alt sammen skjemafelter admin uansett kan justere/fjerne
  // for hånd, ingenting lagres før admin selv trykker hovedknappen.
  const [selectedImprovementKeys, setSelectedImprovementKeys] = useState<Set<string>>(new Set());
  const [implementedImprovementKeys, setImplementedImprovementKeys] = useState<Set<string>>(new Set());
  // Bekreftelse på at "Implementer valgte" faktisk gjorde noe (27.08.2026 –
  // rettet etter tilbakemelding fra Henrik: et steg BLE lagt til nederst i
  // en lang fremgangsmåte-liste, men siden arket lukket seg over resten av
  // skjemaet så det ut som ingenting skjedde). Lukker arket og scroller rett
  // til seksjonen som faktisk fikk nytt innhold, pluss en kort, synlig
  // bekreftelsestekst – se handleImplementSelectedImprovements.
  const [implementNotice, setImplementNotice] = useState<string | null>(null);
  const [isImplementingImprovements, setIsImplementingImprovements] = useState(false);
  const [implementError, setImplementError] = useState<string | null>(null);
  const ingredientsSectionRef = useRef<HTMLElement>(null);
  const stepsSectionRef = useRef<HTMLElement>(null);

  // "Del inn i grupper" (27.08.2026 – ønsket av Henrik: "når en oppskrift
  // inneholder salat og brød, bør alle ingrediensene til brødet ligge under
  // 'brød' i ingredienslista, og alt til salaten ligger under 'salat'").
  // Samme "kun et forslag, IKKE lagret noe sted"-prinsipp som resten av
  // skjemaets AI-knapper – erstatter `groups`-state direkte (admin ser
  // resultatet med det samme og kan justere for hånd før "Lagre"), i stedet
  // for å vises i et eget ark slik "Forslag til forbedring" gjør, siden det
  // her ikke er noe å velge/huke av – enten er den nye inndelingen bedre,
  // eller så angrer man med vanlig undo/redigering i selve feltene.
  const [isGroupingIngredients, setIsGroupingIngredients] = useState(false);
  const [groupingError, setGroupingError] = useState<string | null>(null);

  useEffect(() => {
    if (!implementNotice) return;
    const timeout = setTimeout(() => setImplementNotice(null), 6000);
    return () => clearTimeout(timeout);
  }, [implementNotice]);

  async function handleSuggestIngredientGrouping() {
    setGroupingError(null);
    const flatItems = groups.flatMap((g) => g.items);
    if (flatItems.length === 0 || flatItems.every((item) => item.name.trim() === "")) {
      setGroupingError("Legg inn minst én ingrediens før du deler dem inn i grupper.");
      return;
    }

    setIsGroupingIngredients(true);
    try {
      const result = await suggestIngredientGrouping({
        title,
        ingredients: flatItems.map((item) => ({
          amount: item.amount.trim() || null,
          unit: item.unit.trim() || null,
          name: item.name,
          note: item.note.trim() || null,
        })),
        steps: steps.map((s) => ({ groupTitle: s.groupTitle || null, text: s.text })),
      });

      if (!result.success || !result.groups) {
        setGroupingError(result.error ?? "Kunne ikke dele ingrediensene inn i grupper. Prøv igjen.");
        return;
      }

      // Slår opp de ORIGINALE, ureduserte FormIngredientItem-objektene på
      // indeks (nøkkel/mengde/enhet/navn/notat uendret) – AI-en returnerer
      // aldri selve ingrediensinnholdet, kun hvilken gruppe hver indeks
      // hører til, se filheaderen til suggestIngredientGrouping i
      // lib/actions/ai.ts.
      const newGroups: FormIngredientGroup[] = result.groups
        .map((g) => ({
          key: makeKey(),
          title: g.title,
          items: g.itemIndices
            .map((i) => flatItems[i])
            .filter((item): item is FormIngredientItem => item !== undefined),
        }))
        .filter((g) => g.items.length > 0);

      if (newGroups.length > 0) {
        setGroups(newGroups);
      } else {
        setGroupingError("Kunne ikke dele ingrediensene inn i grupper. Prøv igjen.");
      }
    } catch (err) {
      setGroupingError(err instanceof Error ? err.message : "Kunne ikke dele ingrediensene inn i grupper. Prøv igjen.");
    } finally {
      setIsGroupingIngredients(false);
    }
  }

  async function handleSuggestImprovement() {
    setImprovementError(null);
    setIsSuggestingImprovement(true);
    try {
      const ingredientGroups = groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name })),
      }));
      const stepsPayload = steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));

      const result = await suggestRecipeImprovements({ title, description, ingredientGroups, steps: stepsPayload });
      if (!result.success || !result.improvement) {
        setImprovementError(result.error ?? "Kunne ikke hente forslag til forbedring.");
        return;
      }
      setImprovement(result.improvement);
      setSelectedImprovementKeys(new Set());
      setImplementedImprovementKeys(new Set());
      setShowImprovementDrawer(true);
    } finally {
      setIsSuggestingImprovement(false);
    }
  }

  /** Selve knappen på "Fremgangsmåte"-seksjonen (27.08.2026 – rettet etter
   * ønske fra Henrik: "genererer det på nytt, det ønsker jeg ikke" – ved
   * allerede hentede forslag skal knappen kun ÅPNE arket igjen med de SAMME
   * forslagene/samme valgt/lagt-til-tilstand, ikke kalle AI-en på nytt hver
   * gang). Kun ved FØRSTE trykk (improvement er da null) kalles selve
   * AI-genereringen. En egen "Hent nye forslag"-lenke INNE i arket (se
   * under) er stedet for å bevisst hente et helt nytt sett. */
  function handleOpenOrGenerateImprovement() {
    if (improvement) {
      setShowImprovementDrawer(true);
      return;
    }
    void handleSuggestImprovement();
  }

  function toggleImprovementSelection(key: string) {
    setSelectedImprovementKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Legger de HUKEDE AV forslagene inn i skjemaet – se kommentaren ved
   * selectedImprovementKeys/implementedImprovementKeys over.
   *
   * Fremgangsmåte-forbedringer (27.08.2026, utvidet etter ønske fra Henrik:
   * "hva om den forstår hvor den skal legge seg i fremgangsmåten, og
   * muligens da også skriver om de andre punktene dersom det trengs") går
   * IKKE lenger rett i steps – de sendes til integrateStepsWithImprovements
   * (se filheaderen der), som vever dem naturlig inn (redigerer et
   * eksisterende steg der det passer, setter inn et nytt steg på riktig
   * plass ellers) og returnerer HELE den oppdaterte fremgangsmåten, som da
   * erstatter steps i sin helhet. Ingrediens-/tips-forslag er fortsatt
   * enkle, synkrone tillegg (ingen tvetydig plassering å løse der).
   */
  async function handleImplementSelectedImprovements() {
    if (!improvement || selectedImprovementKeys.size === 0) return;
    setImplementError(null);

    const newIngredientRows = improvement.ingredientAdditions
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => selectedImprovementKeys.has(`ing-${i}`));

    const newMethodTips = improvement.methodImprovements
      .map((tip, i) => ({ tip, i }))
      .filter(({ i }) => selectedImprovementKeys.has(`method-${i}`));

    const newTips = improvement.otherTips
      .map((tip, i) => ({ tip, i }))
      .filter(({ i }) => selectedImprovementKeys.has(`tip-${i}`));

    // Fremgangsmåten integreres av AI-en FØR vi rører noe annet – feiler
    // dette, avbrytes hele "Implementer valgte" (ingenting merkes som
    // implementert, admin kan trygt prøve igjen med de samme forslagene
    // fortsatt hukede av).
    if (newMethodTips.length > 0) {
      setIsImplementingImprovements(true);
      try {
        const stepsPayload = steps
          .filter((s) => s.text.trim() !== "")
          .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));
        const result = await integrateStepsWithImprovements({
          steps: stepsPayload,
          improvements: newMethodTips.map(({ tip }) => tip),
        });
        if (!result.success || !result.steps) {
          setImplementError(result.error ?? "Kunne ikke integrere forbedringene i fremgangsmåten. Prøv igjen.");
          return;
        }
        setSteps(
          result.steps.map((s) => ({ key: makeKey(), groupTitle: s.groupTitle ?? "", text: s.text })),
        );
      } finally {
        setIsImplementingImprovements(false);
      }
    }

    if (newIngredientRows.length > 0) {
      setGroups((prev) => {
        if (prev.length === 0) {
          return [
            {
              ...newIngredientGroup(),
              items: newIngredientRows.map(({ item }) => ({
                key: makeKey(),
                amount: "",
                unit: "",
                name: item.name,
                note: item.reason,
              })),
            },
          ];
        }
        const lastIndex = prev.length - 1;
        return prev.map((g, i) =>
          i === lastIndex
            ? {
                ...g,
                items: [
                  ...g.items,
                  ...newIngredientRows.map(({ item }) => ({
                    key: makeKey(),
                    amount: "",
                    unit: "",
                    name: item.name,
                    note: item.reason,
                  })),
                ],
              }
            : g,
        );
      });
    }

    if (newTips.length > 0) {
      setTips((prev) => (prev.trim() ? `${prev.trim()}\n${newTips.map((t) => t.tip).join("\n")}` : newTips.map((t) => t.tip).join("\n")));
    }

    const implementedCount = newIngredientRows.length + newMethodTips.length + newTips.length;

    setImplementedImprovementKeys((prev) => new Set([...prev, ...selectedImprovementKeys]));
    setSelectedImprovementKeys(new Set());

    // Lukk arket og scroll rett til den FØRSTE seksjonen som fikk nytt
    // innhold (ingredienser → fremgangsmåte → tips, samme rekkefølge som i
    // selve skjemaet) – se kommentaren ved implementNotice-state over. Kort
    // forsinkelse (Drawer lukkes momentant, ingen CSS-transisjon å vente på
    // – se Drawer.tsx – men DOM-en må rekke å oppdatere seg først).
    setShowImprovementDrawer(false);
    setImplementNotice(
      implementedCount === 1 ? "1 forslag lagt til i oppskriften." : `${implementedCount} forslag lagt til i oppskriften.`,
    );
    setTimeout(() => {
      if (newIngredientRows.length > 0) {
        ingredientsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (newMethodTips.length > 0) {
        stepsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (newTips.length > 0) {
        document.getElementById("tips")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
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
  const [isClearingTaste, setIsClearingTaste] = useState(false);
  const [tasteClearError, setTasteClearError] = useState<string | null>(null);

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

  /** Fjerner en lagret smaksprofil helt – for de som genererte den og
   * ombestemte seg (ønsket av Henrik 26.08.2026, samme "fjern det man ikke
   * vil ha likevel"-mønster som vegetarversjonen allerede har). */
  async function handleClearTasteProfile() {
    if (!recipe) return;
    setTasteClearError(null);
    setIsClearingTaste(true);
    try {
      const result = await clearTasteProfile(recipe.id);
      if (!result.success) {
        setTasteClearError(result.error ?? "Kunne ikke fjerne smaksprofilen.");
        return;
      }
      setTasteProfile(null);
    } finally {
      setIsClearingTaste(false);
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
  const [isClearingNutrition, setIsClearingNutrition] = useState(false);
  const [nutritionClearError, setNutritionClearError] = useState<string | null>(null);

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

  /** Se kommentaren på handleClearTasteProfile over. */
  async function handleClearNutrition() {
    if (!recipe) return;
    setNutritionClearError(null);
    setIsClearingNutrition(true);
    try {
      const result = await clearNutritionInfo(recipe.id);
      if (!result.success) {
        setNutritionClearError(result.error ?? "Kunne ikke fjerne næringsinnholdet.");
        return;
      }
      setNutritionInfo(null);
    } finally {
      setIsClearingNutrition(false);
    }
  }

  // Vegetarversjon (25.08.2026 – flyttet fra live generering på
  // oppskriftssiden til her, se filheaderen til VegetarianVariant i
  // lib/types.ts). To veier inn: "Generer med AI" (fyller feltene under fra
  // et AI-forslag) eller ren håndredigering fra bunnen av (feltene starter
  // tomme/med én tom rad, akkurat som hoved-ingrediensene/-stegene).
  //
  // VIKTIG (rettet 25.08.2026 – se kommentaren i handleSubmit under):
  // vegetarversjonen har IKKE lenger sin egen "Lagre"-knapp. Den lagres nå
  // sammen med resten av oppskriften når admin trykker hoved-knappen
  // "Lagre endringer" nederst på siden – akkurat som ingrediensene/stegene
  // over. Henrik trykket naturlig nok hovedknappen og forventet at ALT ble
  // lagret samtidig; en egen liten lagre-knapp midt i skjemaet var lett å
  // overse/misforstå. "Fjern vegetarversjon" er unntaket – den er
  // destruktiv og virker derfor fortsatt umiddelbart, uten å vente på
  // hovedlagringen.
  const [vegNote, setVegNote] = useState(recipe?.vegetarianVariant?.note ?? "");
  const [vegGroups, setVegGroups] = useState<FormIngredientGroup[]>(
    vegetarianToFormGroups(recipe?.vegetarianVariant),
  );
  const [vegSteps, setVegSteps] = useState<FormStep[]>(vegetarianToFormSteps(recipe?.vegetarianVariant));
  const [hasSavedVegVariant, setHasSavedVegVariant] = useState(Boolean(recipe?.vegetarianVariant));
  const [isGeneratingVeg, setIsGeneratingVeg] = useState(false);
  const [vegGenerateError, setVegGenerateError] = useState<string | null>(null);
  const [isClearingVeg, setIsClearingVeg] = useState(false);
  const [vegClearError, setVegClearError] = useState<string | null>(null);

  async function handleGenerateVegetarian() {
    setVegGenerateError(null);
    setIsGeneratingVeg(true);
    try {
      const ingredientGroups = groups.map((g) => ({
        title: g.title || null,
        items: g.items
          .filter((i) => i.name.trim() !== "")
          .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name, note: i.note || null })),
      }));
      const stepsInput = steps
        .filter((s) => s.text.trim() !== "")
        .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));

      const result = await generateVegetarianVariant({ title, ingredientGroups, steps: stepsInput });
      if (!result.success || !result.vegetarianVariant) {
        setVegGenerateError(result.error ?? "Kunne ikke generere en vegetarversjon.");
        return;
      }
      setVegNote(result.vegetarianVariant.note);
      setVegGroups(vegetarianToFormGroups(result.vegetarianVariant));
      setVegSteps(vegetarianToFormSteps(result.vegetarianVariant));
    } finally {
      setIsGeneratingVeg(false);
    }
  }

  /** Bygger VegetarianVariant-payloaden fra vegGroups/vegSteps/vegNote (samme
   * tomme-rad-filtrering som hovedskjemaets ingrediens-/steg-payload lenger
   * ned i handleSubmit) – brukt BÅDE derfra (lagres sammen med resten av
   * oppskriften) og til å avgjøre om "Fjern"-lenken skal vises. Returnerer
   * null dersom det ikke finnes noe reelt innhold å lagre. */
  function buildVegetarianVariantPayload(): VegetarianVariant | null {
    const ingredientGroups = vegGroups.map((g) => ({
      title: g.title || null,
      items: g.items
        .filter((i) => i.name.trim() !== "")
        .map((i) => ({ amount: i.amount || null, unit: i.unit || null, name: i.name, note: i.note || null })),
    }));
    const variantSteps = vegSteps
      .filter((s) => s.text.trim() !== "")
      .map((s) => ({ groupTitle: s.groupTitle || null, text: s.text }));

    if (ingredientGroups.every((g) => g.items.length === 0) || variantSteps.length === 0) {
      return null;
    }
    return { note: vegNote, ingredientGroups, steps: variantSteps };
  }

  async function handleClearVegetarian() {
    if (!recipe) return;
    setVegClearError(null);
    setIsClearingVeg(true);
    try {
      const result = await clearVegetarianVariant(recipe.id);
      if (!result.success) {
        setVegClearError(result.error ?? "Kunne ikke fjerne vegetarversjonen.");
        return;
      }
      setVegNote("");
      setVegGroups([newIngredientGroup()]);
      setVegSteps([newStep()]);
      setHasSavedVegVariant(false);
    } finally {
      setIsClearingVeg(false);
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  // Skjemaet er langt og har mange enkeltstående tekstfelt (bl.a. i
  // ingrediens-/steg-editorene) – uten denne fanger nettleseren opp
  // Enter-tasten i et hvilket som helst <input> og sender inn HELE skjemaet
  // (lagrer/oppretter oppskriften og hopper til oversikten), selv om
  // brukeren egentlig bare ville bekrefte ett enkelt felt. Generell
  // forsiktighetsregel for et så langt skjema – <textarea> er bevisst
  // unntatt, siden Enter der skal sette inn ny linje som normalt. (Den
  // faktiske vegetarversjon-bugen 25.08.2026 skyldtes noe annet – se
  // kommentaren ved vegNote/vegGroups-state og i handleSubmit under.)
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cookTimeRange = parseMinutesRange(cookTime);

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
      cookTimeMinutes: cookTimeRange.min,
      cookTimeMinutesMax: cookTimeRange.max,
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
      warnings: warnings || null,
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

      // Lagrer vegetarversjonen sammen med resten av oppskriften i SAMME
      // trykk på "Lagre endringer" (rettet 25.08.2026 – se lange
      // kommentaren over vegNote/vegGroups-state lenger opp i filen for
      // hvorfor). result.id finnes alltid her (både create/updateRecipe
      // returnerer den nå), men faller tilbake til recipe?.id for
      // sikkerhets skyld ved redigering av en eksisterende oppskrift.
      const recipeId = result.id ?? recipe?.id;
      if (recipeId) {
        const vegVariant = buildVegetarianVariantPayload();
        if (vegVariant) {
          const vegResult = await saveVegetarianVariant(recipeId, vegVariant);
          if (!vegResult.success) {
            setError(
              `Oppskriften ble lagret, men vegetarversjonen kunne ikke lagres: ${vegResult.error ?? "ukjent feil"}`,
            );
            return;
          }
        } else if (hasSavedVegVariant) {
          // Feltene er tømt av admin siden sist – fjern den lagrede
          // varianten også, i stedet for å la den gamle bli liggende igjen.
          await clearVegetarianVariant(recipeId);
        }
      }

      // Kom hit fra "Opprett som oppskrift" på et AI-forslag i en meny (se
      // MealView.tsx) – bytt akkurat DEN plassen i menyen fra "AI-forslag"
      // til den nå ekte, lagrede oppskriften, og gå tilbake dit i stedet for
      // til admin-oversikten. Kun relevant ved FØRSTE lagring av en helt ny
      // oppskrift (isEditing er alltid false her uansett, siden lenken kun
      // peker til "ny oppskrift"-siden, men sjekkes eksplisitt for sikkerhets
      // skyld). servings sendes bevisst IKKE med – slotten beholder porsjonen
      // den allerede hadde i menyen.
      if (!isEditing && fromMealId && fromSlotId && recipeId && result.slug) {
        replaceMealSlotContent(fromSlotId, {
          source: "existing",
          recipe: { id: recipeId, slug: result.slug, title },
        });
        router.push(`/meny/${fromMealId}`);
        router.refresh();
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  return (
    // Bunnmargen her reserverer plass til BÅDE den faste knapperaden nederst
    // OG (på mobil) BottomNav under den – uten dette ville de to fast
    // posisjonerte lagene dekket over de siste feltene i skjemaet. Bruker
    // samme --bottom-nav-h CSS-variabel (satt av ChromeHeightVars.tsx) som
    // selve knapperaden lenger ned bruker til å plassere seg riktig – se
    // kommentaren der for hele resonnementet.
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      className="space-y-8"
      style={{ paddingBottom: "calc(var(--bottom-nav-h, 0px) + 6rem)" }}
    >
      {/* Flytende bekreftelse (27.08.2026) – se implementNotice-kommentaren
       * ved state-deklarasjonen. Fast plassert øverst (IKKE inni selve
       * knappe-seksjonen) siden siden samtidig scroller bort fra knappen,
       * ned til det som faktisk ble lagt til – uten dette ville
       * bekreftelsen scrollet ut av syne før admin rekker å lese den. */}
      {implementNotice && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
          <p className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-cream shadow-card-hover">
            {implementNotice}
          </p>
        </div>
      )}

      {!isEditing && (
        <section className="space-y-3 rounded-card border border-line bg-paper p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-xl text-ink">Finn oppskrift</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Skriv inn navnet på en rett – f.eks. «Pasta Carbonara» – og velg om du vil finne ekte
              oppskrifter for den på nett, eller la AI-en dikte opp en fra bunnen av.
            </p>
          </div>
          <input
            type="text"
            placeholder="F.eks. Pasta Carbonara"
            value={dishSearchName}
            onChange={(e) => setDishSearchName(e.target.value)}
            disabled={isSearchingDishRecipes || isGeneratingDraft}
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleFindDishRecipes()}
              disabled={isSearchingDishRecipes || isGeneratingDraft || !dishSearchName.trim()}
            >
              {isSearchingDishRecipes ? "Søker …" : "Finn oppskrifter på nett"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateDishFromAi}
              disabled={isSearchingDishRecipes || isGeneratingDraft || !dishSearchName.trim()}
            >
              {isGeneratingDraft ? "Genererer …" : "Generer med AI"}
            </Button>
          </div>
          {dishSearchError && <p className="text-sm text-clay-dark">{dishSearchError}</p>}
          {dishRecipeMatches && dishRecipeMatches.length > 0 && (
            <div className="space-y-3 pt-1">
              {dishRecipeMatches.map((match, i) => (
                <ExternalRecipeMatchCard
                  key={i}
                  match={match}
                  onCreateAsRecipe={() => handleCreateFromDishMatch(match)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!isEditing && (
        <section ref={importSectionRef} className="space-y-3 rounded-card border border-line bg-paper p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-xl text-ink">Importer fra lenke</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Lim inn en lenke til en oppskrift på en annen nettside, eller til et Instagram- eller
              TikTok-innlegg der oppskriften står i selve bildeteksten – resten av skjemaet under fylles ut
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
            <Button type="button" variant="outline" onClick={() => void handleImport()} disabled={isImporting || !importUrl.trim()}>
              {isImporting ? "Henter …" : "Hent oppskrift"}
            </Button>
          </div>
          {/* Ekstra tydelig lastestatus (27.08.2026) – spesielt viktig når
           * importen starter AUTOMATISK (fra "Opprett som egen oppskrift" på
           * et eksternt treff, se initialImportUrl/useEffect-en over): admin
           * har da ikke selv trykket noen knapp og kan lett tro ingenting
           * skjer/gikk galt, siden resten av det (fortsatt tomme) skjemaet
           * er det første som er synlig. */}
          {isImporting && (
            <p className="flex items-center gap-2 text-sm text-clay-dark">
              <span
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-clay border-t-transparent"
                aria-hidden="true"
              />
              Henter og tolker oppskriften …
            </p>
          )}
          {importError && (
            <p role="alert" className="rounded-xl bg-clay-light px-4 py-3 text-sm text-clay-dark">
              {importError}
            </p>
          )}
          {importWarning && <p className="text-xs text-clay-dark">{importWarning}</p>}

          {/* Fallback for Instagram/TikTok når automatisk henting over blir
           * blokkert (vanlig nok – begge plattformene krever ofte innlogging
           * for å vise innlegget) – admin kopierer bildeteksten selv fra
           * appen og limer den inn her i stedet. Samme tekstfelt/knapp
           * dekker OGSÅ (26.08.2026) bilde(r) av en håndskrevet oppskrift,
           * se captionTextKind-kommentaren ved handleCaptionImageUpload
           * over. Samme AI-tolkning (tilpasset kilden) brukes uansett
           * hvilken vei draftet kom fra, se applyImportedDraft over. */}
          {!showCaptionPaste ? (
            <button
              type="button"
              onClick={() => setShowCaptionPaste(true)}
              className="text-xs font-medium text-clay hover:text-clay-dark"
            >
              Fikk du ikke hentet fra Instagram/TikTok, eller har du et bilde av en håndskrevet oppskrift? →
            </button>
          ) : (
            <div className="space-y-2 border-t border-line pt-3">
              <p className="text-xs text-ink-faint">
                Kopier bildeteksten fra innlegget (i appen eller på nett) og lim den inn under, eller last opp
                ett eller flere skjermbilder av bildeteksten så leses den inn automatisk. Lenken til selve
                innlegget er valgfri, kun til referanse.
              </p>
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-clay hover:text-clay-dark">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    void handleCaptionImageUpload(e.target.files, "caption");
                    e.target.value = "";
                  }}
                  disabled={isExtractingCaptionImages || isImportingCaption}
                  className="hidden"
                />
                <span className="underline">
                  {isExtractingCaptionImages && captionTextKind === "caption"
                    ? "Leser skjermbilde(r) …"
                    : "Last opp skjermbilde(r) av bildeteksten →"}
                </span>
              </label>

              <p className="text-xs text-ink-faint">
                Eller: har du en håndskrevet oppskrift (f.eks. et oppskriftskort eller en side i en notatbok)?
                Last opp bilde(r) av den, så leses teksten inn automatisk under – gå ekstra nøye gjennom
                resultatet etterpå, spesielt mengder, siden håndskrift av og til blir feiltolket.
              </p>
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-clay hover:text-clay-dark">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    void handleCaptionImageUpload(e.target.files, "handwritten");
                    e.target.value = "";
                  }}
                  disabled={isExtractingCaptionImages || isImportingCaption}
                  className="hidden"
                />
                <span className="underline">
                  {isExtractingCaptionImages && captionTextKind === "handwritten"
                    ? "Leser bilde(r) …"
                    : "Last opp bilde(r) av en håndskrevet oppskrift →"}
                </span>
              </label>
              {captionImageError && <p className="text-sm text-clay-dark">{captionImageError}</p>}
              <textarea
                placeholder="Lim inn bildeteksten (eller den transkriberte håndskriften) her …"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                disabled={isImportingCaption}
                rows={5}
                className={inputClass}
              />
              <input
                type="url"
                inputMode="url"
                placeholder="Lenke til innlegget (valgfritt) – https://…"
                value={captionSourceUrl}
                onChange={(e) => setCaptionSourceUrl(e.target.value)}
                disabled={isImportingCaption}
                className={inputClass}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCaptionImport}
                disabled={isImportingCaption || !captionText.trim()}
              >
                {isImportingCaption ? "Tolker …" : "Hent oppskrift fra tekst"}
              </Button>
              {captionImportError && <p className="text-sm text-clay-dark">{captionImportError}</p>}
              {captionImportWarning && <p className="text-xs text-clay-dark">{captionImportWarning}</p>}
            </div>
          )}
        </section>
      )}

      {!isEditing && (
        <section className="space-y-3 rounded-card border border-line bg-paper p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-xl text-ink">Generer resten med AI</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Skriv inn tittel og eventuelt kort beskrivelse og antall porsjoner under, trykk så her – AI-en
              dikter opp ingredienser, fremgangsmåte, tid og vanskelighetsgrad du kan jobbe videre ut ifra.
              Erstatter det som eventuelt allerede står i ingrediens-/fremgangsmåtefeltene lenger ned. Gå
              grundig gjennom (og juster) før du oppretter oppskriften.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleGenerateDraft()}
            disabled={isGeneratingDraft || !title.trim()}
          >
            {isGeneratingDraft ? "Genererer …" : "Generer resten med AI"}
          </Button>
          {draftGenerateError && <p className="text-sm text-clay-dark">{draftGenerateError}</p>}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">
            Fyll ut ingredienser og fremgangsmåte under, trykk så her – AI-en leser det du faktisk har skrevet og
            foreslår en kort beskrivelse ut fra akkurat denne retten.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateDescription}
            disabled={
              isGeneratingDescription ||
              !title.trim() ||
              groups.every((g) => g.items.every((i) => i.name.trim() === "")) ||
              steps.every((s) => s.text.trim() === "")
            }
          >
            {isGeneratingDescription ? "Genererer …" : "Generer kort beskrivelse"}
          </Button>
        </div>
        {descriptionGenerateError && <p className="text-sm text-clay-dark">{descriptionGenerateError}</p>}

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
            {tasteClearError && <p className="text-sm text-clay-dark">{tasteClearError}</p>}
            {tasteProfile ? (
              <>
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
                <button
                  type="button"
                  onClick={handleClearTasteProfile}
                  disabled={isClearingTaste}
                  className="text-sm text-ink-faint underline underline-offset-2 hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingTaste ? "Fjerner …" : "Fjern smaksprofil"}
                </button>
              </>
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
            {nutritionClearError && <p className="text-sm text-clay-dark">{nutritionClearError}</p>}
            {nutritionInfo ? (
              <>
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
                <button
                  type="button"
                  onClick={handleClearNutrition}
                  disabled={isClearingNutrition}
                  className="text-sm text-ink-faint underline underline-offset-2 hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingNutrition ? "Fjerner …" : "Fjern næringsinnhold"}
                </button>
              </>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">Vegetarversjon</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Vises bak en "Ønsker du en vegetarversjon?"-knapp på oppskriftssiden – KUN dersom en variant er
              lagret her. Generer med AI og/eller skriv/rediger for hånd – lagres sammen med resten av
              oppskriften når du trykker "Lagre endringer" nederst på siden.
            </p>
          </div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateVegetarian}
              disabled={isGeneratingVeg}
            >
              {isGeneratingVeg ? "Genererer …" : hasSavedVegVariant ? "Generer på nytt" : "Generer med AI"}
            </Button>
          )}
        </div>

        {isEditing ? (
          <>
            {vegGenerateError && <p className="text-sm text-clay-dark">{vegGenerateError}</p>}
            <Field label="Notat (kort forklaring til gjesten)" htmlFor="veg-note">
              <textarea
                id="veg-note"
                value={vegNote}
                onChange={(e) => setVegNote(e.target.value)}
                rows={2}
                className={inputClass}
                placeholder="F.eks. hva som er byttet ut og hvorfor det fungerer godt"
              />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Ingredienser (vegetarversjon)</p>
              <IngredientGroupsEditor groups={vegGroups} onChange={setVegGroups} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Fremgangsmåte (vegetarversjon)</p>
              <StepsEditor steps={vegSteps} onChange={setVegSteps} />
            </div>
            {vegClearError && <p className="text-sm text-clay-dark">{vegClearError}</p>}
            {hasSavedVegVariant && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleClearVegetarian}
                  disabled={isClearingVeg}
                  className="text-sm text-ink-faint underline underline-offset-2 hover:text-clay-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingVeg ? "Fjerner …" : "Fjern vegetarversjon"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs italic text-ink-faint">
            Opprett og lagre oppskriften først – deretter kan du legge til en vegetarversjon her.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">Tid og porsjoner</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Fyll ut ingredienser og fremgangsmåte under, trykk så her – AI-en leser det du faktisk har
              skrevet og foreslår forberedelses-/tilberedningstid og vanskelighetsgrad ut fra det. Nyttig for
              oppskrifter skrevet for hånd eller limt inn uten tid/vanskelighetsgrad.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEstimateTiming}
            disabled={
              isEstimatingTiming ||
              !title.trim() ||
              groups.every((g) => g.items.every((i) => i.name.trim() === "")) ||
              steps.every((s) => s.text.trim() === "")
            }
          >
            {isEstimatingTiming ? "Estimerer …" : "Estimer tid og vanskelighetsgrad"}
          </Button>
        </div>
        {timingEstimateError && <p className="text-sm text-clay-dark">{timingEstimateError}</p>}
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
          <Field label="Tilberedning (min)" htmlFor="cook" hint="Tall, eller et intervall som 5-7">
            <input
              id="cook"
              type="text"
              inputMode="numeric"
              placeholder="f.eks. 20 eller 5-7"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value.replace(/[^0-9\-\s]/g, ""))}
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

      <section ref={ingredientsSectionRef} className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">Ingredienser</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleSuggestIngredientGrouping()}
            disabled={isGroupingIngredients || !title.trim() || groups.every((g) => g.items.every((i) => i.name.trim() === ""))}
          >
            {isGroupingIngredients ? "Deler inn …" : "Del inn i grupper"}
          </Button>
        </div>
        {groupingError && <p className="mb-3 text-sm text-clay-dark">{groupingError}</p>}
        <IngredientGroupsEditor groups={groups} onChange={setGroups} />
      </section>

      <section ref={stepsSectionRef} className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-ink">Fremgangsmåte</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenOrGenerateImprovement}
            disabled={
              isSuggestingImprovement ||
              !title.trim() ||
              groups.every((g) => g.items.every((i) => i.name.trim() === "")) ||
              steps.every((s) => s.text.trim() === "")
            }
          >
            {isSuggestingImprovement
              ? "Vurderer …"
              : improvement
                ? "Vis forslag til forbedring"
                : "Forslag til forbedring"}
          </Button>
        </div>
        {improvementError && <p className="mb-3 text-sm text-clay-dark">{improvementError}</p>}
        <StepsEditor steps={steps} onChange={setSteps} />
      </section>

      <Drawer
        open={showImprovementDrawer}
        onClose={() => setShowImprovementDrawer(false)}
        title="Forslag til forbedring"
      >
        {improvement && (
          <div className="space-y-5 text-sm">
            {improvement.ingredientAdditions.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-clay-dark">
                  Ingredienser å vurdere
                </h4>
                <div className="space-y-2">
                  {improvement.ingredientAdditions.map((item, i) => (
                    <ImprovementRow
                      key={i}
                      itemKey={`ing-${i}`}
                      selected={selectedImprovementKeys.has(`ing-${i}`)}
                      implemented={implementedImprovementKeys.has(`ing-${i}`)}
                      onToggle={toggleImprovementSelection}
                    >
                      <span className="font-medium text-ink">{item.name}</span> – {item.reason}
                    </ImprovementRow>
                  ))}
                </div>
              </div>
            )}
            {improvement.methodImprovements.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-clay-dark">Fremgangsmåte</h4>
                <div className="space-y-2">
                  {improvement.methodImprovements.map((tip, i) => (
                    <ImprovementRow
                      key={i}
                      itemKey={`method-${i}`}
                      selected={selectedImprovementKeys.has(`method-${i}`)}
                      implemented={implementedImprovementKeys.has(`method-${i}`)}
                      onToggle={toggleImprovementSelection}
                    >
                      {tip}
                    </ImprovementRow>
                  ))}
                </div>
              </div>
            )}
            {improvement.otherTips.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-clay-dark">Annet</h4>
                <div className="space-y-2">
                  {improvement.otherTips.map((tip, i) => (
                    <ImprovementRow
                      key={i}
                      itemKey={`tip-${i}`}
                      selected={selectedImprovementKeys.has(`tip-${i}`)}
                      implemented={implementedImprovementKeys.has(`tip-${i}`)}
                      onToggle={toggleImprovementSelection}
                    >
                      {tip}
                    </ImprovementRow>
                  ))}
                </div>
              </div>
            )}
            {improvement.ingredientAdditions.length === 0 &&
              improvement.methodImprovements.length === 0 &&
              improvement.otherTips.length === 0 && (
                <p className="text-ink-faint">
                  Fant ingen konkrete forbedringsforslag – oppskriften ser bra ut som den er.
                </p>
              )}
            {(improvement.ingredientAdditions.length > 0 ||
              improvement.methodImprovements.length > 0 ||
              improvement.otherTips.length > 0) && (
              <div className="border-t border-line pt-4">
                <Button
                  type="button"
                  onClick={() => void handleImplementSelectedImprovements()}
                  disabled={selectedImprovementKeys.size === 0 || isImplementingImprovements}
                >
                  {isImplementingImprovements
                    ? "Integrerer …"
                    : selectedImprovementKeys.size > 0
                      ? `Implementer valgte (${selectedImprovementKeys.size})`
                      : "Implementer valgte"}
                </Button>
                <p className="mt-2 text-xs text-ink-faint">
                  Huk av forslagene du vil bruke over, trykk her – ingredienser/tips legges rett til, mens
                  fremgangsmåte-forbedringer veves inn i riktig steg (eller settes inn på riktig plass) av
                  AI-en. Gå gjennom og juster før du lagrer.
                </p>
                {implementError && <p className="mt-2 text-sm text-clay-dark">{implementError}</p>}
              </div>
            )}
            {/* Bevisst SKILT fra hovedknappen på "Fremgangsmåte"-seksjonen
             * (som nå kun ÅPNER dette arket på nytt, se
             * handleOpenOrGenerateImprovement) – dette er stedet for å
             * uttrykkelig be om et helt NYTT sett med forslag, f.eks. etter
             * at du har endret oppskriften videre. Nullstiller valg/lagt
             * til-merker siden det uansett blir en ny liste. */}
            <div className="border-t border-line pt-4">
              <button
                type="button"
                onClick={() => void handleSuggestImprovement()}
                disabled={isSuggestingImprovement}
                className="text-xs font-medium text-clay hover:text-clay-dark disabled:cursor-not-allowed disabled:text-ink-faint"
              >
                {isSuggestingImprovement ? "Henter nye forslag …" : "Hent nye forslag →"}
              </button>
              {improvementError && <p className="mt-2 text-sm text-clay-dark">{improvementError}</p>}
            </div>
          </div>
        )}
      </Drawer>

      <section className="space-y-4 rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-serif text-xl text-ink">Notater og kilde</h2>
        <Field label="Notater" htmlFor="notes">
          <textarea id="notes" value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">
            Fyll ut ingredienser og fremgangsmåte over, trykk så her – AI-en leser det du faktisk har skrevet og
            foreslår tips og en «pass på»-notis ut fra akkurat denne retten.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateTipsAndWarnings}
            disabled={
              isGeneratingTipsAndWarnings ||
              !title.trim() ||
              groups.every((g) => g.items.every((i) => i.name.trim() === "")) ||
              steps.every((s) => s.text.trim() === "")
            }
          >
            {isGeneratingTipsAndWarnings ? "Genererer …" : "Generer tips og pass på"}
          </Button>
        </div>
        {tipsAndWarningsError && <p className="text-sm text-clay-dark">{tipsAndWarningsError}</p>}

        <Field label="Tips" htmlFor="tips">
          <textarea id="tips" value={tips ?? ""} onChange={(e) => setTips(e.target.value)} rows={2} className={inputClass} />
        </Field>
        <Field label="Pass på" htmlFor="warnings">
          <textarea
            id="warnings"
            value={warnings ?? ""}
            onChange={(e) => setWarnings(e.target.value)}
            rows={2}
            className={inputClass}
          />
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

      {/* FAST (position: fixed) bunnlinje, ikke sticky. (26.08.2026 – rettet
       * etter bruker-tilbakemelding: "sticky" holder elementet på plass KUN
       * etter at man har scrollet forbi dens naturlige plassering i
       * dokument-flyten – siden dette var det siste elementet i et langt
       * skjema, betydde det i praksis at knappen var usynlig helt til man
       * hadde scrollet helt ned, stikk i strid med hensikten.) "fixed" er
       * derimot forankret til selve nettleservinduet, uavhengig av
       * scrollposisjon i skjemaet – synlig med det samme, hele tiden.
       * `pb-28` på selve <form>-en over sørger for at denne linja aldri
       * dekker over de siste feltene.
       *
       * VIKTIG – `bottom: var(--bottom-nav-h)`, IKKE `bottom-0` (26.08.2026,
       * rettet igjen etter ny tilbakemelding: med `bottom-0` la denne linja
       * seg i NØYAKTIG samme posisjon som den faste mobile bunnmenyen
       * (BottomNav.tsx, også `fixed bottom-0`, synlig på ALLE sider inkl.
       * /admin) – siden BottomNav ligger senere i DOM-treet (rendres i
       * app/layout.tsx, utenfor selve adminsiden) vant DEN kappløpet om
       * samme piksler og skjulte knapperaden helt bak seg, i stedet for at
       * de to kolliderte synlig.) `--bottom-nav-h` er en CSS-variabel som
       * ChromeHeightVars.tsx (samme fil forsiden allerede bruker til å
       * regne ut hero-høyden) måler til BottomNav sin FAKTISKE høyde – 0 på
       * skjermer der den er skjult (`md:hidden`, altså desktop), ellers
       * navets ekte pikselhøyde. Denne knapperaden havner dermed alltid
       * rett OVENFOR bunnmenyen på mobil, og helt nederst på desktop (der
       * det ikke finnes noen bunnmeny å unngå). BottomNav sin egen
       * `pb-[env(safe-area-inset-bottom)]` er allerede talt med i den målte
       * høyden, så "home indicator"-området er dekket av navet under. */}
      <div
        className="fixed inset-x-0 z-40 border-t border-line bg-paper/95 shadow-card-hover backdrop-blur"
        style={{ bottom: "var(--bottom-nav-h, 0px)" }}
      >
        <div className="mx-auto flex max-w-3xl justify-end gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin")}>
            Avbryt
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Lagrer …" : isEditing ? "Lagre endringer" : "Opprett oppskrift"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// text-base (16px) på mobil, ikke text-sm (14px) – iOS Safari zoomer
// automatisk inn siden ved fokus på et input/textarea/select med skrift
// under 16px, og zoomer ikke ut igjen av seg selv (samme fiks/kommentar som
// components/home/WinePairing.tsx, som var det første stedet dette ble
// oppdaget). Krymper til text-sm igjen fra sm:-breakpointet, der iOS-zoom
// ikke er et problem (ikke et touch-skjerm-scenario der).
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

/** Én rad i "Forslag til forbedring"-arket – se kommentaren ved
 * selectedImprovementKeys/implementedImprovementKeys i RecipeForm over.
 * Vises som en avkrysningsboks admin kan huke av/på inntil forslaget er
 * implementert, deretter som et fast "✓ Lagt til"-merke (avkrysningsboksen
 * fjernes helt – forslaget ligger fortsatt synlig i lista, men kan ikke
 * hukes av på nytt). */
function ImprovementRow({
  itemKey,
  selected,
  implemented,
  onToggle,
  children,
}: {
  itemKey: string;
  selected: boolean;
  implemented: boolean;
  onToggle: (key: string) => void;
  children: ReactNode;
}) {
  if (implemented) {
    return (
      <p className="flex items-start gap-2 text-ink-soft">
        <span className="mt-0.5 shrink-0 text-xs font-medium text-clay-dark">✓ Lagt til</span>
        <span>{children}</span>
      </p>
    );
  }
  return (
    <label className="flex cursor-pointer items-start gap-2 text-ink-soft">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(itemKey)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-clay"
      />
      <span>{children}</span>
    </label>
  );
}
