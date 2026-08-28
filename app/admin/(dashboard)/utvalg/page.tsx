import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { FeaturedPicker } from "@/components/admin/FeaturedPicker";

export const metadata: Metadata = { title: "Ukens utvalg · Admin" };

export default async function AdminFeaturedPage() {
  const all = await getAllRecipesForAdmin();
  // Kun publiserte oppskrifter er aktuelle for "ukens utvalg" – et utkast
  // skal ikke kunne havne på forsiden bare fordi det ble lagt i utvalget.
  const published = all.filter((r) => r.isPublished);

  const featured = published
    .filter((r) => r.isFeatured)
    .sort((a, b) => (a.featuredSortOrder ?? Infinity) - (b.featuredSortOrder ?? Infinity));
  const available = published.filter((r) => !r.isFeatured);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Ukens utvalg</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg og sorter hvilke oppskrifter som vises som "ukens utvalg" på forsiden – helt uavhengig
          av hva du har hjertet.
        </p>
      </div>

      <FeaturedPicker featured={featured} available={available} />
    </div>
  );
}
