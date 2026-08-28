import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuidesForAdmin } from "@/lib/data/guides";
import { Button } from "@/components/ui/Button";
import { AdminGuideRow } from "@/components/admin/AdminGuideRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { HelpCircleIcon, PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Guider" };

export default async function AdminGuidesPage() {
  const guides = await getAllGuidesForAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">Hvordan gjør jeg det?</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {guides.length} {guides.length === 1 ? "guide" : "guider"} totalt ·{" "}
            <Link href="/admin/guider/kategorier" className="underline underline-offset-2 hover:text-ink">
              Kategorier
            </Link>
          </p>
        </div>
        <Button href="/admin/guider/ny">
          <PlusIcon className="h-4 w-4" />
          Ny guide
        </Button>
      </div>

      {guides.length === 0 ? (
        <EmptyState
          icon={<HelpCircleIcon className="h-10 w-10" />}
          title="Ingen guider ennå"
          description="Kom i gang ved å opprette din første guide."
          action={<Button href="/admin/guider/ny">Ny guide</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-paper">
          {guides.map((guide) => (
            <AdminGuideRow key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
}
