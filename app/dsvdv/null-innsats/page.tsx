import { requireDsvdvSession } from "@/lib/dsvdv/session";
import { JOBBMAT_RECIPES } from "@/lib/dsvdv/jobbmat-data";
import { JobbmatList } from "@/components/dsvdv/JobbmatList";

export default async function DsvdvNullInnsatsPage() {
  await requireDsvdvSession();

  const recipes = JOBBMAT_RECIPES.filter((r) => r.nullInnsats);

  return (
    <JobbmatList
      eyebrow="Jobbmat"
      heading="Null innsats"
      description="Ingen tilberedning i det hele tatt."
      recipes={recipes}
    />
  );
}
