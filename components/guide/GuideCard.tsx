import Link from "next/link";
import type { GuideSummary } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { localizedTitle, localizedCategoryName, difficultyLabel, formatMinutesRange } from "@/lib/utils/format";
import { localizedGuideIntro } from "@/lib/utils/guide-format";
import { ClockIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Ett kort i guide-biblioteket (landingsside/kategoriside/søketreff) – rent
 * tekst-drevet, ingen bilde (guider har ikke hero-bilder slik oppskrifter
 * har, se filheaderen til lib/types.ts sin Guide-familie: dette er et
 * bevisst enklere, mer leksikon-aktig innholdsområde).
 */
export function GuideCard({ guide, lang = "no" }: { guide: GuideSummary; lang?: Lang }) {
  return (
    <Link
      href={`/hvordan-gjor-jeg-det/${guide.slug}`}
      className="group flex flex-col gap-2 rounded-card border border-line bg-paper p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover focus-visible:shadow-card-hover"
    >
      <div className="flex flex-wrap items-center gap-2">
        {guide.category && <Badge tone="olive">{localizedCategoryName(guide.category, lang)}</Badge>}
        <Badge tone="neutral">{difficultyLabel(guide.difficulty, lang)}</Badge>
        {guide.isDemo && <Badge tone="mustard">{t(lang, "guides.demoBadge")}</Badge>}
      </div>
      <h3 className="font-serif text-lg leading-snug text-ink">{localizedTitle(guide, lang)}</h3>
      <p className="line-clamp-2 text-sm text-ink-soft">{localizedGuideIntro(guide, lang)}</p>
      {(guide.estimatedTimeMinutes != null || guide.estimatedTimeMinutesMax != null) && (
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-ink-faint">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{formatMinutesRange(guide.estimatedTimeMinutes, guide.estimatedTimeMinutesMax, lang)}</span>
        </div>
      )}
    </Link>
  );
}
