import type { Metadata } from "next";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
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
