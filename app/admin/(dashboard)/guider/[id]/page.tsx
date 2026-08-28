import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllGuideCategories } from "@/lib/data/guide-categories";
import { getGuideByIdForAdmin, getAllGuideTitlesForAdmin } from "@/lib/data/guides";
import { GuideForm } from "@/components/admin/GuideForm";

export const metadata: Metadata = { title: "Rediger guide" };

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [guide, categories, allGuides] = await Promise.all([
    getGuideByIdForAdmin(id),
    getAllGuideCategories(),
    getAllGuideTitlesForAdmin(),
  ]);

  if (!guide) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Rediger guide</h1>
      <GuideForm
        guide={guide}
        categories={categories}
        relatedCandidates={allGuides.filter((g) => g.id !== guide.id)}
      />
    </div>
  );
}
