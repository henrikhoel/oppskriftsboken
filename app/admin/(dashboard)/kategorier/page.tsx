import type { Metadata } from "next";
import { getAllCategories } from "@/lib/data/categories";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const metadata: Metadata = { title: "Kategorier" };

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl text-ink sm:text-3xl">Kategorier</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        Kategorier brukes til å organisere og filtrere oppskrifter. Å slette en kategori fjerner
        den ikke fra eksisterende oppskrifter permanent – de mister bare kategorimerkingen.
      </p>
      <CategoryManager categories={categories} />
    </div>
  );
}
