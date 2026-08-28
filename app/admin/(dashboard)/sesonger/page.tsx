import type { Metadata } from "next";
import { getAllSeasonsForAdmin } from "@/lib/data/seasons";
import { Button } from "@/components/ui/Button";
import { AdminSeasonRow } from "@/components/admin/AdminSeasonRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookIcon, PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Sesonger" };

export default async function AdminSeasonsPage() {
  const seasons = await getAllSeasonsForAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">I sesong</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {seasons.length} {seasons.length === 1 ? "sesong" : "sesonger"} totalt
          </p>
        </div>
        <Button href="/admin/sesonger/ny">
          <PlusIcon className="h-4 w-4" />
          Ny sesong
        </Button>
      </div>

      {seasons.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="h-10 w-10" />}
          title="Ingen sesonger ennå"
          description="Kom i gang ved å opprette den første sesongen."
          action={<Button href="/admin/sesonger/ny">Ny sesong</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-paper">
          {seasons.map((season) => (
            <AdminSeasonRow key={season.id} season={season} />
          ))}
        </div>
      )}
    </div>
  );
}
