import type { Metadata } from "next";
import { MealView } from "@/components/meal/MealView";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "mealPage.metaTitle") };
}

/**
 * Menyer lever KUN i localStorage hos den enkelte besøkende (se
 * lib/kitchen-intelligence/types.ts sin filheader for MealSession) – denne
 * siden er derfor bevisst en tynn server-wrapper som kun henter `lang` og
 * route-param-en, selve innholdet (og "finnes ikke"-sjekken) skjer
 * klientside i MealView.tsx.
 */
export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <MealView mealId={id} lang={lang} />
    </div>
  );
}
