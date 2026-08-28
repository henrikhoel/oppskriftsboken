import type { Metadata } from "next";
import { getAllGuideCategories } from "@/lib/data/guide-categories";
import { getAllGuideTitlesForAdmin } from "@/lib/data/guides";
import { GuideForm } from "@/components/admin/GuideForm";

export const metadata: Metadata = { title: "Ny guide" };

export default async function NewGuidePage() {
  const [categories, allGuides] = await Promise.all([getAllGuideCategories(), getAllGuideTitlesForAdmin()]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Ny guide</h1>
      <GuideForm categories={categories} relatedCandidates={allGuides} />
    </div>
  );
}
