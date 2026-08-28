"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchGuidesAction } from "@/lib/actions/guide-search";
import type { GuideSearchResult } from "@/lib/types";
import { GuideSearchResults } from "@/components/guide/GuideSearchResults";
import { SearchIcon } from "@/components/ui/icons";
import { t, type Lang } from "@/lib/i18n";

/**
 * Live, debounced søk i "Hvordan gjør jeg det?"-biblioteket – kaller
 * searchGuidesAction (lib/actions/guide-search.ts) som igjen kaller den
 * database-rangerte search_knowledge_guides-RPC-en (migrasjon 0013).
 * Bevisst INGEN "hent alle guider og filtrer i nettleseren"-tilnærming
 * (samme mønster resten av oppskriftssøket faktisk bruker i dag, se
 * lib/utils/search.ts) – spesifikasjonen krever eksplisitt at dette skal
 * skalere uansett bibliotekstørrelse, så hvert tastetrykk går til
 * databasen, debounced for å ikke spamme et RPC-kall per bokstav.
 *
 * Resultatene vises RETT UNDER søkefeltet i normal sideflyt – ingen
 * dropdown-overlay eller stor modal (mobil-kritisk UX, spesifikasjonens
 * eksplisitte "ingen store modaler"-krav).
 */
export function GuideSearchBar({ lang = "no" }: { lang?: Lang }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuideSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        const found = await searchGuidesAction(trimmed, lang);
        // Ignorer svar fra et eldre, forbigått kall (kan komme tilbake i
        // feil rekkefølge dersom brukeren skriver fort) – kun det NYESTE
        // kallets resultater skal noensinne vises.
        if (requestId === requestIdRef.current) {
          setResults(found);
          setHasSearched(true);
        }
      });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lang]);

  return (
    <div className="w-full">
      <label htmlFor="guide-search" className="sr-only">
        {t(lang, "guides.searchLabel")}
      </label>
      <div className="flex items-center gap-3 rounded-full border border-clay/20 bg-ink px-5 py-4 text-cream shadow-card transition-shadow focus-within:border-clay/50 focus-within:shadow-card-hover">
        <SearchIcon className="h-5 w-5 shrink-0 text-cream/45" />
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, "guides.searchPlaceholder")}
          // text-base (16px) på mobil – unngår at iOS Safari zoomer inn
          // hele siden ved fokus, samme fiks som resten av appens
          // søke-/tekstfelt (se SearchBar.tsx/RecipeQuestionSection.tsx).
          className="min-w-0 flex-1 bg-transparent text-base text-cream placeholder:text-cream/45 focus:outline-none"
        />
      </div>

      {hasSearched && !isPending && (
        <div className="mt-6">
          <GuideSearchResults results={results} query={query.trim()} lang={lang} />
        </div>
      )}
    </div>
  );
}
