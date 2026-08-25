import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCategories } from "@/lib/data/categories";
import { getRecipeByIdForAdmin } from "@/lib/data/recipes";
import { RecipeForm } from "@/components/admin/RecipeForm";

export const metadata: Metadata = { title: "Rediger oppskrift" };

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, categories] = await Promise.all([getRecipeByIdForAdmin(id), getAllCategories()]);

  if (!recipe) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Rediger oppskrift</h1>
      <RecipeForm recipe={recipe} categories={categories} />
    </div>
  );
}
