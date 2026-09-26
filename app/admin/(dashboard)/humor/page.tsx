import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { MoodPicker } from "@/components/admin/MoodPicker";

export const metadata: Metadata = { title: "Humør · Admin" };

/**
 * "Humør" – admin-styring av hvilke oppskrifter som vises under hver av de
 * fem faste stemningene i forsidens "Hva passer humøret ditt?"-seksjon
 * (components/home/MoodModeSection.tsx). Se migrasjon 0020_recipe_mood.sql
 * sin filheader for hele bakgrunnen (erstatter en tidligere AI-basert
 * matching som ga null treff på flere stemninger). Kun publiserte
 * oppskrifter er aktuelle her, samme begrunnelse som /admin/utvalg: et
 * utkast skal ikke kunne dukke opp på forsiden bare fordi det fikk et
 * humør satt.
 */
export default async function AdminMoodPage() {
  const [all, lang] = await Promise.all([getAllRecipesForAdmin(), getLang()]);
  const published = all.filter((r) => r.isPublished);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Humør</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg hvilke oppskrifter som skal dukke opp under hver stemning i "Hva passer humøret ditt?" på
          forsiden. En oppskrift kan stå i flere humør samtidig, eller ingen – da vises den under ingen av
          dem.
        </p>
      </div>

      <MoodPicker recipes={published} lang={lang} />
    </div>
  );
}
