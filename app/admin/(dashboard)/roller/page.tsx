import type { Metadata } from "next";
import { getAllRecipesForAdmin } from "@/lib/data/recipes";
import { getLang } from "@/lib/i18n/lang";
import { RolePicker } from "@/components/admin/RolePicker";

export const metadata: Metadata = { title: "Roller · Admin" };

/**
 * "Roller" – admin-styring av hvilke oppskrifter som skal vises/kunne
 * velges som VALG for hver av de fire faste menyrollene (forrett/
 * hovedrett/tilbehør/dessert). Se migrasjon 0022_recipe_meal_roles.sql sin
 * filheader for hele bakgrunnen (ønsket av Henrik: "man ikke kan velge
 * brownie til forrett og rundstykker til dessert"). Kun publiserte
 * oppskrifter er aktuelle her, samme begrunnelse som /admin/humor og
 * /admin/utvalg: et utkast skal ikke kunne dukke opp som et menyvalg bare
 * fordi det fikk en rolle satt.
 *
 * (03.10.2026) Brukt av menybyggeren på selve oppskriftssiden
 * (MealBuilder.tsx, "Gjør det til en kveld", via generateMealPlan/
 * regenerateMealPlanCourse i lib/actions/kitchen-intelligence.ts) som en
 * HARD begrensning: en oppskrift som ER rolletagget her kan kun foreslås
 * til én av sine egne roller, aldri en annen (Henrik: "roller må bli
 * brukt på menybyggeren inne på oppskriften også, sånn at man ikke får
 * dessert til forrett feks"). Utagget oppskrifter (ingen rolle satt her)
 * er IKKE begrenset – de kan fortsatt foreslås til hvilken som helst
 * rolle. Tidligere kun brukt av den manuelle menybyggeren
 * (ManualMealBuilder.tsx, /meny/ny), som er fjernet.
 */
export default async function AdminRolesPage() {
  const [all, lang] = await Promise.all([getAllRecipesForAdmin(), getLang()]);
  const published = all.filter((r) => r.isPublished);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink sm:text-3xl">Roller</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Velg hvilken(e) rolle(r) hver oppskrift kan fylle i menybyggeren – forrett, hovedrett, tilbehør eller
          dessert. En oppskrift kan stå i flere roller samtidig, eller ingen. En rolletagget oppskrift kan da kun
          foreslås til sine egne roller, aldri en annen.
        </p>
      </div>

      <RolePicker recipes={published} lang={lang} />
    </div>
  );
}
