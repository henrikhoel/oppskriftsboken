import type { Metadata } from "next";
import { getAllCategories } from "@/lib/data/categories";
import { RecipeForm } from "@/components/admin/RecipeForm";

export const metadata: Metadata = { title: "Ny oppskrift" };

/**
 * Kan forhåndsutfylles fra et AI-foreslått rett-forslag i en meny (se
 * "Opprett som oppskrift"-lenken på foreslåtte retter i MealView.tsx) via
 * query-parametre – title/description/servings fyller kun inn de samme
 * feltene admin uansett ville skrevet inn selv, INGEN AI-kall skjer her.
 * fromMealId/fromSlotId sendes videre til RecipeForm.tsx, som (kun ved
 * FØRSTE lagring av en helt ny oppskrift, se der) bytter akkurat DEN plassen
 * i menyen fra "AI-forslag" til en ordentlig, eksisterende oppskrift –
 * lenken virker helt normalt (går rett hit, tomt skjema) også uten noen av
 * disse parametrene.
 *
 * importUrl (27.08.2026) – forhåndsutfyller "Importer fra lenke" i
 * RecipeForm.tsx fra et treff i "Finn oppskrifter andre steder" (se
 * "Opprett som egen oppskrift"-lenken på eksterne treff i
 * PantryMatchView.tsx). RecipeForm starter den EKTE importen (samme
 * importRecipeFromUrl-kall som om admin selv hadde limt inn lenken og
 * trykket "Hent oppskrift") automatisk når siden lastes med denne
 * parameteren satt – admin må uansett gå gjennom og lagre selv etterpå.
 */
export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    description?: string;
    servings?: string;
    fromMealId?: string;
    fromSlotId?: string;
    importUrl?: string;
  }>;
}) {
  const categories = await getAllCategories();
  const params = await searchParams;
  const initialServings = params.servings ? Number(params.servings) : undefined;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Ny oppskrift</h1>
      {/* key=importUrl (27.08.2026) – tvinger React til å montere en HELT
       * NY RecipeForm-instans dersom admin går fra ett "Opprett som egen
       * oppskrift"-treff rett til et annet uten en full sideomlasting
       * mellom (samme rute, kun søkeparameteren endres). Uten denne kunne
       * Next.js gjenbruke den eksisterende klientkomponent-instansen, og
       * useEffect-en i RecipeForm som starter importen automatisk (kjører
       * kun ved MOUNT, se der) ville da ikke kjørt på nytt for den andre
       * lenken. */}
      <RecipeForm
        key={params.importUrl ?? "blank"}
        categories={categories}
        initialTitle={params.title}
        initialDescription={params.description}
        initialServings={Number.isFinite(initialServings) ? initialServings : undefined}
        fromMealId={params.fromMealId}
        fromSlotId={params.fromSlotId}
        initialImportUrl={params.importUrl}
      />
    </div>
  );
}
