import { requireDsvdvSession } from "@/lib/dsvdv/session";
import { JOBBMAT_RECIPES } from "@/lib/dsvdv/jobbmat-data";
import { JobbmatList } from "@/components/dsvdv/JobbmatList";

export default async function DsvdvAirfryerPage() {
  await requireDsvdvSession();

  const recipes = JOBBMAT_RECIPES.filter((r) => r.utstyr.includes("airfryer"));

  return (
    <JobbmatList
      eyebrow="Jobbmat"
      heading="Airfryer"
      description="Sprøtt og varmt, uten stekepanne."
      recipes={recipes}
    />
  );
}
