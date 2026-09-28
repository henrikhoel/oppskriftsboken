import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { WeeklyMenuAdminPicker } from "@/components/admin/WeeklyMenuAdminPicker";

export const metadata: Metadata = { title: "Ukesmeny · Admin" };

/**
 * "Ukesmeny" – admin-styring for /ukesmeny (29.09.2026, utvidet
 * 30.09.2026 med stiler). Se migrasjon 0024_recipe_weekly_menu_exclude.sql
 * og 0025_recipe_weekly_menu_styles.sql sine filheadere for hele
 * bakgrunnen, og WeeklyMenuAdminPicker.tsx for selve UI-et (én kombinert
 * liste: utelatt-toggle + fire stil-ikoner per rad). Samme "kun publiserte
 * oppskrifter er aktuelle her"-begrunnelse som /admin/utvalg og
 * /admin/humor: et upublisert utkast skal aldri kunne dukke opp i en
 * besøkendes ukesmeny.
 */
export default async function AdminWeeklyMenuPage() {
  const [all, lang] = await Promise.all([getAllRecipesForAdmin(), getLang()]);
  const published = all.filter((r) => r.isPublished);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Ukesmeny</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg hvilke oppskrifter som kan trekkes ut i den automatiske man–fre-ukesmenyen, og
          hvilken(e) stil(er) de passer under. Alle publiserte oppskrifter er med i "Variert" som
          standard – utelat kun de som ikke passer på en hverdag (f.eks. helgemat eller store
          prosjekter). Stil-ikonene bestemmer i tillegg hvilke retter som dukker opp når en
          besøkende velger en av de fire spesifikke stilene i stedet for "Variert".
        </p>
      </div>

      <WeeklyMenuAdminPicker recipes={published} lang={lang} />
    </div>
  );
}
