import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { Button } from "@/components/ui/Button";
import { AdminRecipeRow } from "@/components/admin/AdminRecipeRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookIcon, PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const recipes = await getAllRecipesForAdmin();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink sm:text-3xl">Oppskrifter</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {recipes.length} {recipes.length === 1 ? "oppskrift" : "oppskrifter"} totalt
          </p>
        </div>
        <Button href="/admin/oppskrifter/ny">
          <PlusIcon className="h-4 w-4" />
          Ny oppskrift
        </Button>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="h-10 w-10" />}
          title="Ingen oppskrifter ennå"
          description="Kom i gang ved å opprette din første oppskrift."
          action={<Button href="/admin/oppskrifter/ny">Ny oppskrift</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-paper">
          {recipes.map((recipe) => (
            <AdminRecipeRow key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
