import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { WeeklyMenuExclusionPicker } from "@/components/admin/WeeklyMenuExclusionPicker";

export const metadata: Metadata = { title: "Ukesmeny · Admin" };

/**
 * "Ukesmeny" – admin-styring av hvilke publiserte oppskrifter som er
 * egnet for den automatiske man–fre-ukesmenyen på /ukesmeny (29.09.2026).
 * Se migrasjon 0024_recipe_weekly_menu_exclude.sql sin filheader for hele
 * bakgrunnen, og WeeklyMenuExclusionPicker.tsx for selve UI-et. Samme
 * "kun publiserte oppskrifter er aktuelle her"-begrunnelse som
 * /admin/utvalg og /admin/humor: et upublisert utkast skal aldri kunne
 * dukke opp i en besøkendes ukesmeny.
 */
export default async function AdminWeeklyMenuPage() {
  const all = await getAllRecipesForAdmin();
  const published = all.filter((r) => r.isPublished);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Ukesmeny</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg hvilke oppskrifter som kan trekkes ut i den automatiske man–fre-ukesmenyen. Alle
          publiserte oppskrifter er med som standard – utelat kun de som ikke passer på en hverdag
          (f.eks. helgemat eller store prosjekter).
        </p>
      </div>

      <WeeklyMenuExclusionPicker recipes={published} />
    </div>
  );
}
