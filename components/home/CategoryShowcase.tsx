import Link from "next/link";
import type { Category } from "@/lib/types";
import { ChevronRightIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";
import { localizedCategoryName } from "@/lib/utils/format";

/**
 * "Bla etter kategori" – en editorial INDEKS, ikke et dashboard-aktig
 * kort-grid (se git-historikk for den forrige varianten med store brune
 * gradientkort/bilde-fliser, bevisst fjernet 24.08.2026 etter tilbake-
 * melding om at den føltes for "SaaS", ikke i tråd med resten av À TABLEs
 * rolige, redaksjonelle uttrykk). Ingen bilder, ikoner, kort eller
 * fargeflater her – kun typografi, luft og tynne linjer, ment å kjennes ut
 * som innholdsfortegnelsen i et eksklusivt mat-/livsstilsmagasin. Seksjonen
 * kommer rett etter en tung, fotografisk seksjon (AtmosphereSection), og er
 * bevisst en rolig typografisk pause – IKKE fyll den med flere elementer.
 *
 * Hele raden er selve lenken (ikke bare navnet), for et stort, lett
 * klikk-/trykkmål – helt vanlig <Link>, samme /kategori/[slug]-ruting som
 * før.
 */
function CategoryRow({
  category,
  count,
  index,
  lang,
}: {
  category: Category;
  count: number;
  index: number;
  lang: Lang;
}) {
  const number = String(index + 1).padStart(2, "0");
  const countLabel = `${count} ${
    lang === "en" ? (count === 1 ? "recipe" : "recipes") : count === 1 ? "oppskrift" : "oppskrifter"
  }`;

  return (
    <Link
      href={`/kategori/${category.slug}`}
      className="group -mx-2 flex items-center gap-3 border-t border-line px-2 py-3.5 transition-colors duration-300 last:border-b hover:border-clay/40 hover:bg-ink/[0.03] sm:gap-6 sm:py-5"
    >
      <span className="w-5 shrink-0 font-serif text-[11px] tabular-nums tracking-[0.15em] text-clay-dark sm:w-7 sm:text-xs">
        {number}
      </span>
      <span className="min-w-0 flex-1 truncate font-serif text-base uppercase tracking-wide text-ink transition-transform duration-300 ease-out group-hover:translate-x-1 sm:text-2xl lg:text-3xl">
        {localizedCategoryName(category, lang)}
      </span>
      <span className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wide text-ink-faint sm:text-xs">
        {countLabel}
      </span>
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-clay-dark sm:h-4 sm:w-4" />
    </Link>
  );
}

export function CategoryShowcase({
  categories,
  counts,
  lang,
}: {
  categories: Category[];
  counts: Record<string, number>;
  lang: Lang;
}) {
  const withRecipes = categories.filter((c) => (counts[c.slug] ?? 0) > 0);
  if (withRecipes.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
        {t(lang, "home.categories.eyebrow")}
      </p>
      <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{t(lang, "home.browseByCategory")}</h2>

      <div className="mt-8 sm:mt-10">
        {withRecipes.map((category, i) => (
          <CategoryRow
            key={category.id}
            category={category}
            count={counts[category.slug] ?? 0}
            index={i}
            lang={lang}
          />
        ))}
      </div>
    </section>
  );
}
