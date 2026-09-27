import { requireDsvdvSession } from "@/lib/dsvdv/session";
import { JOBBMAT_RECIPES } from "@/lib/dsvdv/jobbmat-data";
import { JobbmatList } from "@/components/dsvdv/JobbmatList";

export default async function DsvdvToastjernPage() {
  await requireDsvdvSession();

  const recipes = JOBBMAT_RECIPES.filter((r) => r.utstyr.includes("toastjern"));

  return (
    <JobbmatList eyebrow="Jobbmat" heading="Toastjern" description="Press, varme, ferdig." recipes={recipes} />
  );
}
