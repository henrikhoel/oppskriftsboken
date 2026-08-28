import type { GuideSearchResult } from "@/lib/types";
import { GuideCard } from "@/components/guide/GuideCard";
import { t, type Lang } from "@/lib/i18n";

/**
 * Rent presentasjonslag for søketreff – ingen egen datahenting (se
 * GuideSearchBar.tsx, som eier selve søket/debounce-logikken og gir denne
 * komponenten resultatene som prop). Egen fil fra GuideSearchBar av samme
 * grunn som GuideStepsList/GuideContent er splittet fra hverandre: rendring
 * og datahenting/tilstand holdes fra hverandre slik at visningen alene kan
 * gjenbrukes andre steder senere (f.eks. en forhåndsutfylt
 * "?q="-server-rendret treffliste).
 */
export function GuideSearchResults({
  results,
  query,
  lang = "no",
}: {
  results: GuideSearchResult[];
  query: string;
  lang?: Lang;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-paper/60 px-5 py-8 text-center">
        <p className="text-sm text-ink-soft">{t(lang, "guides.noResults", { query })}</p>
        <p className="mt-1 text-xs text-ink-faint">{t(lang, "guides.searchHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {results.map((guide) => (
        <GuideCard key={guide.id} guide={guide} lang={lang} />
      ))}
    </div>
  );
}
