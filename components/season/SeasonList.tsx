import Link from "next/link";
import type { Season } from "@/lib/types";
import { localizedSeasonName, seasonMonthRangeLabel } from "@/lib/utils/season-format";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { Lang } from "@/lib/i18n";

/**
 * Redaksjonell indeksliste over sesonger – samme "tett linjeliste i
 * bok-registerstil"-mønster som GuideGrid.tsx sin redesignede
 * kategoriliste (ønsket av Henrik 27.08.2026: "vi må ha en penere mer
 * elegant måte å vise listen på"), gjenbrukt her fordi den samme
 * begrunnelsen gjelder: en enkel liste av sesonger trenger ikke
 * bilde-kort, kun tittel + en kort tidsangivelse.
 */
export function SeasonList({ seasons, lang }: { seasons: Season[]; lang: Lang }) {
  if (seasons.length === 0) return null;

  return (
    <ul className="divide-y divide-line/70">
      {seasons.map((season) => (
        <li key={season.id}>
          <Link
            href={`/sesong/${season.slug}`}
            className="group -mx-3 flex items-center gap-4 px-3 py-4 transition-colors duration-150 hover:bg-cream-dark/40"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-lg leading-snug text-ink transition-colors group-hover:text-clay">
                {localizedSeasonName(season, lang)}
              </h3>
              <p className="mt-0.5 text-xs text-ink-faint">{seasonMonthRangeLabel(season.months, lang)}</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-clay" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
