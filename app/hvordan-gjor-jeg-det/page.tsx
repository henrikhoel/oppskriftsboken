import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuideCategories, getGuideCategoryCounts } from "@/lib/data/guide-categories";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { GuideSearchBar } from "@/components/guide/GuideSearchBar";
import { localizedCategoryName } from "@/lib/utils/format";
import { HelpCircleIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "nav.guides"),
    description: t(lang, "guides.pageIntro"),
  };
}

/**
 * Landingsside for "Hvordan gjør jeg det?" – À TABLEs kunnskapsbibliotek
 * (se filheaderen til supabase/migrations/0013_knowledge_guides.sql).
 * Henter KUN kategorier + tellinger her (bevisst begrenset datasett, ikke
 * hele guide-tabellen) – selve søket skjer server-side per tastetrykk via
 * GuideSearchBar -> searchGuidesAction, se filheaderen til den komponenten
 * for hvorfor "hent alt og filtrer i nettleseren" bevisst er unngått.
 */
export default async function GuidesLandingPage() {
  const [categories, counts, lang] = await Promise.all([
    getAllGuideCategories(),
    getGuideCategoryCounts(),
    getLang(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">{t(lang, "guides.pageEyebrow")}</p>
      <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">{t(lang, "nav.guides")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t(lang, "guides.pageIntro")}</p>

      <div className="mt-8">
        <GuideSearchBar lang={lang} />
      </div>

      <div className="mt-12">
        <h2 className="mb-4 font-serif text-lg text-ink">{t(lang, "guides.categoriesHeading")}</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-faint">{t(lang, "guides.emptyLibrary")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/hvordan-gjor-jeg-det/kategori/${category.slug}`}
                className="group flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-5 py-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-dark text-ink-soft">
                    <HelpCircleIcon className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-ink">{localizedCategoryName(category, lang)}</span>
                </span>
                <span className="shrink-0 text-sm text-ink-faint">{counts[category.slug] ?? 0}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
