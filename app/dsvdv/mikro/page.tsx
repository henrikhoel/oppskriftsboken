import { requireDsvdvSession } from "@/lib/dsvdv/session";
import { JOBBMAT_RECIPES } from "@/lib/dsvdv/jobbmat-data";
import { JobbmatList } from "@/components/dsvdv/JobbmatList";

export default async function DsvdvMikroPage() {
  // Server-side vakt, kjøres FØRST – se filheaderen i lib/dsvdv/session.ts.
  await requireDsvdvSession();

  const recipes = JOBBMAT_RECIPES.filter((r) => r.utstyr.includes("mikro"));

  return (
    <JobbmatList
      eyebrow="Jobbmat"
      heading="Mikro"
      description="Rett i mikroen, ferdig på minutter."
      recipes={recipes}
    />
  );
}
