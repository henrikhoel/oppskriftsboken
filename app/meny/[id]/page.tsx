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
 *
 * (28.09.2026) Den tidligere faste `max-w-3xl`-wrapperen rundt HELE siden er
 * fjernet for den innloggede visningen – MealView.tsx er nå bygget som tre
 * fullbredde makro-segmenter (DIN MENY mørk / PLANLEGG KVELDEN lys kremflate
 * / GJØR DET TIL EN KVELD eget mørkt univers, se filheaderen der), samme
 * teknikk som forsiden (app/page.tsx) allerede bruker: INGEN felles
 * maks-bredde-container her lenger, hvert segment eier sin egen bakgrunn og
 * sin egen indre `mx-auto max-w-3xl`-kolonne. LockedPanel-visningen (ikke
 * innlogget) er fortsatt bare én enkel, sentrert melding – den beholder sin
 * egen smale wrapper uendret.
 */
export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  // Kun for "opprett oppskrift fra AI-forslag"-knappen på foreslåtte retter
  // (se MealView.tsx) – admin-gatet på server-siden her (samme mønster som
  // isAdmin i app/oppskrifter/[slug]/page.tsx), IKKE bare skjult med CSS.
  const user = await getCurrentUserFast();

  // (27.09.2026) "Gjør det til en kveld" er kontoeksklusiv – se
  // favoritter/page.tsx for samme resonnement. Gjelder visning av en
  // allerede bygget meny her, uansett hvilken menybygger den ble til i.
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <LockedPanel
          message={t(lang, "featureLocked.mealMessage")}
          ctaLabel={t(lang, "featureLocked.cta")}
          nextPath={`/meny/${id}`}
        />
      </div>
    );
  }

  return <MealView mealId={id} isAdmin={Boolean(user?.isAdmin)} lang={lang} />;
}
