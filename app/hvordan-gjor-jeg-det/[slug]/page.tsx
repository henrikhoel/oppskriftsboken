import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuideBySlug, getAllGuideSlugs } from "@/lib/data/guides";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { GuideContent } from "@/components/guide/GuideContent";
import { localizedGuideIntro } from "@/lib/utils/guide-format";
import { localizedTitle } from "@/lib/utils/format";
import { siteConfig } from "@/lib/config";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [guide, lang] = await Promise.all([getGuideBySlug(slug), getLang()]);
  if (!guide) return { title: t(lang, "recipeNotFound.title") };

  const title = localizedTitle(guide, lang);
  const description = localizedGuideIntro(guide, lang);
  const url = `${siteConfig.url}/hvordan-gjor-jeg-det/${guide.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [guide, lang] = await Promise.all([getGuideBySlug(slug), getLang()]);

  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/hvordan-gjor-jeg-det"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {t(lang, "guides.backToLibrary")}
      </Link>

      <div className="mt-6">
        <GuideContent guide={guide} lang={lang} />
      </div>
    </article>
  );
}
