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
 * AUTOMATISK UKESMENY – EDITORIELT REDESIGN (30.09.2026, se filheaderen i
 * WeeklyMenuView.tsx for hele bakgrunnen). Henrik: "Redesign /ukesmeny
 * slik at siden føles langt mer som CONVITE: premium, editorial, rolig og
 * stilren [...] Ikke endre headeren." – kun selve sidens EGET innhold er
 * endret, hovednavigasjonen (Header.tsx) er urørt.
 *
 * Introteksten (tittel/tagline/kort avsnitt) ligger bevisst her på
 * side-nivå, IKKE inne i WeeklyMenuView – den vises for ALLE besøkende
 * (også ikke-innloggede, som ser LockedPanel under), som en liten
 * smakebit/markedsføring av funksjonen, samme prinsipp som at
 * RecipeTeaser viser bilde/tittel/beskrivelse for gjester før selve
 * innholdet låses.
 *
 * Smal tekstkolonne (max-w-xl) for selve introen, men en bredere
 * ytre ramme (max-w-5xl) for selve ukesmeny-spredningen under – bevisst
 * editorial-magasin-teknikk (smal tekst, bred visuell del), fremfor å la
 * hele siden dele samme smale bredde.
 */
export default async function WeeklyMenuPage() {
  const [allRecipes, lang, user] = await Promise.all([
    getSearchableRecipes(),
    getLang(),
    getCurrentUserFast(),
  ]);
  const eligible = allRecipes.filter((r) => !r.weeklyMenuExcluded);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="max-w-xl">
        <h1 className="font-serif text-4xl text-ink sm:text-5xl">{t(lang, "weeklyMenu.title")}</h1>
        <p className="mt-3 font-serif text-lg text-clay-dark sm:text-xl">{t(lang, "weeklyMenu.tagline")}</p>
        <p className="mt-4 text-ink-soft">{t(lang, "weeklyMenu.description")}</p>
      </div>

      <div className="mt-12">
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
