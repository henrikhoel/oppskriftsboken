import type { Metadata } from "next";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
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
  const lang = await getLang();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-3xl text-ink sm:text-4xl">{t(lang, "shoppingPage.title")}</h1>
      <p className="mt-2 text-ink-soft">{t(lang, "shoppingPage.description")}</p>
      <div className="mt-8">
        <ShoppingListView lang={lang} />
      </div>
    </div>
  );
}
