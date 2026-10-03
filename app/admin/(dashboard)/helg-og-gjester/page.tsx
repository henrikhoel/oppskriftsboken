import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { WeekendGuestsAdminPicker } from "@/components/admin/WeekendGuestsAdminPicker";

export const metadata: Metadata = { title: "Helg & gjester · Admin" };

/**
 * "Helg & gjester" – admin-styring for /helg-og-gjester (03.10.2026). Se
 * migrasjon 0030_recipe_weekend_guests.sql sin filheader for hele
 * bakgrunnen, og WeekendGuestsAdminPicker.tsx for selve UI-et (én kombinert
 * liste: av/på-bryter + fem anlednings-ikoner per rad). Samme
 * "kun publiserte oppskrifter er aktuelle her"-begrunnelse som
 * /admin/ukesmeny//admin/utvalg//admin/humor: et upublisert utkast skal
 * aldri kunne dukke opp på den offentlige /helg-og-gjester-siden.
 */
export default async function AdminWeekendGuestsPage() {
  const [all, lang] = await Promise.all([getAllRecipesForAdmin(), getLang()]);
  const published = all.filter((r) => r.isPublished);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Helg &amp; gjester</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg hvilke publiserte oppskrifter som skal vises på den offentlige Helg &amp; gjester-siden, og
          hvilken(e) anledning(er) de passer under. &quot;Alle&quot; på selve siden betyr alle oppskrifter
          merket &quot;Helg &amp; gjester&quot; her, uavhengig av anledning. Helt uavhengig av Ukesmeny og
          &quot;Gjør det til en kveld&quot; – en oppskrift kan ha enhver kombinasjon av disse.
        </p>
      </div>

      <WeekendGuestsAdminPicker recipes={published} lang={lang} />
    </div>
  );
}
