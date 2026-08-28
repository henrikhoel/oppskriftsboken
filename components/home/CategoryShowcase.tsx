"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { ChevronRightIcon, ChevronDownIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";
import { localizedCategoryName } from "@/lib/utils/format";

/**
 * "Bla etter kategori" – en editorial INDEKS, ikke et dashboard-aktig
 * kort-grid (se git-historikk for den forrige varianten med store brune
 * gradientkort/bilde-fliser, bevisst fjernet 24.08.2026 etter tilbake-
 * melding om at den føltes for "SaaS", ikke i tråd med resten av CONVITEs
 * rolige, redaksjonelle uttrykk). Ingen bilder, ikoner, kort eller
 * fargeflater her – kun typografi, luft og tynne linjer, ment å kjennes ut
 * som innholdsfortegnelsen i et eksklusivt mat-/livsstilsmagasin. Seksjonen
 * kommer rett etter en tung, fotografisk seksjon (AtmosphereSection), og er
 * bevisst en rolig typografisk pause – IKKE fyll den med flere elementer.
 *
 * Hele raden er selve lenken (ikke bare navnet), for et stort, lett
 * klikk-/trykkmål – helt vanlig <Link>, samme /kategori/[slug]-ruting som
 * før.
 *
 * Se alle/se færre (lagt til 26.08.2026, justert samme dag etter
 * tilbakemelding fra Henrik): kun de første CATEGORIES_VISIBLE_COUNT vises
 * til vanlig. Resten ligger i en lav "kikkhull"-boks som viser en liten
 * flik av neste kategori, mørknet av en nedtoning mot siste-bakgrunnen
 * (samme prinsipp som skyggen bak "bla nedover"-pilen i heroen øverst på
 * siden – nettopp for at det skal kjennes igjen som samme grep) – det er
 * det som antyder at det er mer å se uten å måtte forklare det i tekst.
 * Under kikkhullet: en liten sprettende pil (visuelt gjenbruk av heroens
 * "bla nedover"-pil) med en tynn, liten billedtekst under. Trykk på pilen
 * folder resten ut med en jevn max-height-glidning; pilen snur og teksten
 * bytter til "Se færre" for å lukke igjen.
 */
const CATEGORIES_VISIBLE_COUNT = 4;

function CategoryRow({
  category,
  count,
  index,
  lang,
  showBottomBorder,
}: {
  category: Category;
  count: number;
  index: number;
  lang: Lang;
  /** Kun den faktisk siste synlige raden (uansett fold-tilstand) skal ha
   * bunnlinje – styres eksplisitt her fremfor via CSS last:-selektoren,
   * siden de skjulte radene ligger i en egen wrapper-div og dermed ikke er
   * reelle DOM-søsken av de synlige radene. */
  showBottomBorder: boolean;
}) {
  const number = String(index + 1).padStart(2, "0");
  const countLabel = `${count} ${
    lang === "en" ? (count === 1 ? "recipe" : "recipes") : count === 1 ? "oppskrift" : "oppskrifter"
  }`;

  return (
    <Link
      href={`/kategori/${category.slug}`}
      className={`group -mx-2 flex items-center gap-3 border-t border-line px-2 py-3.5 transition-colors duration-300 hover:border-clay/40 hover:bg-ink/[0.03] sm:gap-6 sm:py-5 ${
        showBottomBorder ? "border-b" : ""
      }`}
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
  const [expanded, setExpanded] = useState(false);
  const withRecipes = categories.filter((c) => (counts[c.slug] ?? 0) > 0);
  if (withRecipes.length === 0) return null;

  const primary = withRecipes.slice(0, CATEGORIES_VISIBLE_COUNT);
  const rest = withRecipes.slice(CATEGORIES_VISIBLE_COUNT);
  const hasMore = rest.length > 0;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-clay">
        {t(lang, "home.categories.eyebrow")}
      </p>
      <h2 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{t(lang, "home.browseByCategory")}</h2>

      <div className="mt-8 sm:mt-10">
        {primary.map((category, i) => (
          <CategoryRow
            key={category.id}
            category={category}
            count={counts[category.slug] ?? 0}
            index={i}
            lang={lang}
            showBottomBorder={!hasMore && i === primary.length - 1}
          />
        ))}

        {hasMore && (
          <>
            {/* "Kikkhullet": en lav boks som til vanlig kun viser en flik av
                den første skjulte kategorien, nedtonet mot siste-bakgrunnen
                nederst. transition-[max-height] glir jevnt mellom denne lave
                høyden og en romslig, praktisk talt "uendelig" høyde når
                expanded=true – enklere og like jevnt som grid-fr-trikset,
                siden begge endepunktene her er kjente, faste verdier. */}
            <div
              className={`relative overflow-hidden transition-[max-height] duration-500 ease-out ${
                expanded ? "max-h-[2000px]" : "max-h-11 sm:max-h-14"
              }`}
            >
              {rest.map((category, i) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  count={counts[category.slug] ?? 0}
                  index={CATEGORIES_VISIBLE_COUNT + i}
                  lang={lang}
                  showBottomBorder={expanded && i === rest.length - 1}
                />
              ))}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-cream to-transparent transition-opacity duration-300 ${
                  expanded ? "opacity-0" : "opacity-100"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="group mx-auto mt-3 flex w-fit flex-col items-center gap-1 py-2 sm:mt-4"
            >
              <span
                className={`flex items-center justify-center rounded-full p-1.5 text-ink/60 transition-colors group-hover:text-ink ${
                  expanded ? "" : "animate-bounce motion-reduce:animate-none"
                }`}
              >
                <ChevronDownIcon
                  className={`h-5 w-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                />
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-faint transition-colors group-hover:text-clay-dark">
                {expanded ? t(lang, "home.categories.showLess") : t(lang, "home.categories.showAll")}
              </span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
