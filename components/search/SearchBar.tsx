"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { clsx } from "clsx";
import { t, type Lang } from "@/lib/i18n";
import { normalize } from "@/lib/utils/search";
import { getRecipeSearchSuggestions, type RecipeSearchSuggestion } from "@/lib/actions/search-suggestions";

// "vi må legge til sånn at alternativer kommer opp når jeg skriver noe
// her" (08.10.2026) – hele oppskrift-tittel-listen hentes KUN ved første
// fokus i en hvilken som helst SearchBar-instans (ikke på hvert tastetrykk,
// og ikke ved hver sideinnlasting – headerens SearchBar står på nesten
// hver eneste side). Modul-nivå cache (ikke useState) slik at et bytte
// mellom f.eks. forsidens og headerens søkefelt (begge samme komponent,
// ulike instanser) ikke trigger et nytt kall – én nedlasting pr. faktisk
// besøk er nok.
let suggestionsPromise: Promise<RecipeSearchSuggestion[]> | null = null;
function loadSuggestions(): Promise<RecipeSearchSuggestion[]> {
  if (!suggestionsPromise) {
    suggestionsPromise = getRecipeSearchSuggestions().catch((err) => {
      // La neste fokus prøve på nytt i stedet for å la en forbigående
      // feil (f.eks. midlertidig nettverksfeil) blokkere forslag resten
      // av besøket.
      suggestionsPromise = null;
      throw err;
    });
  }
  return suggestionsPromise;
}

const MAX_SUGGESTIONS = 8;

export function SearchBar({
  size = "md",
  placeholder,
  autoFocus = false,
  lang = "no",
}: {
  size?: "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  lang?: Lang;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [allSuggestions, setAllSuggestions] = useState<RecipeSearchSuggestion[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // useId() (08.10.2026, fiks av hydrerings-feil) – IKKE Math.random(), som
  // regnes ut helt uavhengig på server og klient og dermed ga to ulike
  // id-er ved første render ("A tree hydrated but some attributes of the
  // server rendered HTML didn't match the client properties"). useId() er
  // laget nettopp for å være stabil/lik mellom server- og klient-rendering.
  const inputId = `recipe-search-${useId()}`;

  // Ordet(ene) man har skrevet må ALLE finnes i tittelen (aksent-/
  // case-ufølsomt, samme normalize() som /oppskrifter sitt eget søk
  // bruker) – "svenske kjøtt" skal fortsatt matche "Svenske kjøttboller".
  // Titler der den fulle, sammenhengende søketeksten står HELT FØRST
  // ("svensk" -> "Svenske …") prioriteres øverst, resten beholder sin
  // opprinnelige (nyeste/utvalgt) rekkefølge som sekundær sortering.
  const matches = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed || !allSuggestions || allSuggestions.length === 0) return [];
    const words = normalize(trimmed).split(/\s+/).filter(Boolean);
    const fullQuery = normalize(trimmed);

    const found = allSuggestions.filter((s) => {
      const title = normalize(s.title);
      return words.every((w) => title.includes(w));
    });
    found.sort((a, b) => {
      const aStarts = normalize(a.title).startsWith(fullQuery) ? 0 : 1;
      const bStarts = normalize(b.title).startsWith(fullQuery) ? 0 : 1;
      return aStarts - bStarts;
    });
    return found.slice(0, MAX_SUGGESTIONS);
  }, [value, allSuggestions]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/oppskrifter${params.toString() ? `?${params.toString()}` : ""}`);
    setIsOpen(false);
  }

  function selectSuggestion(suggestion: RecipeSearchSuggestion) {
    setIsOpen(false);
    setHighlightedIndex(-1);
    router.push(`/oppskrifter/${suggestion.slug}`);
  }

  function handleFocus() {
    if (!allSuggestions) {
      loadSuggestions()
        .then(setAllSuggestions)
        .catch(() => {
          // Stille feil – forslagslisten er et tillegg, ikke en
          // forutsetning for at selve søkefeltet/Enter-søket skal virke.
        });
    }
    if (value.trim()) setIsOpen(true);
  }

  function handleChange(nextValue: string) {
    setValue(nextValue);
    setHighlightedIndex(-1);
    setIsOpen(Boolean(nextValue.trim()));
  }

  // Lukker ved vanlig fokus-tap (klikk utenfor, Tab videre) – IKKE ved
  // klikk/trykk på selve forslaget, se onMouseDown={preventDefault} på
  // <button>-ene under, som hindrer feltet i å miste fokus i det hele
  // tatt når man velger et forslag (samme hendelsesrekkefølge gjelder
  // touch – mobilnettlesere sender samme museevent-rekkefølge for enkle
  // trykk), så denne rekker aldri å kjøre for et faktisk valg.
  function handleBlur() {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(matches[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }

  const showDropdown = isOpen && matches.length > 0;

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        {t(lang, "search.srLabel")}
      </label>
      <div
        className={clsx(
          "flex items-center gap-3 rounded-full border border-clay/20 bg-ink text-cream shadow-card transition-shadow focus-within:border-clay/50 focus-within:shadow-card-hover",
          size === "lg" ? "px-5 py-4" : "px-4 py-2.5",
        )}
      >
        <SearchIcon className={clsx("shrink-0 text-cream/45", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t(lang, "search.placeholder")}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={`${inputId}-listbox`}
          aria-activedescendant={highlightedIndex >= 0 ? `${inputId}-option-${highlightedIndex}` : undefined}
          className={clsx(
            // text-base (16px) på mobil er nødvendig for å unngå at iOS
            // Safari zoomer inn hele siden ved fokus (samme feil som var i
            // Mat & vin-seksjonen, se WinePairing.tsx) – fra sm og opp kan
            // "md"-varianten gå tilbake til den litt mindre text-sm.
            "min-w-0 flex-1 bg-transparent text-cream placeholder:text-cream/45 focus:outline-none",
            size === "lg" ? "text-base" : "text-base sm:text-sm",
          )}
        />
        <button
          type="submit"
          className={clsx(
            "shrink-0 rounded-full bg-clay font-medium text-cream transition-colors hover:bg-clay-dark",
            size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-1.5 text-xs",
          )}
        >
          {t(lang, "search.button")}
        </button>
      </div>

      {/* Type-ahead-forslag (08.10.2026) – lys kortstil fremfor søkefeltets
          egen mørke bunn, siden feltet kan stå oppå hva som helst (mørkt
          hero-bilde på forsiden, lys bakgrunn i header på andre sider).
          z-30 + absolute: søkefeltets foreldre-containere har ingen
          overflow-hidden å klippes av (sjekket i app/page.tsx og
          Header.tsx), men høy z-index uansett for å ligge over alt annet
          innhold under. */}
      {showDropdown && (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-paper py-1.5 text-left shadow-card-hover"
        >
          {matches.map((suggestion, index) => (
            <li key={suggestion.slug} role="option" id={`${inputId}-option-${index}`} aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={clsx(
                  "block w-full truncate px-4 py-2 text-left text-sm text-ink",
                  index === highlightedIndex ? "bg-cream-dark" : "hover:bg-cream-dark",
                )}
              >
                {suggestion.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
