import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeasonByIdForAdmin } from "@/lib/data/seasons";
import { SeasonForm } from "@/components/admin/SeasonForm";

export const metadata: Metadata = { title: "Rediger sesong" };

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = await getSeasonByIdForAdmin(id);

  if (!season) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-ink sm:text-3xl">Rediger sesong</h1>
      <SeasonForm season={season} />
    </div>
  );
}
