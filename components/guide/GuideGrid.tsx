import Link from "next/link";
import type { GuideSummary } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { HelpCircleIcon, ChevronRightIcon, ClockIcon } from "@/components/ui/icons";
import { localizedTitle, difficultyLabel, formatMinutesRange } from "@/lib/utils/format";
import { localizedGuideIntro } from "@/lib/utils/guide-format";
import { t, type Lang } from "@/lib/i18n";

/**
 * Redaksjonell indeksliste over guider – brukt av kategorisiden. Bevisst IKKE
 * et kortrutenett (se GuideCard.tsx, som fortsatt brukes i søketreff der
 * kort på tvers av ulike kategorier trenger et kategori-merke for kontekst):
 * på en kategoriside forteller sideoverskriften allerede hvilken kategori vi
 * er i, og med opptil 30+ guider i én kategori (f.eks. "Redde maten") blir et
 * gjentatt kategori-merke på hvert kort bare visuell støy. Denne listen er
 * derfor en enkel, tett linjeliste i bok-registerstil – tynne skillelinjer,
 * ingen kortrammer, vanskelighetsgrad vist som diskret tekst i stedet for et
 * fargede merke som uansett nesten alltid ville sagt "Enkel".
 */
export function GuideGrid({
  guides,
  emptyTitle,
  emptyDescription,
  lang = "no",
}: {
  guides: GuideSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  lang?: Lang;
}) {
  if (guides.length === 0) {
    return (
      <EmptyState
        icon={<HelpCircleIcon className="h-10 w-10" />}
        title={emptyTitle ?? t(lang, "guides.emptyLibrary")}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="lg:columns-2 lg:gap-x-12">
      {guides.map((guide) => (
        <Link
          key={guide.id}
          href={`/hvordan-gjor-jeg-det/${guide.slug}`}
          className="group -mx-3 flex items-start gap-4 break-inside-avoid border-b border-line/70 px-3 py-5 transition-colors duration-150 first:pt-0 hover:bg-cream-dark/40 lg:mb-0"
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg leading-snug text-ink transition-colors group-hover:text-clay">
              {localizedTitle(guide, lang)}
            </h3>
            <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{localizedGuideIntro(guide, lang)}</p>
            <div className="mt-2 flex items-center gap-2.5 text-xs text-ink-faint">
              <span>{difficultyLabel(guide.difficulty, lang)}</span>
              {(guide.estimatedTimeMinutes != null || guide.estimatedTimeMinutesMax != null) && (
                <span className="flex items-center gap-1">
                  <span className="text-line-strong">·</span>
                  <ClockIcon className="h-3 w-3" />
                  {formatMinutesRange(guide.estimatedTimeMinutes, guide.estimatedTimeMinutesMax, lang)}
                </span>
              )}
            </div>
          </div>
          <ChevronRightIcon className="mt-1.5 h-4 w-4 shrink-0 text-ink-faint transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-clay" />
        </Link>
      ))}
    </div>
  );
}
