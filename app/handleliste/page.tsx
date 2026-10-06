import type { Metadata } from "next";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
import { BackToWeeklyMenuLink } from "@/components/meal/BackToWeeklyMenuLink";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "shoppingPage.title"),
    description: t(lang, "shoppingPage.metaDescription"),
  };
}

export default async function ShoppingListPage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUserFast()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* (06.10.2026) "Tilbake til ukesmenyen" – Henrik: "jeg tenker vi kan
          gjøre sånn at uansett om vi har lagt en ukesmeny i handlelista, så
          står det ALLTID 'tilbake til ukesmenyen' inne på handlelista,
          uansett om man går inn via handlelista eller senere". ERSTATTER
          den forrige ?fromWeeklyMenu=1-URL-parameter-baserte løsningen (se
          git-historikk) – BackToWeeklyMenuLink spør i stedet selve
          handlelisten (samme datakilde som meny-oversikten i
          ShoppingListView.tsx, se filheaderen der), og avgjør DERMED helt
          selv om lenken skal vises, uavhengig av hvordan man kom til
          siden. Kun når `user` finnes – ellers er det ingen faktisk
          handleliste å spørre (LockedPanel under). */}
      {user && <BackToWeeklyMenuLink lang={lang} />}
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "shoppingPage.title")}</h1>
      <p className="mt-2 text-ink-soft">{t(lang, "shoppingPage.description")}</p>
      {/* (27.09.2026) Handleliste er kontoeksklusiv – se favoritter/page.tsx
          for samme resonnement. */}
      <div className="mt-8">
        {user ? (
          <ShoppingListView lang={lang} />
        ) : (
          <LockedPanel
            message={t(lang, "featureLocked.shoppingListMessage")}
            ctaLabel={t(lang, "featureLocked.cta")}
            nextPath="/handleliste"
          />
        )}
      </div>
    </div>
  );
}
