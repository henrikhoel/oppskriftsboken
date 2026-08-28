import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllGuideCategories } from "@/lib/data/guide-categories";
import { getGuidesByCategory } from "@/lib/data/guides";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { GuideGrid } from "@/components/guide/GuideGrid";
import { localizedCategoryName } from "@/lib/utils/format";
import { ChevronLeftIcon } from "@/components/ui/icons";

export async function generateStaticParams() {
  const categories = await getAllGuideCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [categories, lang] = await Promise.all([getAllGuideCategories(), getLang()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: t(lang, "categoryPage.notFoundTitle") };
  return { title: localizedCategoryName(category, lang) };
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, lang] = await Promise.all([getAllGuideCategories(), getLang()]);
  const category = categories.find((c) => c.slug === slug);

  if (!category) notFound();

  const guides = await getGuidesByCategory(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/hvordan-gjor-jeg-det"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {t(lang, "guides.backToLibrary")}
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-clay">{t(lang, "guides.pageEyebrow")}</p>
      <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">{localizedCategoryName(category, lang)}</h1>

      <div className="mt-8">
        <GuideGrid guides={guides} emptyTitle={t(lang, "guides.categoryEmpty")} lang={lang} />
      </div>
    </div>
  );
}
