import type { Metadata } from "next";
import { getAllCategories } from "@/lib/data/categories";
import { RecipeForm } from "@/components/admin/RecipeForm";

export const metadata: Metadata = { title: "Ny oppskrift" };

export default async function NewRecipePage() {
  const categories = await getAllCategories();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Ny oppskrift</h1>
      <RecipeForm categories={categories} />
    </div>
  );
}
