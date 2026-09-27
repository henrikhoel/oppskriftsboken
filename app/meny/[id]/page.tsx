import type { Metadata } from "next";
import { MealView } from "@/components/meal/MealView";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
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
  // Kun for "opprett oppskrift fra AI-forslag"-knappen på foreslåtte retter
  // (se MealView.tsx) – admin-gatet på server-siden her (samme mønster som
  // isAdmin i app/oppskrifter/[slug]/page.tsx), IKKE bare skjult med CSS.
  const user = await getCurrentUserFast();

  // (27.09.2026) "Bygg din egen meny"/"Gjør det til en kveld" er
  // kontoeksklusiv – se favoritter/page.tsx for samme resonnement. Gjelder
  // også visning av en allerede bygget meny her, ikke bare selve
  // byggingen i app/meny/ny/page.tsx.
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {user ? (
        <MealView mealId={id} isAdmin={Boolean(user?.isAdmin)} lang={lang} />
      ) : (
        <LockedPanel
          message={t(lang, "featureLocked.mealMessage")}
          ctaLabel={t(lang, "featureLocked.cta")}
          nextPath={`/meny/${id}`}
        />
      )}
    </div>
  );
}
