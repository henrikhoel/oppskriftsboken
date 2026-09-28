import type { Metadata } from "next";
import { getSearchableRecipes } from "@/lib/data/recipes";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { WeeklyMenuView } from "@/components/meal/WeeklyMenuView";
import { LockedPanel } from "@/components/ui/LockedPanel";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "weeklyMenu.title") };
}

/**
 * AUTOMATISK UKESMENY – nytt inngangspunkt (29.09.2026), se filheaderen i
 * components/meal/WeeklyMenuView.tsx for hele bakgrunnen og
 * sammenslåingslogikken. Tynn server-wrapper, samme mønster som
 * app/meny/ny/page.tsx og app/handleliste/page.tsx: henter hele katalogen
 * som SearchableRecipe[] (samme henting /oppskrifter allerede gjør) og
 * filtrerer bort oppskrifter merket "utelatt" i /admin/ukesmeny FØR
 * klientkomponenten ser dem – klienten skal aldri kunne trekke en
 * utelatt/upublisert oppskrift, uansett hva som ligger i localStorage fra
 * før.
 *
 * Kontoeksklusiv, samme resonnement som /meny/ny og /handleliste
 * (favoritter/page.tsx) – dette er tenkt som selve kjernefunksjonen bak et
 * fremtidig betalt abonnement (se prosjektnotatet "plan-brukerkontoer.md"),
 * så den skal fra første stund kreve innlogging, selv før selve
 * betalingsmuren er bygget.
 */
export default async function WeeklyMenuPage() {
  const [allRecipes, lang, user] = await Promise.all([
    getSearchableRecipes(),
    getLang(),
    getCurrentUserFast(),
  ]);
  const eligible = allRecipes.filter((r) => !r.weeklyMenuExcluded);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "weeklyMenu.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "weeklyMenu.description")}</p>

      <div className="mt-8">
        {user ? (
          <WeeklyMenuView recipes={eligible} lang={lang} />
        ) : (
          <LockedPanel
            message={t(lang, "featureLocked.weeklyMenuMessage")}
            ctaLabel={t(lang, "featureLocked.cta")}
            nextPath="/ukesmeny"
          />
        )}
      </div>
    </div>
  );
}
