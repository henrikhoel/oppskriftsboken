import type { Metadata } from "next";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { SavedWeeklyMenusList } from "@/components/meal/SavedWeeklyMenusList";
import { LockedPanel } from "@/components/ui/LockedPanel";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "savedWeeklyMenusPage.metaTitle") };
}

/**
 * "Se lagrede ukesmenyer" (28.09.2026, Henrik: "jeg mener også å ha en
 * 'lagre ukesmeny' og 'se lagrede ukesmenyer'") – speiler app/mine-menyer/
 * page.tsx (samme tynn-server-wrapper-mønster: kun innloggingssjekken skjer
 * her, selve listen leses klientside fra localStorage i
 * SavedWeeklyMenusList.tsx, se filheaderen i lib/hooks/useSavedWeeklyMenus.ts).
 *
 * Lenket til fra selve /ukesmeny (weeklyMenu.savedMenusLink), samme
 * "ved siden av selve funksjonen"-plassering som "Dine lagrede menyer" ved
 * siden av "Bygg en meny selv" på /oppskrifter.
 *
 * BEVISST hele (ikke kun `weeklyMenuExcluded`-filtrerte) oppskriftslisten
 * sendt inn her, til forskjell fra selve /ukesmeny (WeeklyMenuPage) sin
 * `eligible`-filtrering – en allerede LAGRET uke kan inneholde en
 * oppskrift som senere er utelatt fra selve ukesmeny-velgeren (admin
 * endret dette etterpå), og skal likevel kunne vise riktig tittel i
 * oversikten/"Bruk denne uken igjen" fortsatt fungere for den lagrede
 * uken som den var.
 *
 * Kontoeksklusiv, samme begrunnelse/mønster som /ukesmeny selv og
 * /mine-menyer.
 */
export default async function SavedWeeklyMenusPage() {
  const [allRecipes, lang, user] = await Promise.all([
    getSearchableRecipes(),
    getLang(),
    getCurrentUserFast(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {user ? (
        <SavedWeeklyMenusList recipes={allRecipes} lang={lang} />
      ) : (
        <LockedPanel
          message={t(lang, "featureLocked.weeklyMenuMessage")}
          ctaLabel={t(lang, "featureLocked.cta")}
          nextPath="/ukesmeny/lagrede"
        />
      )}
    </div>
  );
}
