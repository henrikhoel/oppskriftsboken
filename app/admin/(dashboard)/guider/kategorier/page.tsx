import type { Metadata } from "next";
import { getAllGuideCategories } from "@/lib/data/guide-categories";
import { GuideCategoryManager } from "@/components/admin/GuideCategoryManager";

export const metadata: Metadata = { title: "Guide-kategorier" };

export default async function AdminGuideCategoriesPage() {
  const categories = await getAllGuideCategories();

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl text-ink sm:text-3xl">Guide-kategorier</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        Kategorier for «Hvordan gjør jeg det?» – EGEN liste fra oppskriftenes kategorier. Å slette en
        kategori fjerner den ikke fra eksisterende guider permanent – de mister bare kategorimerkingen.
      </p>
      <GuideCategoryManager categories={categories} />
    </div>
  );
}
