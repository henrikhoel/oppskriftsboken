import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingListView } from "@/components/shopping/ShoppingListView";
import { LockedPanel } from "@/components/ui/LockedPanel";
import { getCurrentUserFast } from "@/lib/auth";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { ChevronLeftIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "shoppingPage.title"),
    description: t(lang, "shoppingPage.metaDescription"),
  };
}

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [lang, user, { fromWeeklyMenu }] = await Promise.all([getLang(), getCurrentUserFast(), searchParams]);

  // (06.10.2026) "Tilbake til ukesmenyen" – Henrik: "når jeg trykker inn på
  // handelista fra ukesmenyen, så har jeg ingen mulighet til å gå tilbake
  // til ukesmenyen, den blir helt borte". Samme ett-hakk-tilbake-mønster
  // som app/oppskrifter/[slug]/page.tsx allerede bruker for fromMealId/
  // fromWeeklyMenu: WeeklyMenuView.tsx legger nå ved ?fromWeeklyMenu=1 på
  // "Se listen"-lenken til handlelisten. Uten parameteren (alle andre
  // innganger til /handleliste – header, footer, enkeltoppskrifter osv.)
  // er siden uendret, ingen tilbakelenke.
  const cameFromWeeklyMenu = typeof fromWeeklyMenu === "string" && fromWeeklyMenu.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {cameFromWeeklyMenu && (
        <Link
          href="/ukesmeny"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t(lang, "shoppingPage.backToWeeklyMenuLink")}
        </Link>
      )}
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
            nextPath={cameFromWeeklyMenu ? "/handleliste?fromWeeklyMenu=1" : "/handleliste"}
          />
        )}
      </div>
    </div>
  );
}
