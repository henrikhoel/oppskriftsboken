import type { Metadata } from "next";
import { SavedMealsList } from "@/components/meal/SavedMealsList";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: t(lang, "savedMealsPage.metaTitle") };
}

/**
 * "Dine menyer" (27.09.2026, ønsket av Henrik: "da må den legge seg et
 * eget sted for lagrede menyer") – oversikt over ALLE menyer denne
 * besøkende har laget via den AI-baserte menybyggeren (MealBuilder.tsx,
 * "Gjør det til en kveld" fra én oppskrift). Lenket til fra /oppskrifter
 * (se recipesPage.savedMealsLink der).
 *
 * (03.10.2026) Den manuelle menybyggeren (ManualMealBuilder.tsx, /meny/ny)
 * som tidligere også fylte denne listen, er fjernet (Henrik: "det er bare
 * overflødig når man egentlig kan gjøre det via oppskrifter uansett") –
 * denne siden og selve MealSession-infrastrukturen (/meny/[id] osv.) er
 * UENDRET, siden de fortsatt er i bruk av MealBuilder.tsx.
 *
 * Menyer lever KUN i localStorage (se app/meny/[id]/page.tsx sin
 * filheader for samme resonnement) – denne siden er derfor, som den, en
 * tynn server-wrapper som kun gjør innloggingssjekken; selve listen
 * (useMealSessionIndex + én useMealSession per meny) leses klientside i
 * SavedMealsList.tsx.
 *
 * Kontoeksklusiv, samme begrunnelse som /meny/[id] (se favoritter/page.tsx):
 * menybyggeren ble gjort kontoeksklusiv 27.09.2026, og en oversikt over de
 * samme menyene skal naturligvis følge akkurat samme regel.
 */
export default async function SavedMealsPage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUserFast()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {user ? (
        <SavedMealsList lang={lang} />
      ) : (
        <LockedPanel
          message={t(lang, "featureLocked.mealMessage")}
          ctaLabel={t(lang, "featureLocked.cta")}
          nextPath="/mine-menyer"
        />
      )}
    </div>
  );
}
