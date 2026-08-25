"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { clsx } from "clsx";
import { t, type Lang } from "@/lib/i18n";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/oppskrifter${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor="recipe-search" className="sr-only">
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
          id="recipe-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? t(lang, "search.placeholder")}
          autoFocus={autoFocus}
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
    </form>
  );
}
