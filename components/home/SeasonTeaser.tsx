import Link from "next/link";
import { getAllSeasonsWithIngredients } from "@/lib/data/seasons";
import { resolveCurrentSeason, resolveInSeasonIngredients } from "@/lib/kitchen-intelligence/seasonal";
import { localizedIngredientName, localizedSeasonName } from "@/lib/utils/season-format";
import { ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Liten forsideteaser for "I sesong" (spesifikasjon punkt 6) – henter sin
 * egen, minimale data (gjeldende sesong + et par råvarenavn) direkte her
 * fremfor å laste app/page.tsx sin allerede store data-hentende
 * server-komponent ytterligere ned; samme "async server-komponent lenger
 * ned i treet henter sitt eget"-mønster Next.js App Router bygger på.
 * Returnerer null (viser ingenting) i det usannsynlige tilfellet at ingen
 * publisert sesong dekker inneværende måned – robusthet fremfor en tom/
 * ødelagt seksjon, se filheaderen til resolveCurrentSeason.
 */
export async function SeasonTeaser({ lang }: { lang: Lang }) {
  const seasons = await getAllSeasonsWithIngredients();
  const now = new Date();
  const currentSeason = resolveCurrentSeason(seasons, now);
  if (!currentSeason) return null;

  const inSeason = resolveInSeasonIngredients(seasons, now).slice(0, 4);

  return (
    <Link
      href="/sesong"
      className="group flex flex-col items-start gap-4 rounded-card border border-line bg-paper p-6 transition-colors hover:bg-cream-dark/40 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-clay-dark">
          {t(lang, "home.seasonTeaser.eyebrow")}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">{localizedSeasonName(currentSeason, lang)}</h2>
        {inSeason.length > 0 && (
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            {inSeason.map((entry) => localizedIngredientName(entry.ingredient, lang)).join(", ")}
          </p>
        )}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-clay transition-colors group-hover:text-clay-dark">
        {t(lang, "home.seasonTeaser.cta")}
        <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
